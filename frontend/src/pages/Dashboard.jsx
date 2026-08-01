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
  Lock,
  DollarSign,
  Activity,
  ShieldAlert,
  Camera,
  Terminal
} from 'lucide-react';
import { marked } from 'marked';
import confetti from 'canvas-confetti';

import SafeImage from '../components/SafeImage';
import FreshnessBadge from '../components/FreshnessBadge';
import MapView from '../components/MapView';
import BookingLinks from '../components/BookingLinks';
import ImageGallery from '../components/ImageGallery';
import ValidationReport from '../components/ValidationReport';
import WeatherCard from '../components/WeatherCard';
import CostBreakdown from '../components/CostBreakdown';
import AgentStepper from '../components/AgentStepper';

marked.setOptions({ gfm: true, breaks: true });

const PRESETS = [
  {
    title: "Japan Explorer",
    prompt: "Plan a complete 7 days Japan trip from Mumbai including flights, hotels and sightseeing under 2 lakhs.",
    icon: "🌸",
    tag: "Cultural"
  },
  {
    title: "Dubai Highlights",
    prompt: "Plan a 7 days Dubai trip from Mumbai with flights, hotels and sightseeing.",
    icon: "✨",
    tag: "Luxury"
  },
  {
    title: "Thailand Getaway",
    prompt: "Plan a 7 days Thailand trip from Mumbai with budget hotels and sightseeing.",
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
  const [activeTab, setActiveTab] = useState("overview"); 
  const [error, setError] = useState(null);
  const [progressEvents, setProgressEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("unsaved"); 
  const [saveMessage, setSaveMessage] = useState(null);
  const [showQuotaModal, setShowQuotaModal] = useState(
    localStorage.getItem("tripmate_seen_quota_popup") === null
  );

  // Premium interactive states
  const [targetBudget, setTargetBudget] = useState(100000); 
  const [diningTier, setDiningTier] = useState("mid_range"); 
  const [lodgingTier, setLodgingTier] = useState("mid_range");
  const [transitMode, setTransitMode] = useState("public"); 
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [customPlaces, setCustomPlaces] = useState([]);
  const [customName, setCustomName] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(83.5); // Defaults USD-INR
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [homeCurrencySymbol, setHomeCurrencySymbol] = useState("₹");
  const [homeCurrencyCode, setHomeCurrencyCode] = useState("INR");
  const [homeExchangeRate, setHomeExchangeRate] = useState(83.5);
  const [expandedDays, setExpandedDays] = useState({ 0: true });

  const handleCloseQuotaModal = () => {
    localStorage.setItem("tripmate_seen_quota_popup", "true");
    setShowQuotaModal(false);
  };

  const pdfRef = useRef(null);
  const isStreamFinished = useRef(false);

  useEffect(() => {
    const promptText = locationState?.prefilledPrompt || locationState?.prefill;
    if (promptText) {
      setQuery(promptText);
      if (locationState.travelContext) {
        setTravelContext(locationState.travelContext);
      }
    }
  }, [locationState]);

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

  // Load conversions from result
  useEffect(() => {
    if (result && result.currency_data) {
      const rates = result.currency_data.rates || {"USD": 1.0, "INR": 83.5, "BDT": 117.0, "EUR": 0.92, "JPY": 160.0, "AED": 3.67};
      
      let home = "INR";
      const qLower = (result?.query || "").toLowerCase();
      if (qLower.includes("dhaka") || qLower.includes("bangladesh") || qLower.includes("bdt")) {
        home = "BDT";
      }
      
      setHomeCurrencyCode(home);
      setHomeCurrencySymbol(home === "INR" ? "₹" : "৳");
      setHomeExchangeRate(rates[home] || 83.5);

      const rate = result.currency_data.rate || 1.0;
      setExchangeRate(rate);
      const code = result.currency_data.to || "INR";
      setCurrencyCode(code);
      
      let sym = "$";
      if (code === "INR") sym = "₹";
      else if (code === "EUR") sym = "€";
      else if (code === "JPY") sym = "¥";
      else if (code === "GBP") sym = "£";
      else if (code === "AED") sym = "DH";
      else sym = code + " ";
      setCurrencySymbol(sym);

      // Pre-set target budget to a sensible converted tier
      setTargetBudget(Math.round(2000 * rate));
      
      // Reset collapsed state for new plans
      setExpandedDays({ 0: true });
    }
  }, [result]);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    if (!token) {
      localStorage.setItem("tripmate_history_guest", JSON.stringify(newHistory));
    }
  };

  const handleStreamEvents = (threadIdToSend, messageText, initialContext) => {
    const eventSource = new EventSource(`/api/travel/stream/${threadIdToSend}`);
    
    eventSource.onmessage = (event) => {
      const evData = JSON.parse(event.data);
      setProgressEvents(prev => [...prev, evData]);

      const stepMapping = {
        'supervisor': 0,
        'flight_agent': 1,
        'hotel_agent': 2,
        'itinerary_agent': 3,
        'knowledge_retriever': 4,
        'route_optimizer': 4,
        'final_validator': 4,
        'travel_insights_agent': 5,
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

          const existingIdx = history.findIndex(h => h.thread_id === threadIdToSend);
          let updatedHistory = [...history];

          const historyItem = {
            thread_id: threadIdToSend,
            query: messageText,
            timestamp: new Date().toLocaleDateString(),
            result: evData.payload,
            travelContext: initialContext
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
      console.warn("SSE stream issue, retrying...", err);
      sseErrorCount++;
      if (sseErrorCount > 5) {
        setError("Streaming pipeline disconnected. Please try again.");
        setLoading(false);
        eventSource.close();
      }
    };
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
    setCustomPlaces([]);

    const threadIdToSend = selectedThreadId || `user_${Math.random().toString(36).substring(2, 15)}`;
    setSelectedThreadId(threadIdToSend);

    try {
      const headers = { "Content-Type": "application/json" };
      const localToken = localStorage.getItem("tripmate_token");
      if (localToken) {
        headers["Authorization"] = `Bearer ${localToken}`;
      }

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

      handleStreamEvents(threadIdToSend, messageText, travelContext);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleWhatIfSimulation = async (whatIfPrompt) => {
    if (!selectedThreadId) return;
    
    isStreamFinished.current = false;
    setLoading(true);
    setError(null);
    setProgressEvents([]);
    setCurrentAgentStep(4); // Validator/Re-plan phase

    try {
      const headers = { "Content-Type": "application/json" };
      const localToken = localStorage.getItem("tripmate_token");
      if (localToken) {
        headers["Authorization"] = `Bearer ${localToken}`;
      }

      const response = await fetch("/api/travel/whatif", {
        method: "POST",
        headers,
        body: JSON.stringify({
          thread_id: selectedThreadId,
          message: whatIfPrompt,
          travel_context: {
            ...result?.travel_context,
            max_budget: targetBudget / exchangeRate // send limit back
          }
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "What-if simulation failed.");
      }

      handleStreamEvents(selectedThreadId, whatIfPrompt, result?.travel_context);
    } catch (err) {
      setError(err.message || "An error occurred during re-planning.");
      setLoading(false);
    }
  };

  const handleAddCustomPlace = async (e) => {
    e.preventDefault();
    if (!customName || !customAddress) return;
    
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(customAddress)}`);
      const data = await res.json();
      
      if (res.ok && data.success) {
        const newPlace = {
          name: customName,
          lat: data.lat,
          lng: data.lng,
          type: "hidden_gem"
        };
        setCustomPlaces(prev => [...prev, newPlace]);
        setShowCustomModal(false);
        setCustomName("");
        setCustomAddress("");
      } else {
        alert(data.error || "Could not find coordinates for this address.");
      }
    } catch (err) {
      alert("Error geocoding custom address.");
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
    setCustomPlaces([]);

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
    setCustomPlaces([]);
    window.history.replaceState({}, document.title);
  };

  const handleDeleteHistory = async (e, threadId) => {
    e.stopPropagation();
    const updated = history.filter(h => h.thread_id !== threadId);
    saveHistory(updated);
    if (selectedThreadId === threadId) {
      handleNewPlan();
    }

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
      setSaveMessage("Please log in / sign up via 'My Saved Trips' first to save trips permanently.");
      return;
    }

    setSaveStatus("saving");
    setSaveMessage(null);
    try {
      const response = await fetch(`/api/trips/${selectedThreadId}/save`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
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
      alert("Successfully copied plan text!");
    });
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    const element = pdfRef.current;
    if (!element) return;

    const clonedElement = element.cloneNode(true);
    const interactiveElements = clonedElement.querySelectorAll('.leaflet-container, iframe, canvas, button');
    interactiveElements.forEach(el => el.remove());

    const container = document.createElement('div');
    container.style.color = '#1A202C';
    container.style.backgroundColor = '#FFFFFF';
    container.style.padding = '30px';
    container.appendChild(clonedElement);

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
      html2canvas: { scale: 1.5, useCORS: false, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    if (window.html2pdf) {
      window.html2pdf().from(container).set(opt).save();
    } else {
      setError("PDF library loading. Please try again.");
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return { __html: "" };
    return { __html: marked.parse(text) };
  };

  const destinationName = travelContext?.destination || result?.travel_context?.destination || "";

  // Dynamic cost estimates (Budget Guardian calculations)
  const numDays = result?.travel_context?.num_days || 5;
  const baseFlightUSD = 450;
  const lodgingRates = { budget: 50, mid_range: 150, luxury: 750 };
  const diningRates = { budget: 20, mid_range: 55, luxury: 180 };
  const transitRates = { public: 10, rideshare: 35, rental: 85 };

  const spentFlights = baseFlightUSD * exchangeRate;
  const spentLodging = (lodgingRates[lodgingTier] * numDays) * exchangeRate;
  const spentDining = (diningRates[diningTier] * numDays) * exchangeRate;
  const spentTransit = (transitRates[transitMode] * numDays) * exchangeRate;
  const totalSpentCalculated = spentFlights + spentLodging + spentDining + spentTransit;
  
  const budgetRatio = (totalSpentCalculated / targetBudget) * 100;
  const budgetGuardianWarning = totalSpentCalculated > targetBudget;

  // Compile combined map locations (incorporating user custom additions)
  const combinedMapLocations = [
    ...(result?.map_locations || []),
    ...customPlaces
  ];

  const toggleDay = (idx) => {
    setExpandedDays(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getHomeConversion = (valDest) => {
    if (!result || !result.currency_data) return "";
    const rates = result.currency_data.rates || {"USD": 1.0, "INR": 83.5, "BDT": 117.0, "EUR": 0.92, "JPY": 160.0, "AED": 3.67};
    let home = "INR";
    const qLower = (result?.query || "").toLowerCase();
    if (qLower.includes("dhaka") || qLower.includes("bangladesh") || qLower.includes("bdt")) {
      home = "BDT";
    }
    if (currencyCode === home) return "";
    
    const homeRate = rates[home] || 83.5;
    const destRate = exchangeRate || 1.0;
    const valHome = (valDest / destRate) * homeRate;
    const homeSym = home === "INR" ? "₹" : "৳";
    return ` (~${homeSym}${Math.round(valHome).toLocaleString()})`;
  };

  const parseFlightResults = (text) => {
    if (!text) return null;
    
    if (text.includes("Connecting Flight Options Found") || text.includes("Connecting Flight")) {
      const lines = text.split("\n");
      const routeLine = lines.find(l => l.includes("Route:"));
      const route = routeLine ? routeLine.replace("Route:", "").trim() : "";
      
      const legs = [];
      let currentLeg = null;
      let priceRange = "";
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("Leg ") || trimmed.startsWith("Leg1") || trimmed.startsWith("Leg2")) {
          if (currentLeg) legs.push(currentLeg);
          currentLeg = { title: trimmed, details: [] };
        } else if (trimmed.startsWith("- Airline:") && currentLeg) {
          currentLeg.airline = trimmed.replace("- Airline:", "").trim();
        } else if (trimmed.startsWith("- Duration:") && currentLeg) {
          currentLeg.duration = trimmed.replace("- Duration:", "").trim();
        } else if (trimmed.startsWith("- Departure Airport:") && currentLeg) {
          currentLeg.depAirport = trimmed.replace("- Departure Airport:", "").trim();
        } else if (trimmed.startsWith("- Arrival Airport:") && currentLeg) {
          currentLeg.arrAirport = trimmed.replace("- Arrival Airport:", "").trim();
        } else if (trimmed.startsWith("- Transit Airport:") && currentLeg) {
          currentLeg.transitAirport = trimmed.replace("- Transit Airport:", "").trim();
        } else if (trimmed.includes("Estimated Price")) {
          priceRange = trimmed.substring(trimmed.indexOf(":") + 1).trim();
        }
      });
      if (currentLeg) legs.push(currentLeg);
      
      return {
        type: "connecting",
        route,
        legs,
        priceRange
      };
    } else if (text.includes("Airline:") || text.includes("Flight:")) {
      const blocks = text.split("---");
      const flights = [];
      
      blocks.forEach(block => {
        const lines = block.split("\n");
        const flight = {};
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith("Airline:")) flight.airline = trimmed.replace("Airline:", "").trim();
          else if (trimmed.startsWith("Flight:")) flight.number = trimmed.replace("Flight:", "").trim();
          else if (trimmed.startsWith("Status:")) flight.status = trimmed.replace("Status:", "").trim();
          else if (trimmed.startsWith("- Airport:") && !flight.depAirport) flight.depAirport = trimmed.replace("- Airport:", "").trim();
          else if (trimmed.startsWith("- Airport:")) flight.arrAirport = trimmed.replace("- Airport:", "").trim();
          else if (trimmed.startsWith("- IATA:") && !flight.depIata) flight.depIata = trimmed.replace("- IATA:", "").trim();
          else if (trimmed.startsWith("- IATA:")) flight.arrIata = trimmed.replace("- IATA:", "").trim();
          else if (trimmed.startsWith("- Scheduled:") && !flight.depTime) flight.depTime = trimmed.replace("- Scheduled:", "").trim();
          else if (trimmed.startsWith("- Scheduled:")) flight.arrTime = trimmed.replace("- Scheduled:", "").trim();
        });
        if (flight.airline) flights.push(flight);
      });
      
      return {
        type: "live",
        flights
      };
    }
    
    return { type: "raw", text };
  };

  const renderBudgetBreakdownBar = () => {
    const flightPct = (spentFlights / totalSpentCalculated) * 100;
    const lodgingPct = (spentLodging / totalSpentCalculated) * 100;
    const diningPct = (spentDining / totalSpentCalculated) * 100;
    const transitPct = (spentTransit / totalSpentCalculated) * 100;
    
    return (
      <div className="space-y-4">
        <div className="w-full h-4 rounded-full overflow-hidden flex border border-slate-800 bg-slate-950/80">
          <div className="bg-sky-500 h-full transition-all duration-300" style={{ width: `${flightPct}%` }} title={`Flights: ${currencySymbol}${Math.round(spentFlights).toLocaleString()}`} />
          <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${lodgingPct}%` }} title={`Lodging: ${currencySymbol}${Math.round(spentLodging).toLocaleString()}`} />
          <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${diningPct}%` }} title={`Dining: ${currencySymbol}${Math.round(spentDining).toLocaleString()}`} />
          <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${transitPct}%` }} title={`Transit: ${currencySymbol}${Math.round(spentTransit).toLocaleString()}`} />
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "✈️ Flights", amount: spentFlights, pct: flightPct, color: "bg-sky-500 text-sky-400" },
            { label: "🏢 Lodging", amount: spentLodging, pct: lodgingPct, color: "bg-amber-500 text-amber-400" },
            { label: "🍴 Meals", amount: spentDining, pct: diningPct, color: "bg-orange-500 text-orange-400" },
            { label: "🚗 Transit", amount: spentTransit, pct: transitPct, color: "bg-emerald-500 text-emerald-400" }
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-white/[0.01] border border-gray-800/40 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${item.color.split(" ")[0]}`} />
                <span className="text-[10px] text-slate-500 font-semibold">{item.label}</span>
              </div>
              <p className="text-xs font-extrabold text-slate-200 font-mono">
                {currencySymbol}{Math.round(item.amount).toLocaleString()}
                <span className="text-[9px] text-slate-500 font-normal"> ({Math.round(item.pct)}%)</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOverviewTab = () => {
    const dest = result?.travel_context?.destination || result?.destination || "Japan";
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-4 bg-slate-900/30 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[9px] uppercase tracking-wider text-[#F5A623] block font-bold font-mono">Destination</span>
            <h4 className="font-extrabold text-sm text-slate-200 tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
              {dest.toUpperCase()}
            </h4>
            <span className="text-[9px] text-slate-500 font-mono">Plan Duration: {numDays} Days</span>
          </div>
          
          <div className="glass-panel p-4 bg-slate-900/30 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[9px] uppercase tracking-wider text-[#F5A623] block font-bold font-mono">Budget Snapshot</span>
            <h4 className="font-extrabold text-sm text-slate-200 tracking-wide font-mono">
              {currencySymbol}{Math.round(totalSpentCalculated).toLocaleString()}{getHomeConversion(totalSpentCalculated)}
            </h4>
            <span className="text-[9px] text-slate-500 font-mono">Target budget limit: {currencySymbol}{targetBudget.toLocaleString()}</span>
          </div>

          <div className="glass-panel p-4 bg-slate-900/30 border border-slate-800 rounded-xl space-y-1 flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-wider text-[#F5A623] block font-bold font-mono mb-1">Quick Navigation</span>
            <div className="flex gap-2 text-[9px] font-bold font-mono uppercase">
              <button onClick={() => setActiveTab("flights")} className="px-2 py-1 rounded bg-[#E8650A]/10 text-[#E8650A] border border-[#E8650A]/20 hover:bg-[#E8650A]/20 transition-all">Flights →</button>
              <button onClick={() => setActiveTab("hotels")} className="px-2 py-1 rounded bg-[#E8650A]/10 text-[#E8650A] border border-[#E8650A]/20 hover:bg-[#E8650A]/20 transition-all">Hotels →</button>
              <button onClick={() => setActiveTab("itinerary")} className="px-2 py-1 rounded bg-[#E8650A]/10 text-[#E8650A] border border-[#E8650A]/20 hover:bg-[#E8650A]/20 transition-all">Itinerary →</button>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 bg-slate-900/20 border border-slate-800 rounded-2xl space-y-3">
          <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">
            📊 Projected Cost Breakdown
          </h4>
          {renderBudgetBreakdownBar()}
        </div>

        <div className="glass-panel p-6 bg-slate-900/10 border border-slate-800 rounded-2xl">
          <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono border-b border-slate-850 pb-2 mb-4">
            📝 Curated Trip Summary
          </h4>
          <div dangerouslySetInnerHTML={renderMarkdown(result.answer)} />
        </div>
      </div>
    );
  };

  const renderStructuredFlights = () => {
    if (!result.flight_results) return <p className="text-xs italic text-slate-500 font-mono">No flight result data retrieved.</p>;
    const flightObj = parseFlightResults(result.flight_results);
    if (!flightObj) {
      return <div dangerouslySetInnerHTML={renderMarkdown(result.flight_results)} />;
    }
    
    if (flightObj.type === "connecting") {
      return (
        <div className="glass-panel p-5 bg-slate-900/30 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-mono">Route</span>
              <h4 className="font-extrabold text-sm text-slate-200 tracking-wide">{flightObj.route}</h4>
            </div>
            {flightObj.priceRange && (
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-mono">Est. Price</span>
                <span className="font-bold text-xs text-amber-400 font-mono">{flightObj.priceRange}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            {flightObj.legs.map((leg, idx) => (
              <div key={idx} className="relative pl-6 border-l-2 border-slate-800 space-y-2">
                <div className="absolute -left-[6px] top-1 w-2.5 h-2.5 rounded-full border border-sky-400 bg-slate-950" />
                
                <h5 className="font-bold text-xs text-[#F5A623]">{leg.title}</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] text-slate-400 font-mono">
                  {leg.airline && (
                    <div>
                      <span className="text-[8px] text-slate-550 block uppercase">Airline</span>
                      <span className="text-slate-300 font-semibold">{leg.airline}</span>
                    </div>
                  )}
                  {leg.duration && (
                    <div>
                      <span className="text-[8px] text-slate-550 block uppercase">Duration</span>
                      <span className="text-slate-300 font-semibold">{leg.duration}</span>
                    </div>
                  )}
                  {leg.depAirport && (
                    <div className="col-span-2">
                      <span className="text-[8px] text-slate-550 block uppercase">Departure</span>
                      <span className="text-slate-355 truncate block text-slate-300">{leg.depAirport}</span>
                    </div>
                  )}
                  {leg.arrAirport && (
                    <div className="col-span-2">
                      <span className="text-[8px] text-slate-550 block uppercase">Arrival</span>
                      <span className="text-slate-355 truncate block text-slate-300">{leg.arrAirport}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    if (flightObj.type === "live") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flightObj.flights.map((flight, idx) => (
            <div key={idx} className="glass-panel p-5 bg-slate-900/30 border border-slate-800 rounded-xl space-y-3 flex flex-col justify-between hover:border-slate-700/60 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                  <div>
                    <h4 className="font-bold text-slate-200 text-xs">{flight.airline}</h4>
                    <span className="text-[9px] text-slate-500 font-mono uppercase">{flight.number}</span>
                  </div>
                  <span className="text-[8px] font-bold font-mono px-2 py-0.5 rounded bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/20 uppercase">
                    {flight.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-[10px] font-mono leading-relaxed text-slate-350">
                  <div>
                    <span className="text-[8px] text-slate-650 block uppercase">Depart ({flight.depIata})</span>
                    <p className="font-semibold text-slate-300 truncate">{flight.depAirport}</p>
                    <p className="text-[9px] text-slate-500">{flight.depTime}</p>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-650 block uppercase">Arrive ({flight.arrIata})</span>
                    <p className="font-semibold text-slate-300 truncate">{flight.arrAirport}</p>
                    <p className="text-[9px] text-slate-500">{flight.arrTime}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return <div dangerouslySetInnerHTML={renderMarkdown(result.flight_results)} />;
  };

  const renderStructuredHotels = () => {
    if (result.hotels && result.hotels.length > 0) {
      const dest = result?.travel_context?.destination || result?.destination || "";
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.hotels.map((hotel, idx) => (
            <div key={idx} className="glass-panel p-5 bg-slate-900/30 border border-slate-800 rounded-xl flex flex-col justify-between space-y-4 hover:border-slate-700/60 transition-all">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-slate-200 text-sm leading-snug">{hotel.name}</h4>
                  <span className="shrink-0 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ★ {hotel.rating}
                  </span>
                </div>
                
                <p className="text-[10px] font-bold font-mono text-amber-400 flex items-center gap-1">
                  <span>💰</span> {hotel.price}
                </p>
                
                <p className="text-xs text-slate-400 leading-relaxed">{hotel.description}</p>
              </div>

              <a
                href={hotel.url || `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name + " " + dest)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 text-[10px] font-bold uppercase tracking-wider text-center transition-all cursor-pointer"
              >
                Book or View Details ↗
              </a>
            </div>
          ))}
        </div>
      );
    }
    
    return <div dangerouslySetInnerHTML={renderMarkdown(result.hotel_results)} />;
  };

  const renderItineraryTimeline = () => {
    if (!result || !result.itinerary) return <p className="text-xs italic text-slate-500">No raw itinerary plan compiled.</p>;
    
    const rawDays = result.itinerary.split(/(?=###?\s*Day\s+\d+)/i);
    const parsedDays = rawDays.map(block => {
      const lines = block.trim().split("\n");
      const titleLine = lines[0] || "";
      const contentLines = lines.slice(1);
      
      const title = titleLine.replace(/^###?\s*/, "").replace(/\*\*/g, "").trim();
      const content = contentLines.join("\n").trim();
      
      return { title, content };
    }).filter(d => d.title);
    
    if (parsedDays.length === 0) {
      return <div dangerouslySetInnerHTML={renderMarkdown(result.itinerary)} />;
    }
    
    return (
      <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6 pt-2 pb-6">
        {parsedDays.map((day, idx) => {
          const isOpen = expandedDays[idx] !== false;
          return (
            <div key={idx} className="relative group">
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border border-[#E8650A] bg-slate-950 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-[#E8650A] shadow-[0_0_8px_rgba(232,101,10,0.4)] cursor-pointer" onClick={() => toggleDay(idx)}>
                <span className="text-[7px] text-[#F5A623] group-hover:text-white font-mono font-bold">{idx + 1}</span>
              </div>
              
              <div className="glass-panel overflow-hidden border border-slate-800 bg-slate-900/10 rounded-xl transition-all">
                <button
                  onClick={() => toggleDay(idx)}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors outline-none cursor-pointer"
                >
                  <h4 className="font-extrabold text-xs text-[#F5A623] tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {day.title}
                  </h4>
                  <span className="text-[9px] text-slate-500 font-bold uppercase select-none font-mono">
                    {isOpen ? "Collapse ▲" : "Expand ▼"}
                  </span>
                </button>
                
                {isOpen && (
                  <div className="p-4 pt-0 border-t border-slate-850/40 text-xs leading-relaxed text-slate-350 prose prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={renderMarkdown(day.content)} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const CITY_IMAGES = {
    tokyo: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop",
    japan: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop",
    dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
    uae: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
    thailand: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=1200&auto=format&fit=crop",
    bangkok: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=1200&auto=format&fit=crop",
    paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop",
    france: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop",
    london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop",
    uk: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop",
    bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
    indonesia: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
    delhi: "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=1200&auto=format&fit=crop",
    mumbai: "https://images.unsplash.com/photo-1562158074-d754324f6643?q=80&w=1200&auto=format&fit=crop",
    india: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=1200&auto=format&fit=crop"
  };

  const getBannerImage = () => {
    if (!destinationName) return "/cabin-lake.jpg";
    const destLower = destinationName.toLowerCase().trim();
    for (const [key, url] of Object.entries(CITY_IMAGES)) {
      if (destLower.includes(key)) {
        return url;
      }
    }
    return result?.images?.[0]?.url || "/cabin-lake.jpg";
  };

  return (
    <div className="relative min-h-screen dashboard-grid font-sans antialiased text-gray-200">
      
      <div className="background-glows">
        <div className="glow-1"></div>
        <div className="glow-2"></div>
        <div className="glow-3"></div>
      </div>

      {/* Sidebar Panel */}
      <aside className="flex flex-col border-r border-slate-800 bg-[#0D1B2A]">
        
        <div onClick={() => navigate('/')} className="p-6 border-b border-slate-800 flex items-center gap-3 cursor-pointer hover:opacity-90">
          <Compass className="w-8 h-8 text-[#E8650A]" />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              Globe Express
            </h1>
            <p className="text-[9px] text-[#F5A623] font-bold uppercase tracking-widest font-mono">Travel Engine</p>
          </div>
        </div>

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
          <h5 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-3 font-mono">
            Plan History
          </h5>
          {history.length === 0 ? (
            <p className="text-[11px] text-slate-600 font-mono italic">No recent travel plans.</p>
          ) : (
            <div className="space-y-1.5">
              {history.map((item, i) => {
                const isActive = selectedThreadId === item.thread_id;
                return (
                  <div
                    key={i}
                    onClick={() => handleSelectHistory(item)}
                    className={`group w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all duration-300 ${
                      isActive
                        ? "bg-[#E8650A]/15 border-[#E8650A]/40 text-white"
                        : "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">
                        {item.travelContext?.destination 
                          ? `Trip to ${item.travelContext.destination}` 
                          : item.query.slice(0, 30) + "..."}
                      </p>
                      <p className="text-[9px] font-mono text-slate-500 mt-1">{item.timestamp}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistory(e, item.thread_id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-all cursor-pointer border-none bg-transparent"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-between">
        
        {/* Floating Top Alert Banner */}
        {result?.alerts?.length > 0 && result.alerts[0].type === "warning" && (
          <div className="bg-amber-950/40 border-b border-amber-900/40 px-6 py-3 text-xs text-amber-300 flex items-start gap-2.5 font-mono">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed">{result.alerts[0].message}</p>
          </div>
        )}

        <div className="max-w-6xl mx-auto w-full px-6 md:px-12 py-10 flex-1">
          
          {!result && !loading && (
            <div className="max-w-2xl mx-auto text-center space-y-10 py-16">
              <div className="space-y-4">
                <span className="text-[10px] font-bold tracking-[0.3em] text-[#F5A623] uppercase font-mono block">
                  TripMate Orchestrator
                </span>
                <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight uppercase" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Plan Your Next<br />Adventure
                </h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  Provide your destination, length, and interests, and watch our multi-agent framework orchestrate your plan.
                </p>
              </div>

              {/* Form Input */}
              <div className="glass-panel p-2 flex bg-slate-900/60 border border-slate-800 rounded-2xl max-w-xl mx-auto shadow-md">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Plan a romantic 5 days trip to Paris under $1000..."
                  className="flex-1 px-4 py-3 bg-transparent border-none text-white text-sm outline-none placeholder-slate-600 font-sans"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                />
                <button
                  onClick={() => handleSubmit()}
                  className="px-6 py-3 rounded-xl bg-[#E8650A] hover:bg-[#E8650A]/95 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Plan It
                </button>
              </div>

              {/* Presets */}
              <div className="space-y-4 pt-6">
                <h5 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono">Suggested Queries</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {loading && (
            <AgentStepper 
              progressEvents={progressEvents} 
              activeStep={currentAgentStep} 
              status="running" 
            />
          )}

          {/* Results Block */}
          {!loading && result && (
            <div className="space-y-6">
              
              <div className="relative rounded-2xl overflow-hidden h-48 md:h-64 border border-slate-800 bg-slate-900 flex items-end">
                <img
                  src={getBannerImage()}
                  alt={destinationName || "Scenic Travel"}
                  className="absolute inset-0 w-full h-full object-cover opacity-45 filter brightness-90 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                
                <div className="relative p-6 w-full flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl md:text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {destinationName ? `${destinationName} Itinerary` : "Custom Itinerary"}
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
                    
                    <button onClick={handleCopy} className="custom-btn custom-btn-secondary px-3 py-1.5 text-xs font-bold cursor-pointer">
                      <Copy className="w-3.5 h-3.5" /> Copy text
                    </button>
                    
                    <button onClick={handleDownloadPDF} className="custom-btn px-3 py-1.5 text-xs font-bold text-white cursor-pointer">
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </button>
                  </div>
                </div>
              </div>

              {saveMessage && (
                <div className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                  saveStatus === "saved"
                    ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400"
                    : "bg-[#E8650A]/10 border-[#F5A623]/20 text-[#F5A623]"
                }`}>
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-current" />
                  <p className="leading-relaxed pr-2">{saveMessage}</p>
                </div>
              )}

              {/* Grid content panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Tabs display */}
                <div className="md:col-span-2 space-y-6">
                  
                  <div className="glass-panel overflow-hidden bg-slate-900/60 border border-slate-800 shadow-md">
                    <div className="flex flex-wrap border-b border-slate-800 bg-slate-950/20 px-4 pt-2 gap-1">
                      {[
                        { id: "overview", label: "📋 Overview" },
                        { id: "flights", label: "✈️ Flights" },
                        { id: "hotels", label: "🏨 Hotels" },
                        { id: "itinerary", label: "📅 Itinerary" },
                        { id: "map", label: "🗺️ Route Map" },
                        { id: "hidden_gems", label: "💎 Secrets" },
                        { id: "local_eats", label: "🍴 Local Eats" },
                        { id: "safety", label: "🛡️ Safety" },
                        { id: "photo_planner", label: "📷 Photos" }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`tab-btn flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ${activeTab === tab.id ? 'active' : ''}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div ref={pdfRef} className="p-6 itinerary-markdown text-slate-200 max-w-none">
                      
                      {activeTab === "overview" && renderOverviewTab()}

                      {activeTab === "flights" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2">
                            <h3 className="text-lg font-bold text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                              <Plane className="w-5 h-5 text-[#F5A623]" /> Flight Options
                            </h3>
                          </div>
                          {renderStructuredFlights()}
                        </div>
                      )}

                      {activeTab === "hotels" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2">
                            <h3 className="text-lg font-bold text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                              <Hotel className="w-5 h-5 text-[#F5A623]" /> Recommended Accommodation
                            </h3>
                          </div>
                          {renderStructuredHotels()}
                        </div>
                      )}

                      {activeTab === "itinerary" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2">
                            <h3 className="text-lg font-bold text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                              <Calendar className="w-5 h-5 text-[#F5A623]" /> Day-by-Day Schedule
                            </h3>
                          </div>
                          {renderItineraryTimeline()}
                        </div>
                      )}

                      {activeTab === "map" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2">
                            <h3 className="text-lg font-bold text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                              <Map className="w-5 h-5 text-[#F5A623]" /> Itinerary Route Map
                            </h3>
                            <button
                              onClick={() => setShowCustomModal(true)}
                              className="px-3 py-1.5 rounded-lg bg-[#E8650A]/10 text-[#E8650A] border border-[#E8650A]/20 hover:bg-[#E8650A]/20 text-[10px] font-bold uppercase transition-all"
                            >
                              Add Custom Pin
                            </button>
                          </div>
                          <MapView 
                            locations={combinedMapLocations} 
                            destination={destinationName} 
                          />
                        </div>
                      )}

                      {activeTab === "hidden_gems" && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold border-b border-slate-800 pb-2.5 mb-4 text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                            💎 Grounded Hidden Secrets
                          </h3>
                          {result.hidden_places?.length > 0 ? (
                            result.hidden_places.map((place, idx) => (
                              <div key={idx} className="p-5 rounded-2xl bg-white/[0.02] border border-gray-800/40 space-y-3">
                                <h4 className="font-bold text-slate-200 text-sm">{place.name}</h4>
                                <span className="inline-block text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-[#F5A623]/10 text-[#F5A623] uppercase">
                                  {place.specialty}
                                </span>
                                <p className="text-xs text-slate-400 leading-relaxed">{place.description}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs italic text-slate-500">No secret spots extracted for this destination.</p>
                          )}
                        </div>
                      )}

                      {activeTab === "local_eats" && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold border-b border-slate-800 pb-2.5 mb-4 text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                            🍴 Curated Eating Options
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            {result.food_recommendations?.length > 0 ? (
                              result.food_recommendations.map((rest, idx) => (
                                <div key={idx} className="p-5 rounded-2xl bg-white/[0.02] border border-gray-800/40 flex flex-col md:flex-row md:items-start justify-between gap-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-slate-200 text-sm">{rest.name}</h4>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono uppercase">{rest.cuisine}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-none">Hours: {rest.hours}</p>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {rest.why_recommended?.map((why, i) => (
                                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">✓ {why}</span>
                                      ))}
                                    </div>
                                    {rest.suggested_dishes?.length > 0 && (
                                      <p className="text-xs text-slate-400 font-mono pt-1">
                                        <span className="text-orange-400 font-semibold">Try:</span> {rest.suggested_dishes.join(", ")}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {/* Confidence score indicator */}
                                  <div className="text-right shrink-0">
                                    <div className="inline-block p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-center">
                                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Confidence</p>
                                      <p className="text-xl font-extrabold text-orange-400 leading-tight mt-1">{rest.confidence_score}%</p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs italic text-slate-500">No eateries retrieved from open tags.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === "safety" && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-bold border-b border-slate-800 pb-2.5 text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                            🛡️ Safety & Local Customs
                          </h3>
                          
                          {result.safety_report && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Safety Scores</h4>
                                <div className="space-y-2">
                                  {Object.entries(result.safety_report.ratings || {}).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-1.5">
                                      <span className="capitalize text-slate-400">{key.replace('_', ' ')}</span>
                                      <span className="text-amber-400">{"★".repeat(val)}{"☆".repeat(5-val)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Etiquette & Rules</h4>
                                <div className="space-y-2">
                                  {Object.entries(result.culture_and_language?.etiquette || {}).map(([key, val]) => (
                                    <div key={key} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs">
                                      <p className="capitalize font-bold text-amber-500 tracking-wider mb-1">{key.replace('_', ' ')}</p>
                                      <p className="text-slate-300 leading-relaxed">{val}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === "photo_planner" && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold border-b border-slate-800 pb-2.5 mb-4 text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                            📷 Photographer Astronomy Planner
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            {result.photo_plan?.map((slot, idx) => (
                              <div key={idx} className="p-5 rounded-2xl bg-white/[0.02] border border-gray-800/40 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                <div>
                                  <p className="text-xs font-extrabold text-slate-200 leading-tight">{slot.activity}</p>
                                  <p className="text-[10px] text-amber-400 mt-1 font-mono">{slot.time}</p>
                                </div>
                                <div className="md:col-span-2">
                                  <p className="text-xs text-slate-300">{slot.tip}</p>
                                  <p className="text-[10px] text-slate-500 mt-1 font-mono">Golden Hour: {slot.golden_hour}</p>
                                </div>
                                <div className="text-right">
                                  <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                    Crowd: {slot.expected_crowd}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Dev Observability Panel */}
                  <div className="glass-panel overflow-hidden bg-slate-900/60 border border-slate-800 shadow-md">
                    <button
                      onClick={() => setShowDevPanel(!showDevPanel)}
                      className="w-full flex items-center justify-between p-4 bg-slate-950/20 border-none outline-none text-left cursor-pointer"
                    >
                      <span className="text-xs font-bold font-mono tracking-wider text-slate-300 flex items-center gap-2">
                        <Terminal size={14} className="text-[#F5A623]" />
                        🖥️ Agent Observability Panel
                      </span>
                      <span className="text-xs text-[#F5A623]">{showDevPanel ? "[- Close]" : "[+ Open]"}</span>
                    </button>

                    {showDevPanel && (
                      <div className="p-6 border-t border-slate-800 bg-[#070F18] font-mono text-xs text-slate-400 space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                                <th className="pb-2">Agent Node</th>
                                <th className="pb-2">Latency</th>
                                <th className="pb-2">Cache</th>
                                <th className="pb-2">LLM Tokens</th>
                                <th className="pb-2">API Calls</th>
                                <th className="pb-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.agent_metrics?.map((metric, i) => (
                                <tr key={i} className="border-b border-slate-800/40">
                                  <td className="py-2.5 font-bold text-slate-300">{metric.agent}</td>
                                  <td className="py-2.5 text-sky-400">{metric.latency_ms} ms</td>
                                  <td className="py-2.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${metric.cache_hit ? 'bg-emerald-950/20 text-emerald-450 border border-emerald-900/20' : 'bg-slate-800 text-slate-400'}`}>
                                      {metric.cache_hit ? "HIT" : "MISS"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-purple-400">{metric.llm_tokens}</td>
                                  <td className="py-2.5 text-slate-500">{metric.api_calls}</td>
                                  <td className="py-2.5 text-emerald-400">✓ OK</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  <ImageGallery 
                    images={result.images} 
                    destination={destinationName} 
                  />

                </div>

                {/* Widgets column */}
                <div className="space-y-6">
                  
                  {/* Budget Guardian Widget */}
                  <div className="glass-panel p-5 bg-slate-900/60 border border-slate-800 shadow-md space-y-4">
                    <h4 className="text-[10px] font-bold uppercase text-[#F5A623] tracking-widest font-mono flex items-center gap-1.5">
                      <DollarSign size={12} /> Budget Guardian Agent
                    </h4>
                    
                    {/* Budget Limit Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Target Limit:</span>
                        <span className="text-white font-bold">{currencySymbol}{targetBudget.toLocaleString()}{getHomeConversion(targetBudget)}</span>
                      </div>
                      <input
                        type="range"
                        min={Math.round(200 * exchangeRate)}
                        max={Math.round(8000 * exchangeRate)}
                        step={Math.round(50 * exchangeRate)}
                        value={targetBudget}
                        onChange={(e) => setTargetBudget(Number(e.target.value))}
                        className="w-full accent-[#E8650A] cursor-pointer"
                      />
                    </div>

                    {/* Cost Config Dropdowns */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-slate-500 block font-mono">Lodging</label>
                        <select
                          value={lodgingTier}
                          onChange={(e) => setLodgingTier(e.target.value)}
                          className="w-full bg-slate-950/40 border border-slate-800 rounded-lg p-1.5 text-xs text-white outline-none"
                        >
                          <option value="budget">Budget</option>
                          <option value="mid_range">Standard</option>
                          <option value="luxury">Luxury</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-slate-500 block font-mono">Meals</label>
                        <select
                          value={diningTier}
                          onChange={(e) => setDiningTier(e.target.value)}
                          className="w-full bg-slate-950/40 border border-slate-800 rounded-lg p-1.5 text-xs text-white outline-none"
                        >
                          <option value="budget">Budget</option>
                          <option value="mid_range">Standard</option>
                          <option value="luxury">Luxury</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-slate-500 block font-mono">Transit</label>
                        <select
                          value={transitMode}
                          onChange={(e) => setTransitMode(e.target.value)}
                          className="w-full bg-slate-950/40 border border-slate-800 rounded-lg p-1.5 text-xs text-white outline-none"
                        >
                          <option value="public">Metro</option>
                          <option value="rideshare">Taxi</option>
                          <option value="rental">Rental</option>
                        </select>
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Projected:</span>
                        <span className={`font-bold ${budgetGuardianWarning ? 'text-red-400' : 'text-emerald-400'}`}>
                          {currencySymbol}{Math.round(totalSpentCalculated).toLocaleString()}{getHomeConversion(totalSpentCalculated)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-950/80 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${budgetGuardianWarning ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, budgetRatio)}%` }}
                        />
                      </div>
                    </div>

                    {/* Guardian Warning Notice */}
                    {budgetGuardianWarning && (
                      <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-[10px] text-red-400 leading-normal font-mono">
                        ⚠️ Budget Guardian: Projected expenses exceed limit by {currencySymbol}{Math.round(totalSpentCalculated - targetBudget).toLocaleString()}{getHomeConversion(totalSpentCalculated - targetBudget)}! Consider changing Meals to Budget or Transport to Metro.
                      </div>
                    )}
                  </div>

                  {/* What-if Simulator Panel */}
                  <div className="glass-panel p-5 bg-slate-900/60 border border-slate-800 shadow-md space-y-4">
                    <h4 className="text-[10px] font-bold uppercase text-[#F5A623] tracking-widest font-mono flex items-center gap-1.5">
                      <Sparkles size={12} /> What-if Simulator
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Simulate modifications and watch the multi-agent graph re-run parameters instantly.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {[
                        { label: "+1 Extra Day", prompt: `Add 1 extra day to my ${destinationName} itinerary` },
                        { label: "Travel in November", prompt: `Re-evaluate this ${destinationName} plan for November travel` },
                        { label: "Traveling with kids", prompt: `Re-evaluate this ${destinationName} itinerary for family traveling with kids` },
                        { label: "Focus on street foods", prompt: `Re-evaluate this ${destinationName} plan focusing on local street eats` }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleWhatIfSimulation(item.prompt)}
                          className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/20 hover:bg-slate-950 hover:border-slate-700 text-[10px] font-bold tracking-wider uppercase text-slate-300 transition-all cursor-pointer leading-tight text-center"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ValidationReport report={result.validation_report} />

                  <WeatherCard 
                    weather={result.weather} 
                    destination={destinationName} 
                  />

                  <BookingLinks links={result.booking_links} />

                </div>

              </div>

            </div>
          )}

        </div>

        <footer className="py-6 text-center text-[10px] text-gray-600 border-t border-gray-900 bg-black/10">
          Built with FastAPI, LangGraph Orchestrator, Groq LLM, PostgreSQL Persisted Checkpointer, wttr.in & Nominatim
        </footer>
      </main>

      {/* Add Custom Place Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowCustomModal(false)} />
          <div className="relative w-full max-w-md bg-[#0D1B2A] border border-slate-800 p-6 rounded-3xl z-10 shadow-2xl space-y-4">
            <button 
              onClick={() => setShowCustomModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white bg-transparent border-none"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-extrabold text-white tracking-wider font-mono">ADD CUSTOM PLACE PIN</h3>
            <form onSubmit={handleAddCustomPlace} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 font-mono block">Place Name</label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. My Favorite Coffee Stall"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-xs outline-none focus:border-[#E8650A]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 font-mono block">Address / Location Search</label>
                <input
                  type="text"
                  required
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="e.g. Shibuya, Tokyo, Japan"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-white text-xs outline-none focus:border-[#E8650A]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#E8650A] hover:bg-[#E8650A]/90 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Add Pin to Map
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Quota Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={handleCloseQuotaModal} />
          <div className="relative w-full max-w-2xl bg-[#0D1B2A] border border-slate-800 shadow-2xl rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch z-10">
            <div className="md:col-span-5 relative min-h-[160px] md:min-h-full flex flex-col justify-end p-6">
              <div className="absolute inset-0 bg-slate-950/40" />
              <div className="relative z-10 space-y-1">
                <span className="text-[8px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono block">TripMate Quotas</span>
                <h4 className="text-sm font-bold text-white uppercase font-sans" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Your Travel Dashboard
                </h4>
              </div>
            </div>

            <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between space-y-6">
              <button onClick={handleCloseQuotaModal} className="absolute top-4 right-4 text-slate-500 hover:text-white bg-transparent border-none">
                <X size={18} />
              </button>

              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold tracking-widest text-[#F5A623] uppercase font-mono block">Plan Limit Policy</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight uppercase" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
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
                  className="flex-1 py-3 rounded-xl bg-[#E8650A] hover:bg-[#E8650A]/90 text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer text-center"
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
