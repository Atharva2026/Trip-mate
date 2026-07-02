import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowRight, MapPin, Globe, Sparkles } from 'lucide-react';

const REGIONS = {
  Europe: [
    { name: 'Paris, France', image: '/dest-paris.png', desc: 'The city of light, love, and legendary cuisine. Iconic art, architecture, and romance at every corner.', prompt: 'Plan a 5-day romantic trip to Paris with museums, fine dining and Seine walks' },
    { name: 'Swiss Alps', image: '/slide-switzerland.jpg', desc: 'Majestic mountain peaks, pristine lakes, and fairy-tale villages nestled in deep green valleys.', prompt: 'Plan a 10-day alpine hiking retreat in Switzerland' },
    { name: 'Tarifa, Spain', image: '/slide-spain.jpg', desc: 'Where the Atlantic meets the Mediterranean. Epic beaches, world-class windsurfing, and vibrant nightlife.', prompt: 'Plan a beach holiday in Tarifa Spain with surfing and nightlife' },
  ],
  Asia: [
    { name: 'Kyoto, Japan', image: '/slide-nagano.jpg', desc: 'Timeless temples, bamboo forests, and geisha districts. The cultural heartbeat of ancient Japan.', prompt: 'Plan a cultural 7-day trip to Kyoto focusing on temples and street food' },
    { name: 'Bali, Indonesia', image: '/dest-bali.png', desc: 'Sacred rice terraces, volcanic mountains, and turquoise surf breaks. A tropical spiritual retreat.', prompt: 'Plan a 7-day tropical holiday in Bali with surfing and temple visits' },
    { name: 'Dubai, UAE', image: '/dest-dubai.png', desc: 'Ultra-futuristic skyline meeting golden desert dunes. Shopping, luxury dining, and desert safaris.', prompt: 'Plan a luxury 5-day trip to Dubai with desert safari and marina dining' },
  ],
  Americas: [
    { name: 'Yosemite, USA', image: '/slide-yosemite.jpg', desc: 'Granite monoliths, giant sequoias, and thundering waterfalls in America\'s most iconic national park.', prompt: 'Plan a road trip through Yosemite National Park with camping' },
    { name: 'Machu Picchu, Peru', image: '/dest-machu-picchu.png', desc: 'A mystical Incan citadel above the clouds. One of the world\'s most awe-inspiring archaeological sites.', prompt: 'Plan a trek to Machu Picchu via the Inca Trail with cultural stops' },
  ],
  Africa: [
    { name: 'Marrakech, Morocco', image: '/slide-morocco.jpg', desc: 'Spice-scented souks, ornate riads, and Saharan starlit camps. A feast for every sense.', prompt: 'Plan a 6-day Moroccan adventure in Marrakech and the Sahara desert' },
    { name: 'Cape Town, South Africa', image: '/dest-cape-town.png', desc: 'Table Mountain, penguin colonies, and world-class vineyards along the dramatic Garden Route.', prompt: 'Plan a 7-day Cape Town trip with Table Mountain, wine tours and beaches' },
  ],
};

const REGION_KEYS = Object.keys(REGIONS);

export default function DestinationsPage() {
  const navigate = useNavigate();
  const [activeRegion, setActiveRegion] = useState('Europe');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('revealed'); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
    return () => document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.unobserve(el));
  }, []);

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
              className={`text-[10px] font-bold tracking-[0.2em] uppercase transition-colors cursor-pointer ${link.label === 'DESTINATIONS' ? 'text-[#F5A623]' : 'text-white/80 hover:text-white'}`}>
              {link.label}
            </a>
          ))}
        </nav>
        <button onClick={() => navigate('/planner')} className="px-5 py-2.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase bg-[#F5A623] text-white hover:bg-[#c39263] transition-all shadow-md">Plan Now</button>
      </header>

      {/* HERO */}
      <section className="relative w-full h-[70vh] overflow-hidden">
        <img src="/destinations-hero.png" alt="Explore Destinations" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D1B2A]/70 to-transparent" />
        <div className="absolute bottom-16 left-6 lg:left-12 z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={14} className="text-[#F5A623]" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono">World Explorer</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Explore the<br />World
          </h1>
          <p className="text-sm text-white/70 leading-relaxed max-w-sm">
            Browse destinations by region. Discover hidden gems and iconic landmarks, then plan your perfect trip with one click.
          </p>
        </div>
      </section>

      {/* REGION TABS + GRID */}
      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-20 space-y-12">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-3 reveal-on-scroll">
          {REGION_KEYS.map(region => (
            <button
              key={region}
              onClick={() => setActiveRegion(region)}
              className={`px-5 py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all cursor-pointer border ${
                activeRegion === region
                  ? 'bg-[#E8650A] text-white border-[#E8650A] shadow-[0_0_15px_rgba(232,101,10,0.3)]'
                  : 'bg-transparent text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white'
              }`}>
              {region}
            </button>
          ))}
        </div>

        {/* Destination Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" key={activeRegion}>
          {REGIONS[activeRegion].map((dest, idx) => (
            <div key={idx} className="rounded-2xl overflow-hidden bg-slate-900/60 shadow-md border border-slate-800 hover:shadow-xl hover:border-[#F5A623]/30 transition-all duration-500 flex flex-col group reveal-on-scroll"
              style={{ animationDelay: `${idx * 100}ms` }}>
              <div className="relative overflow-hidden aspect-[4/3]">
                <img src={dest.image} alt={dest.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <span className="flex items-center gap-1.5 text-white font-bold text-sm">
                    <MapPin size={12} className="text-[#F5A623]" /> {dest.name}
                  </span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <p className="text-xs text-slate-400 leading-relaxed mb-6">{dest.desc}</p>
                <button
                  onClick={() => navigate('/planner', { state: { prefill: dest.prompt } })}
                  className="w-full py-3 rounded-xl text-[10px] font-bold tracking-widest uppercase text-center transition-all cursor-pointer bg-[#F5A623]/10 text-[#F5A623] hover:bg-[#F5A623]/20 border border-[#F5A623]/20 flex items-center justify-center gap-2">
                  <span>Discover & Plan</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Trending */}
        <section className="space-y-8 reveal-on-scroll">
          <div className="text-center">
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono">Trending Now</span>
            <h2 className="text-3xl font-extrabold text-white mt-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Most Popular This Season
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Bali', tag: '🔥 #1 Trending', image: '/dest-bali.png' },
              { name: 'Tokyo', tag: '🌸 Cherry Blossom Season', image: '/dest-tokyo.png' },
              { name: 'Cape Town', tag: '🏔️ Best Weather Now', image: '/dest-cape-town.png' },
            ].map((t, i) => (
              <div key={i} className="relative rounded-2xl overflow-hidden aspect-[16/9] group cursor-pointer"
                onClick={() => navigate('/planner', { state: { prefill: `Plan a trip to ${t.name}` } })}>
                <img src={t.image} alt={t.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-[9px] font-mono text-[#F5A623] uppercase tracking-widest">{t.tag}</span>
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{t.name}</h3>
                </div>
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
