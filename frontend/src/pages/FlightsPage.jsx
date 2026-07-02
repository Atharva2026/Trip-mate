import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowRight, Plane, Shield, Clock, Globe, Zap, Search } from 'lucide-react';

const AIRLINES = [
  { name: 'Emirates', region: 'Middle East Hub', color: '#C60C30' },
  { name: 'Singapore Airlines', region: 'Asia Pacific', color: '#F5A623' },
  { name: 'Lufthansa', region: 'Europe Hub', color: '#05164D' },
  { name: 'Air India', region: 'South Asia', color: '#E8650A' },
  { name: 'Qatar Airways', region: 'Global Network', color: '#5C0632' },
  { name: 'Turkish Airlines', region: 'Cross-Continental', color: '#C70A0C' },
];

const TIPS = [
  { icon: <Zap size={20} />, title: 'Real-Time Data', desc: 'We fetch live routing coordinates and airline schedules from AviationStack to find the most current flight options.' },
  { icon: <Globe size={20} />, title: 'Connecting Flights', desc: 'When direct routes aren\'t available, our Haversine algorithm identifies optimal transit hubs like Dubai, Singapore, or London.' },
  { icon: <Shield size={20} />, title: 'Price Intelligence', desc: 'We cross-reference economy class fare ranges across multiple carriers to estimate standard round-trip costs for your budget.' },
  { icon: <Clock size={20} />, title: 'Schedule Optimization', desc: 'Departure times and layover durations are optimized to minimize travel fatigue while keeping costs competitive.' },
];

export default function FlightsPage() {
  const navigate = useNavigate();

  const [origin, setOrigin] = useState('New Delhi (DEL)');
  const [destination, setDestination] = useState('Tokyo Narita (NRT)');
  const [departureDate, setDepartureDate] = useState('2026-07-15');
  const [durationNights, setDurationNights] = useState('7');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('revealed'); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
    return () => document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.unobserve(el));
  }, []);

  const handleSearch = () => {
    const prompt = `Find flights from ${origin} to ${destination} starting around ${departureDate} for ${durationNights} nights, economy class, best price.`;
    navigate('/planner', { state: { prefilledPrompt: prompt } });
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-slate-200 font-sans">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 py-5 bg-[#0D1B2A]/90 backdrop-blur-md border-b border-slate-800/50">
        <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer group">
          <Compass className="w-5 h-5 text-white transition-transform duration-700 group-hover:rotate-[360deg]" />
          <span className="text-white font-extrabold tracking-[0.15em] text-xs uppercase font-mono group-hover:text-[#F5A623] transition-colors">Globe Express</span>
        </div>
        <nav className="hidden lg:flex items-center gap-8">
          {[
            { label: 'HOME', path: '/' }, { label: 'HOLIDAYS', path: '/holidays' }, { label: 'DESTINATIONS', path: '/destinations' },
            { label: 'FLIGHTS', path: '/flights' }, { label: 'OFFERS', path: '/offers' }, { label: 'CONTACTS', path: '/contacts' }
          ].map(link => (
            <a key={link.label} onClick={() => navigate(link.path)}
              className={`text-[10px] font-bold tracking-[0.2em] uppercase transition-colors cursor-pointer ${link.label === 'FLIGHTS' ? 'text-[#F5A623]' : 'text-white/80 hover:text-white'}`}>
              {link.label}
            </a>
          ))}
        </nav>
        <button onClick={() => navigate('/planner')} className="px-5 py-2.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase bg-[#F5A623] text-white hover:bg-[#c39263] transition-all shadow-md">Plan Now</button>
      </header>

      {/* HERO */}
      <section className="relative w-full h-[70vh] overflow-hidden">
        <img src="/flights-hero.png" alt="Find Your Route" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D1B2A]/60 to-transparent" />
        <div className="absolute bottom-16 left-6 lg:left-12 z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <Plane size={14} className="text-[#F5A623]" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono">Flight Intelligence</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Find Your<br />Route
          </h1>
          <p className="text-sm text-white/70 leading-relaxed max-w-sm">
            Our AI-powered flight engine finds direct and connecting routes, optimizes for your budget, and pairs you with the best airlines for your journey.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-20 space-y-24">

        {/* SEARCH PROMPT PANEL */}
        <section className="reveal-on-scroll">
          <div className="relative rounded-3xl overflow-hidden border border-[#F5A623]/20 shadow-2xl p-8 md:p-12 bg-slate-900/60 hover:border-[#F5A623]/40 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-[#E8650A]/5 to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Where do you want to fly?
                </h2>
                <p className="text-xs text-slate-400 font-mono">Tell our planner your origin, destination, and dates — we'll handle the rest.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Origin box */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col justify-between focus-within:border-[#F5A623] transition-all">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2 text-left">From</span>
                  <input 
                    type="text" 
                    value={origin} 
                    onChange={e => setOrigin(e.target.value)}
                    className="w-full bg-transparent border-none text-base font-bold text-white outline-none focus:ring-0 p-0 m-0"
                    placeholder="City or Airport Code"
                  />
                  <span className="text-[9px] text-slate-600 block mt-1 text-left">Departure location</span>
                </div>
                
                {/* Destination box */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col justify-between focus-within:border-[#F5A623] transition-all">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2 text-left">To</span>
                  <input 
                    type="text" 
                    value={destination} 
                    onChange={e => setDestination(e.target.value)}
                    className="w-full bg-transparent border-none text-base font-bold text-[#F5A623] outline-none focus:ring-0 p-0 m-0"
                    placeholder="City or Airport Code"
                  />
                  <span className="text-[9px] text-slate-600 block mt-1 text-left">Arrival location</span>
                </div>

                {/* Date box */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col justify-between focus-within:border-[#F5A623] transition-all">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2 text-left">Departure Date</span>
                  <input 
                    type="date" 
                    value={departureDate} 
                    onChange={e => setDepartureDate(e.target.value)}
                    className="w-full bg-transparent border-none text-sm font-bold text-white outline-none focus:ring-0 p-0 m-0 cursor-pointer color-scheme-dark"
                  />
                  <span className="text-[9px] text-slate-600 block mt-1 text-left">Outbound travel date</span>
                </div>

                {/* Duration select box */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col justify-between focus-within:border-[#F5A623] transition-all">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2 text-left">Duration</span>
                  <select 
                    value={durationNights} 
                    onChange={e => setDurationNights(e.target.value)}
                    className="w-full bg-transparent border-none text-sm font-bold text-white outline-none focus:ring-0 p-0 m-0 cursor-pointer appearance-none bg-slate-950"
                  >
                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 21, 30].map(n => (
                      <option key={n} value={n} className="bg-slate-950 text-white font-sans">{n} Nights</option>
                    ))}
                  </select>
                  <span className="text-[9px] text-slate-600 block mt-1 text-left">Trip length</span>
                </div>
              </div>

              <button
                onClick={handleSearch}
                className="w-full py-4 rounded-xl bg-[#E8650A] hover:bg-[#E8650A]/90 text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                <Search size={14} />
                <span>Search Flights on TripMate</span>
              </button>
            </div>
          </div>
        </section>

        {/* HOW WE FIND FLIGHTS */}
        <section className="space-y-10 reveal-on-scroll">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono">How It Works</span>
            <h2 className="text-3xl font-extrabold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Intelligent Flight Routing
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIPS.map((tip, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-[#F5A623]/30 transition-all space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#E8650A]/10 text-[#E8650A] flex items-center justify-center">{tip.icon}</div>
                <h4 className="font-bold text-white text-sm">{tip.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PARTNER AIRLINES */}
        <section className="space-y-10 reveal-on-scroll">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono">Our Network</span>
            <h2 className="text-3xl font-extrabold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Airlines We Search
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {AIRLINES.map((airline, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 transition-all text-center space-y-2 group">
                <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white font-bold text-sm" style={{ background: airline.color }}>
                  {airline.name.charAt(0)}
                </div>
                <p className="text-xs font-bold text-white">{airline.name}</p>
                <p className="text-[9px] font-mono text-slate-500">{airline.region}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/60 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[9px] text-slate-500 font-mono">© 2025 Globe Express / TripMate AI</p>
          <div className="flex items-center gap-6">
            {[{ label: 'Home', path: '/' }, { label: 'Planner', path: '/planner' }, { label: 'My Trips', path: '/my-trips' }].map(link => (
              <a key={link.label} onClick={() => navigate(link.path)} className="text-[10px] font-bold tracking-widest text-slate-400 hover:text-white uppercase transition-colors cursor-pointer">{link.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
