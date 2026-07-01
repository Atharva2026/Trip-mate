import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plane, 
  Hotel, 
  Calendar, 
  Compass, 
  Download, 
  Copy, 
  Sparkles, 
  AlertCircle, 
  Bookmark,
  Map,
  ArrowLeft
} from 'lucide-react';
import { marked } from 'marked';

// Import custom production components
import SafeImage from '../components/SafeImage';
import FreshnessBadge from '../components/FreshnessBadge';
import MapView from '../components/MapView';
import BookingLinks from '../components/BookingLinks';
import ImageGallery from '../components/ImageGallery';
import ValidationReport from '../components/ValidationReport';
import WeatherCard from '../components/WeatherCard';
import CostBreakdown from '../components/CostBreakdown';

// Configure marked
marked.setOptions({ gfm: true, breaks: true });

export default function SharedPlan() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trip, setTrip] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const pdfRef = useRef(null);

  useEffect(() => {
    const fetchTrip = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("tripmate_token");
        const headers = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/trips/${tripId}`, { headers });
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to retrieve shared travel plan.");
        }
        
        setTrip(data.trip);
      } catch (err) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };
    
    if (tripId) {
      fetchTrip();
    }
  }, [tripId]);

  const handleCopy = () => {
    if (!trip || !trip.result_json) return;
    navigator.clipboard.writeText(trip.result_json.answer || "").then(() => {
      alert("Plan copied to clipboard!");
    });
  };

  const handleDownloadPDF = () => {
    if (!trip || !trip.result_json) return;
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
      filename: `TripMate-SharedPlan-${tripId.slice(0, 8)}.pdf`,
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D1B2A] text-slate-200">
        <div className="w-8 h-8 rounded-full border-2 border-[#E8650A] border-t-transparent animate-spin mb-4" />
        <p className="text-xs font-semibold font-mono">Loading shared travel plan...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D1B2A] text-center p-6 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h3 className="text-lg font-bold text-white uppercase tracking-tight font-mono">Access Denied / Not Found</h3>
        <p className="text-xs text-slate-405 max-w-sm font-mono leading-relaxed">
          {error || "This shared travel plan does not exist, or has been set to private by the owner."}
        </p>
        <button 
          onClick={() => navigate('/')}
          className="custom-btn px-6 py-2.5 text-xs font-semibold flex items-center gap-1.5 text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to Home
        </button>
      </div>
    );
  }

  const result = trip.result_json;
  const destinationName = trip.destination || result?.travel_context?.destination || "";

  return (
    <div className="relative min-h-screen bg-[#0D1B2A] text-slate-200 font-sans pb-12">
      {/* Background glow effects */}
      <div className="background-glows">
        <div className="glow-1"></div>
        <div className="glow-2"></div>
        <div className="glow-3"></div>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0D1B2A]/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90"
          >
            <Compass className="w-6 h-6 text-[#E8650A]" />
            <span className="font-bold text-sm text-white tracking-tight uppercase font-mono">Globe Express</span>
          </div>
          
          <button 
            onClick={() => navigate('/')}
            className="custom-btn custom-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Plan Your Own Trip
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-6 pt-6 space-y-6">
        
        {/* Parallax Hero Image Banner */}
        {destinationName && (
          <div className="relative rounded-2xl overflow-hidden h-48 md:h-64 border border-slate-800 bg-slate-900 flex items-end">
            <SafeImage
              src={result.images?.[0]?.url}
              alt={destinationName}
              destinationName={destinationName}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent"></div>
            
            <div className="relative p-6 w-full flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5 text-[#F5A623] text-[9px] font-bold uppercase tracking-wider font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>Shared Itinerary</span>
                </div>
                <h3 className="text-xl md:text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {trip.title}
                </h3>
              </div>
              
              <div className="flex gap-2">
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
        )}

        {/* Side-by-side Widget Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Content Area */}
          <div className="md:col-span-2 space-y-6">
            
            <div className="glass-panel overflow-hidden bg-slate-900/60 border border-slate-800 shadow-md">
              {/* Tabs Selection */}
              <div className="flex border-b border-slate-800 bg-slate-950/20 px-4 pt-2 gap-1">
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
                        Flight Details
                      </h3>
                      <FreshnessBadge freshness={result.data_freshness?.flights} />
                    </div>
                    {result.flight_results ? (
                      <div dangerouslySetInnerHTML={renderMarkdown(result.flight_results)} />
                    ) : (
                      <p className="text-xs italic text-slate-500">No flight information compiled.</p>
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
                      <p className="text-xs italic text-slate-500">No hotel recommendations compiled.</p>
                    )}
                  </div>
                )}

                {activeTab === "itinerary" && (
                  <div>
                    <h3 className="text-lg font-bold border-b border-slate-800 pb-2.5 mb-4 text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                      <Calendar className="w-5 h-5 text-[#F5A623]" />
                      Detailed Itinerary Schedule
                    </h3>
                    {result.itinerary ? (
                      <div dangerouslySetInnerHTML={renderMarkdown(result.itinerary)} />
                    ) : (
                      <p className="text-xs italic text-slate-500">No detailed itinerary schedule compiled.</p>
                    )}
                  </div>
                )}

                {activeTab === "map" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold border-b border-slate-800 pb-2.5 mb-4 text-[#E8650A] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                      <Map className="w-5 h-5 text-[#F5A623]" />
                      Map Routes
                    </h3>
                    <MapView 
                      locations={result.map_locations} 
                      destination={destinationName} 
                    />
                  </div>
                )}

              </div>
            </div>
                


            {/* Gallery images */}
            <ImageGallery 
              images={result.images} 
              destination={destinationName} 
            />

          </div>

          {/* Widgets Area */}
          <div className="space-y-6">
            
            {/* Validation checks */}
            <ValidationReport report={result.validation_report} />

            {/* Weather outlook */}
            <WeatherCard 
              weather={result.weather} 
              destination={destinationName} 
            />

            {/* Cost breakdown stacked progress bar */}
            <CostBreakdown itineraryText={result.itinerary || result.answer} />

            {/* Booking Links */}
            <BookingLinks links={result.booking_links} />

          </div>

        </div>
      </div>
    </div>
  );
}
