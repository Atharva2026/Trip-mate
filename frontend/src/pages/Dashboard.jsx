import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Plane, 
  Hotel, 
  Calendar, 
  Compass, 
  Download, 
  Copy, 
  PlusCircle, 
  History, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  Bookmark,
  Map,
  CloudSun,
  Layers,
  Info,
  X,
  Lock
} from 'lucide-react';
import { marked } from 'marked';
import confetti from 'canvas-confetti';

// Import custom production components
import SafeImage from '../components/SafeImage';
import FreshnessBadge from '../components/FreshnessBadge';
import MapView from '../components/MapView';
import BookingLinks from '../components/BookingLinks';
import ImageGallery from '../components/ImageGallery';
import ValidationReport from '../components/ValidationReport';
import WeatherCard from '../components/WeatherCard';
import CostBreakdown from '../components/CostBreakdown';
import AgentStepper from '../components/AgentStepper';

// Configure marked
marked.setOptions({ gfm: true, breaks: true });

const PRESETS = [
  {
    title: "Japan Explorer",
    prompt: "Plan a complete 7 days Japan trip from Dhaka including flights, hotels and sightseeing under 2 lakhs.",
    icon: "🌸",
    tag: "Cultural"
  },
  {
    title: "Dubai Highlights",
    prompt: "Plan a 5 days Dubai trip from Delhi with flights, hotels and sightseeing.",
    icon: "✨",
    tag: "Luxury"
  },
  {
    title: "Thailand Getaway",
    prompt: "Plan a 7 days Thailand trip from Bangkok with budget hotels and sightseeing.",
    icon: "🏖️",
    tag: "Budget"
  },
  {
    title: "Global Flights",
    prompt: "Give me all country flight info.",
    icon: "✈️",
    tag: "Search"
  }
];

export default function Dashboard() {
  const locationState = useLocation().state;
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [token, setToken] = useState(localStorage.getItem("tripmate_token"));

  // Keep token in sync reactively
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("tripmate_token"));
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleStorageChange);
    };
  }, []);

  const [travelContext, setTravelContext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentAgentStep, setCurrentAgentStep] = useState(0); 
  const [activeTab, setActiveTab] = useState("overview"); // overview, flights, hotels, itinerary, map
  const [error, setError] = useState(null);
  
  // Progress logging
  const [progressEvents, setProgressEvents] = useState([]);
  
  // Results
  const [result, setResult] = useState(null);
  
  // History
  const [history, setHistory] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("unsaved"); // unsaved, saving, saved, error
  const [saveMessage, setSaveMessage] = useState(null);
  
  // Quota pop-in modal state
  const [showQuotaModal, setShowQuotaModal] = useState(
    localStorage.getItem("tripmate_seen_quota_popup") === null
  );

  const handleCloseQuotaModal = () => {
    localStorage.setItem("tripmate_seen_quota_popup", "true");
    setShowQuotaModal(false);
  };

  const pdfRef = useRef(null);
  const isStreamFinished = useRef(false);

  // Prefill state from questionnaire wizard if available
  useEffect(() => {
    const promptText = locationState?.prefilledPrompt || locationState?.prefill;
    if (promptText) {
      setQuery(promptText);
      if (locationState.travelContext) {
        setTravelContext(locationState.travelContext);
      }
    }
  }, [locationState]);

  // Load history from DB (if authenticated) or local guest storage
  useEffect(() => {
    if (token) {
      const fetchHistoryFromDB = async () => {
        try {
          const res = await fetch("/api/trips", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            const dbHistory = (data.trips || []).map(t => ({
              thread_id: t.id,
              query: t.query,
              timestamp: new Date(t.created_at).toLocaleDateString(),
              result: null,
              travelContext: { destination: t.destination }
            }));
            setHistory(dbHistory);
          }
        } catch (err) {
          console.error("Failed to load history from DB", err);
        }
      };
      fetchHistoryFromDB();
    } else {
      const saved = localStorage.getItem("tripmate_history_guest");
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      } else {
        setHistory([]);
      }
    }
  }, [token]);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    if (!token) {
      localStorage.setItem("tripmate_history_guest", JSON.stringify(newHistory));
    }
  };

  const handleSubmit = async (textToSend) => {
    const messageText = (textToSend || query).trim();
    if (!messageText) return;

    isStreamFinished.current = false;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressEvents([]);
    setCurrentAgentStep(0);
    setSaveStatus("unsaved");
    setSaveMessage(null);

    const threadIdToSend = selectedThreadId || `user_${Math.random().toString(36).substring(2, 15)}`;
    setSelectedThreadId(threadIdToSend);

    try {
      const headers = { "Content-Type": "application/json" };
      const localToken = localStorage.getItem("tripmate_token");
      if (localToken) {
        headers["Authorization"] = `Bearer ${localToken}`;
      }

      // POST with stream=true to start background orchestration
      const response = await fetch("/api/travel", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: messageText,
          thread_id: threadIdToSend,
          stream: true,
          travel_context: travelContext
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to trigger orchestration.");
      }

      // Connect to the event stream
      const eventSource = new EventSource(`/api/travel/stream/${threadIdToSend}`);

      eventSource.onmessage = (event) => {
        const evData = JSON.parse(event.data);
        setProgressEvents(prev => [...prev, evData]);

        const stepMapping = {
          'supervisor': 0,
          'flight_agent': 1,
          'hotel_agent': 2,
          'itinerary_agent': 3,
          'validator': 4,
          'final_agent': 5
        };

        if (stepMapping[evData.node] !== undefined) {
          setCurrentAgentStep(stepMapping[evData.node]);
        }

        if (evData.done) {
          if (evData.node === 'final_agent' && evData.payload) {
            isStreamFinished.current = true;
            setResult(evData.payload);
            setLoading(false);
            eventSource.close();

            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.8 }
            });

            // Save to local history
            const existingIdx = history.findIndex(h => h.thread_id === threadIdToSend);
            let updatedHistory = [...history];

            const historyItem = {
              thread_id: threadIdToSend,
              query: messageText,
              timestamp: new Date().toLocaleDateString(),
              result: evData.payload,
              travelContext
            };

            if (existingIdx >= 0) {
              updatedHistory[existingIdx] = historyItem;
            } else {
              updatedHistory.unshift(historyItem);
            }
            saveHistory(updatedHistory);

          } else if (evData.node === 'error') {
            isStreamFinished.current = true;
            setError(evData.message || "An error occurred in the multi-agent graph.");
            setLoading(false);
            eventSource.close();
          }
        }
      };

      let sseErrorCount = 0;
      eventSource.onerror = (err) => {
        if (isStreamFinished.current) return;
        console.warn("SSE stream connection issue, retrying...", err);
        sseErrorCount++;
        if (sseErrorCount > 5) {
          setError("Streaming pipeline disconnected. Please try again.");
          setLoading(false);
          eventSource.close();
        }
      };

    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleSelectHistory = async (item) => {
    setSelectedThreadId(item.thread_id);
    setQuery(item.query);
    setTravelContext(item.travelContext || null);
    setError(null);
    setActiveTab("overview");
    setSaveStatus("unsaved");
    setSaveMessage(null);

    if (item.result) {
      setResult(item.result);
    } else {
      setLoading(true);
      try {
        const token = localStorage.getItem("tripmate_token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/trips/${item.thread_id}`, { headers });
        const data = await res.json();
        if (res.ok && data.success) {
          setResult(data.trip.result_json);
          setHistory(prev => prev.map(h => 
            h.thread_id === item.thread_id ? { ...h, result: data.trip.result_json } : h
          ));
        } else {
          throw new Error(data.detail || "Failed to load plan details.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNewPlan = () => {
    setSelectedThreadId(null);
    setResult(null);
    setQuery("");
    setTravelContext(null);
    setError(null);
    setSaveStatus("unsaved");
    setSaveMessage(null);
    window.history.replaceState({}, document.title);
  };

  const handleDeleteHistory = async (e, threadId) => {
    e.stopPropagation();
    
    const updated = history.filter(h => h.thread_id !== threadId);
    saveHistory(updated);
    if (selectedThreadId === threadId) {
      handleNewPlan();
    }

    // Delete from backend DB if active user session is present
    const token = localStorage.getItem("tripmate_token");
    if (token) {
      try {
        await fetch(`/api/trips/${threadId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to delete trip from DB", err);
      }
    }
  };

  const handleSaveToAccount = async () => {
    const token = localStorage.getItem("tripmate_token");
    if (!token) {
      setSaveStatus("error");
      setSaveMessage("Please log in / sign up via 'My Saved Trips' first to save trips permanently to your account.");
      return;
    }

    setSaveStatus("saving");
    setSaveMessage(null);
    try {
      const response = await fetch(`/api/trips/${selectedThreadId}/save`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.error || "Failed to save trip.");
      }
      setSaveStatus("saved");
      setSaveMessage("Trip saved to your account successfully!");
    } catch (err) {
      setSaveStatus("error");
      setSaveMessage(err.message || "Failed to save trip to account.");
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.answer || "").then(() => {
      alert("Successfully copied travel plan to clipboard!");
    });
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    const element = pdfRef.current;
    if (!element) return;

    // Clone element to prevent onscreen styling changes
    const clonedElement = element.cloneNode(true);

    // Strip out complex canvas/interactive widgets (Leaflet maps, booking links, buttons)
    const interactiveElements = clonedElement.querySelectorAll('.leaflet-container, iframe, canvas, button');
    interactiveElements.forEach(el => el.remove());

    // Wrap inside a print-friendly container with dark text and white background
    const container = document.createElement('div');
    container.style.color = '#1A202C';
    container.style.backgroundColor = '#FFFFFF';
    container.style.padding = '30px';
    container.style.borderRadius = '0px';
    container.appendChild(clonedElement);

    // Force standard black text color on all children to avoid styling wash-out
    const children = container.querySelectorAll('*');
    children.forEach(child => {
      child.style.color = '#1A202C';
      child.style.backgroundColor = 'transparent';
      child.style.borderColor = '#E2E8F0';
    });

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `TripMate-Plan-${selectedThreadId?.slice(0, 8) || 'Export'}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 1.5, 
        useCORS: false, // Turn off CORS to prevent stalling on cross-origin map resources
        logging: false 
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    if (window.html2pdf) {
      window.html2pdf().from(container).set(opt).save();
    } else {
      setError("PDF library loading. Please try again in a few seconds.");
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return { __html: "" };
    return { __html: marked.parse(text) };
  };

  const destinationName = travelContext?.destination || result?.travel_context?.destination || "";

  return (
    <div className="relative min-h-screen dashboard-grid font-sans antialiased text-gray-200">
      
      {/* Background glow effects */}
      <div className="background-glows">
        <div className="glow-1"></div>
        <div className="glow-2"></div>
        <div className="glow-3"></div>
      </div>

      {/* Sidebar Panel */}
      <aside className="flex flex-col border-r border-slate-800 bg-[#0D1B2A]">
        
        {/* Brand */}
        <div 
          onClick={() => navigate('/')} 
          className="p-6 border-b border-slate-800 flex items-center gap-3 cursor-pointer hover:opacity-90"
        >
          <Compass className="w-8 h-8 text-[#E8650A] animate-spin-slow" />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ fontFamily: "'Playfair Display', serif", color: '#fff' }}>
              Globe Express
            </h1>
            <p className="text-[9px] text-[#F5A623] font-bold uppercase tracking-widest font-mono">Travel Engine</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 space-y-2">
          <button 
            onClick={handleNewPlan}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-[#E8650A]/10 hover:bg-[#E8650A]/20 border border-[#E8650A]/30 text-[#E8650A] transition-all duration-200 text-xs shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 text-[#E8650A]" />
            New Travel Plan
          </button>
          
          <button 
            onClick={() => navigate('/my-trips')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-slate-900/40 hover:bg-slate-900 border border-slate-800 text-slate-300 transition-all duration-200 text-xs shadow-sm cursor-pointer"
          >
            <Bookmark className="w-4 h-4 text-[#F5A623]" />
            My Saved Trips
          </button>
        </div>

        {/* History Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 tracking-wider uppercase font-mono">
            <History className="w-3.5 h-3.5" />
            <span>Recent Plans</span>
          </div>

          {history.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 italic font-mono">
              No recent plans generated
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => {
                const isActive = item.thread_id === selectedThreadId;
                return (
                  <div
                    key={item.thread_id}
                    onClick={() => handleSelectHistory(item)}
                    className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all duration-200 ${
                      isActive 
                        ? 'bg-[#F5A623]/10 border-[#F5A623]/40 text-[#F5A623] font-bold shadow-sm' 
                        : 'bg-slate-900/10 hover:bg-slate-900/50 border-transparent hover:border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-semibold truncate text-slate-200">
                        {item.query}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">
                        {item.timestamp}
                      </p>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteHistory(e, item.thread_id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all duration-200"
                    >
                      <PlusCircle className="w-3.5 h-3.5 rotate-45 text-red-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className="status-indicator">
            <span className="status-dot-pulse"></span>
            <span>Checkpointer Active</span>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex flex-col h-screen overflow-y-auto bg-[#0D1B2A]/90">
        
        {/* Workspace */}
        <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 text-[#E8650A] text-xs font-bold uppercase tracking-wider font-mono">
                <Sparkles className="w-4 h-4 text-[#F5A623]" />
                <span>Modern Travel Agent Planner</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Orchestrate Your Journey
              </h2>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/20 flex items-start gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs font-mono">Pipeline Notification</h4>
                <p className="text-xs mt-1 opacity-90">{error}</p>
              </div>
            </div>
          )}

          {/* Configuration Form Card */}
          {!loading && !result && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Visual Accent Card with Passport Image */}
                <div className="lg:col-span-5 relative rounded-2xl overflow-hidden min-h-[220px] lg:min-h-full border border-[#F5A623]/25 shadow-lg bg-slate-900 p-6 flex flex-col justify-end">
                  <img src="/flatlay-passport.jpg" alt="Passport flatlay" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/40 to-transparent" />
                  <div className="relative z-10 space-y-1">
                    <span className="text-[9px] font-bold text-[#F5A623] uppercase tracking-widest font-mono block">Pack your bags</span>
                    <h4 className="text-base font-bold text-white uppercase leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Wanderlust Checklist
                    </h4>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Enter travel coordinates, companions and details to build visa-aware plans.
                    </p>
                  </div>
                </div>

                {/* Form Card */}
                <div className="lg:col-span-7 p-6 md:p-8 glass-panel relative overflow-hidden bg-slate-900/60 border border-[#F5A623]/20 shadow-xl flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8650A]/5 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <h3 className="text-lg font-bold mb-1.5 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Where would you like to go?</h3>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    Provide travel duration, destination, budget, or companion details. Our routing intelligence classfies intent and coordinates only required agents.
                  </p>

                  <div className="flex flex-col gap-3">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Plan a complete 7 days Japan trip including flights, hotels and sightseeing under 2 lakhs..."
                      className="w-full custom-textarea min-h-[100px] focus:border-[#F5A623]"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[9px] text-[#F5A623] font-mono flex items-center gap-1 select-none">
                        <span>ℹ️ Limit: {localStorage.getItem("tripmate_token") ? "2 plans daily" : "1 free plan total"}</span>
                      </span>
                      <button
                        onClick={() => handleSubmit()}
                        disabled={!query.trim()}
                        className="custom-btn text-white text-xs py-2.5"
                      >
                        <span>Generate Plan</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Presets */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 tracking-wider uppercase font-mono">
                  Quick Planning Presets
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PRESETS.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setQuery(preset.prompt);
                        handleSubmit(preset.prompt);
                      }}
                      className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-[#F5A623]/50 hover:shadow-md cursor-pointer transition-all duration-300 flex items-start gap-4 group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#E8650A]/10 text-[#E8650A] flex items-center justify-center text-2xl group-hover:scale-105 transition-transform duration-200">
                        {preset.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{preset.title}</h5>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{preset.tag}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                          {preset.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stepper Active View */}
          {loading && (
            <AgentStepper 
              progressEvents={progressEvents} 
              activeStep={currentAgentStep} 
              status="running" 
            />
          )}

          {/* Final Results Dashboard */}
          {!loading && result && (
            <div className="space-y-6">
              
              {/* Parallax Hero Image Banner */}
              <div className="relative rounded-2xl overflow-hidden h-48 md:h-64 border border-slate-800 bg-slate-900 flex items-end">
                {destinationName ? (
                  <SafeImage
                    src={result.images?.[0]?.url}
                    alt={destinationName}
                    destinationName={destinationName}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src="/cabin-lake.jpg"
                    alt="Scenic Travel Background"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 filter brightness-90"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent"></div>
                
                <div className="relative p-6 w-full flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl md:text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {destinationName || "Custom Itinerary"}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1.5 leading-normal max-w-md font-mono">
                      AI customized travel plan. Inspected by quality audit validators.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveToAccount}
                      disabled={saveStatus === "saving" || saveStatus === "saved"}
                      className={`custom-btn px-3 py-1.5 text-xs font-bold cursor-pointer transition-all duration-200 ${
                        saveStatus === "saved" 
                          ? "bg-emerald-600 hover:bg-emerald-600 border-emerald-500 text-white" 
                          : "custom-btn-secondary"
                      }`}
                    >
                      {saveStatus === "saving" ? (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/50 border-t-transparent animate-spin" />
                      ) : saveStatus === "saved" ? (
                        <Bookmark className="w-3.5 h-3.5 fill-current text-white" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save Trip"}
                      </span>
                    </button>
                    
                    <button 
                      onClick={handleCopy}
                      className="custom-btn custom-btn-secondary px-3 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy text
                    </button>
                    
                    <button 
                      onClick={handleDownloadPDF}
                      className="custom-btn px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>

              {saveMessage && (
                <div className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                  saveStatus === "saved"
                    ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-450"
                    : "bg-[#E8650A]/10 border-[#F5A623]/20 text-[#F5A623]"
                }`}>
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-current" />
                  <p className="leading-relaxed pr-2">{saveMessage}</p>
                </div>
              )}

              {/* Side-by-side Widget Panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Main Content Area */}
                <div className="md:col-span-2 space-y-6">
                  
                  <div className="glass-panel overflow-hidden bg-slate-900/60 border border-slate-800 shadow-md">
                    {/* Tabs Selection */}
                    <div className="flex flex-wrap border-b border-slate-800 bg-slate-950/20 px-4 pt-2 gap-1">
                      <button
                        onClick={() => setActiveTab("overview")}
                        className={`tab-btn flex items-center gap-1.5 ${activeTab === 'overview' ? 'active' : ''}`}
                      >
                        <Bookmark className="w-4 h-4" />
                        📋 Overview
                      </button>
                      <button
                        onClick={() => setActiveTab("flights")}
                        className={`tab-btn flex items-center gap-1.5 ${activeTab === 'flights' ? 'active' : ''}`}
                      >
                        <Plane className="w-4 h-4" />
                        ✈️ Flights
                      </button>
                      <button
                        onClick={() => setActiveTab("hotels")}
                        className={`tab-btn flex items-center gap-1.5 ${activeTab === 'hotels' ? 'active' : ''}`}
                      >
                        <Hotel className="w-4 h-4" />
                        🏨 Hotels
                      </button>
                      <button
                        onClick={() => setActiveTab("itinerary")}
                        className={`tab-btn flex items-center gap-1.5 ${activeTab === 'itinerary' ? 'active' : ''}`}
                      >
                        <Calendar className="w-4 h-4" />
                        📅 Itinerary
                      </button>
                      <button
                        onClick={() => setActiveTab("map")}
                        className={`tab-btn flex items-center gap-1.5 ${activeTab === 'map' ? 'active' : ''}`}
                      >
                        <Map className="w-4 h-4" />
                        🗺️ Map
                      </button>
                    </div>

                    {/* Tab Panels */}
                    <div ref={pdfRef} className="p-6 itinerary-markdown text-slate-200 max-w-none">
                      
                      {activeTab === "overview" && (
                        <div className="space-y-4">
                          <div dangerouslySetInnerHTML={renderMarkdown(result.answer)} />
                        </div>
                      )}

                      {activeTab === "flights" && (
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-4">
                            <h3 className="text-lg font-bold text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                              <Plane className="w-5 h-5 text-[#F5A623]" />
                              Flight Status Options
                            </h3>
                            <FreshnessBadge freshness={result.data_freshness?.flights} />
                          </div>
                          {result.flight_results ? (
                            <div dangerouslySetInnerHTML={renderMarkdown(result.flight_results)} />
                          ) : (
                            <p className="text-xs italic text-slate-500">No flight result data retrieved for this session.</p>
                          )}
                        </div>
                      )}

                      {activeTab === "hotels" && (
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-4">
                            <h3 className="text-lg font-bold text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                              <Hotel className="w-5 h-5 text-[#F5A623]" />
                              Hotel Recommendations
                            </h3>
                            <FreshnessBadge freshness={result.data_freshness?.hotels} />
                          </div>
                          {result.hotel_results ? (
                            <div dangerouslySetInnerHTML={renderMarkdown(result.hotel_results)} />
                          ) : (
                            <p className="text-xs italic text-slate-500">No hotel information retrieved for this session.</p>
                          )}
                        </div>
                      )}

                      {activeTab === "itinerary" && (
                        <div>
                          <h3 className="text-lg font-bold border-b border-slate-800 pb-2.5 mb-4 text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                            <Calendar className="w-5 h-5 text-[#F5A623]" />
                            Day-by-Day Schedule
                          </h3>
                          {result.itinerary ? (
                            <div dangerouslySetInnerHTML={renderMarkdown(result.itinerary)} />
                          ) : (
                            <p className="text-xs italic text-slate-500">No raw itinerary plan compiled for this session.</p>
                          )}
                        </div>
                      )}

                      {activeTab === "map" && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold border-b border-slate-800 pb-2.5 mb-4 text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                            <Map className="w-5 h-5 text-[#F5A623]" />
                            Itinerary Route Map
                          </h3>
                          <MapView 
                            locations={result.map_locations} 
                            destination={destinationName} 
                          />
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Unsplash gallery carousel */}
                  <ImageGallery 
                    images={result.images} 
                    destination={destinationName} 
                  />

                </div>

                {/* Widgets Area */}
                <div className="space-y-6">
                  
                  {/* Validation feedback card */}
                  <ValidationReport report={result.validation_report} />

                  {/* Weather forecast widget */}
                  <WeatherCard 
                    weather={result.weather} 
                    destination={destinationName} 
                  />

                  {/* Cost breakdown stacked progress bar */}
                  <CostBreakdown itineraryText={result.itinerary || result.answer} />

                  {/* Flight/Hotel booking links */}
                  <BookingLinks links={result.booking_links} />

                </div>

              </div>

            </div>
          )}

        </div>

        {/* Global Footer */}
        <footer className="py-6 text-center text-[10px] text-gray-600 border-t border-gray-900 bg-black/10">
          Built with FastAPI, LangGraph Orchestrator, Groq LLM, PostgreSQL Persisted Checkpointer, wttr.in & Nominatim
        </footer>
      </main>

      {/* Quota benefits popup modal (shown first time) */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop blur overlay */}
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]" 
            onClick={handleCloseQuotaModal}
          />
          
          {/* Pop-in Modal Card */}
          <div className="relative w-full max-w-2xl bg-[#0D1B2A] border border-slate-800 shadow-2xl rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch z-10 animate-fade-in-up">
            
            {/* Left Column: Cover Image */}
            <div className="md:col-span-5 relative min-h-[160px] md:min-h-full flex flex-col justify-end p-6">
              <img 
                src="/auth-bg-2.jpg" 
                alt="Scenic rainy flowers" 
                className="absolute inset-0 w-full h-full object-cover animate-slow-zoom-pan" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/40 to-transparent" />
              <div className="absolute inset-0 bg-[#E8650A]/10 mix-blend-color" />
              
              <div className="relative z-10 space-y-1">
                <span className="text-[8px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono block">TripMate Quotas</span>
                <h4 className="text-sm font-bold text-white uppercase font-sans" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Your Travel Dashboard
                </h4>
              </div>
            </div>

            {/* Right Column: Quota Details */}
            <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between space-y-6">
              {/* Close Cross Button */}
              <button 
                onClick={handleCloseQuotaModal}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none outline-none"
              >
                <X size={18} />
              </button>

              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold tracking-widest text-[#F5A623] uppercase font-mono block">Plan Limit Policy</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight uppercase animate-pulse" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Upgrade Your Limit
                  </h3>
                </div>

                <div className="space-y-3 font-mono text-[11px] text-slate-300 leading-relaxed">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-900">
                    <span className="text-red-400 text-sm mt-0.5">🔒</span>
                    <div>
                      <p className="font-bold text-slate-200 uppercase tracking-wider">Guest Account</p>
                      <p className="mt-0.5 text-slate-400">Limited to <span className="text-red-400 font-bold">1 free travel plan</span> total.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F5A623]/5 border border-[#F5A623]/20">
                    <span className="text-emerald-400 text-sm mt-0.5">🚀</span>
                    <div>
                      <p className="font-bold text-slate-200 uppercase tracking-wider">Free Registered Account</p>
                      <p className="mt-0.5 text-slate-400">Unlock <span className="text-[#F5A623] font-bold">2 plans daily</span> completely free, with full syncing & sharing features.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => {
                    handleCloseQuotaModal();
                    navigate('/my-trips');
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#E8650A] hover:bg-[#E8650A]/90 hover:shadow-[0_0_15px_rgba(232,101,10,0.3)] text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer text-center"
                >
                  Create Account
                </button>
                <button
                  onClick={handleCloseQuotaModal}
                  className="flex-1 py-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer text-center"
                >
                  Continue as Guest
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
