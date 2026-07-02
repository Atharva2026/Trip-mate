import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowRight, Clock, Users, Sparkles, MapPin, ChevronLeft } from 'lucide-react';

const PACKAGES = [
  {
    title: 'Tropical Beach Getaway',
    location: 'Bali, Indonesia',
    image: '/dest-bali.png',
    duration: '7 Days',
    group: '2–6',
    price: '₹45,000',
    desc: 'Crystal-clear waters, lush rice terraces, and sacred temples. The ultimate tropical escape with world-class surfing and sunset dining.',
    prompt: 'Plan a 7-day tropical beach holiday in Bali, Indonesia with surfing, temple visits, rice terrace treks, and beachside dining under ₹45,000 per person.'
  },
  {
    title: 'Alpine Mountain Retreat',
    location: 'Swiss Alps, Switzerland',
    image: '/slide-switzerland.jpg',
    duration: '10 Days',
    group: '2–4',
    price: '₹1,80,000',
    desc: 'Snow-capped peaks, serene valleys, and wooden chalets. Hike through wildflower meadows and breathe the purest mountain air.',
    prompt: 'Plan a 10-day alpine hiking retreat in Saint Antönien, Switzerland, focusing on valley trails and chalet stays.'
  },
  {
    title: 'Cultural Heritage Tour',
    location: 'Kyoto & Nagano, Japan',
    image: '/slide-nagano.jpg',
    duration: '8 Days',
    group: '2–8',
    price: '₹95,000',
    desc: 'Ancient shrines draped in cherry blossoms, zen gardens, and mountain temples. Immerse yourself in centuries of Japanese tradition.',
    prompt: 'Plan a cultural 8-day holiday in Kyoto and Nagano, focusing on historic temples, tea ceremonies, and local street food tours.'
  },
  {
    title: 'Desert Safari Adventure',
    location: 'Marrakech, Morocco',
    image: '/slide-morocco.jpg',
    duration: '6 Days',
    group: '2–10',
    price: '₹55,000',
    desc: 'Amber sand dunes, ancient medinas, and starlit desert camps. Ride camels at sunset and explore the vibrant souks of Marrakech.',
    prompt: 'Plan a 6-day desert safari adventure in Marrakech, Morocco with camel treks, riad stays, and Sahara camping.'
  },
  {
    title: 'Romantic European Escape',
    location: 'Paris, France',
    image: '/dest-paris.png',
    duration: '5 Days',
    group: '2',
    price: '₹1,20,000',
    desc: 'The City of Light at its most enchanting. Seine river cruises, candlelit dinners, and the Eiffel Tower sparkling at midnight.',
    prompt: 'Plan a 5-day romantic getaway in Paris, France with Seine cruises, fine dining, museum visits, and Montmartre walks.'
  },
  {
    title: 'Off-Grid Road Trip',
    location: 'Yosemite, USA',
    image: '/slide-yosemite.jpg',
    duration: '9 Days',
    group: '2–5',
    price: '₹1,50,000',
    desc: 'Giant granite domes, ancient sequoia forests, and roaring waterfalls. The quintessential American wilderness experience.',
    prompt: 'Plan a 9-day road trip with camper van campgrounds and scenic hikes through Yosemite National Park.'
  }
];

export default function HolidaysPage() {
  const navigate = useNavigate();

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
          <span className="text-white font-extrabold tracking-[0.15em] text-xs uppercase font-mono group-hover:text-[#F5A623] transition-colors">
            Globe Express
          </span>
        </div>
        <nav className="hidden lg:flex items-center gap-8">
          {[
            { label: 'HOME', path: '/' },
            { label: 'HOLIDAYS', path: '/holidays' },
            { label: 'DESTINATIONS', path: '/destinations' },
            { label: 'FLIGHTS', path: '/flights' },
            { label: 'OFFERS', path: '/offers' },
            { label: 'CONTACTS', path: '/contacts' }
          ].map(link => (
            <a key={link.label} onClick={() => navigate(link.path)}
              className={`text-[10px] font-bold tracking-[0.2em] uppercase transition-colors cursor-pointer ${link.label === 'HOLIDAYS' ? 'text-[#F5A623]' : 'text-white/80 hover:text-white'}`}>
              {link.label}
            </a>
          ))}
        </nav>
        <button onClick={() => navigate('/planner')}
          className="px-5 py-2.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase bg-[#F5A623] text-white hover:bg-[#c39263] transition-all shadow-md">
          Plan Now
        </button>
      </header>

      {/* HERO */}
      <section className="relative w-full h-[70vh] overflow-hidden">
        <img src="/holidays-hero.png" alt="Holiday Escapes" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D1B2A]/70 to-transparent" />
        <div className="absolute bottom-16 left-6 lg:left-12 z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono">Curated Collections</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Handpicked<br />Holiday Escapes
          </h1>
          <p className="text-sm text-white/70 leading-relaxed max-w-sm">
            From tropical paradises to alpine sanctuaries — explore our curated collection of dream holidays, each designed by our AI travel agents.
          </p>
        </div>
      </section>

      {/* PACKAGES GRID */}
      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-20 space-y-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PACKAGES.map((pkg, idx) => (
            <div key={idx} className="rounded-2xl overflow-hidden bg-slate-900/60 shadow-md border border-slate-800 hover:shadow-xl hover:border-[#F5A623]/30 transition-all duration-500 flex flex-col group reveal-on-scroll">
              <div className="relative overflow-hidden aspect-[4/3]">
                <img src={pkg.image} alt={pkg.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-[8px] font-bold tracking-widest text-white uppercase bg-[#E8650A]/90 backdrop-blur-sm font-mono">
                  {pkg.location}
                </span>
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[9px] font-mono text-white/90"><Clock size={10} /> {pkg.duration}</span>
                  <span className="flex items-center gap-1 text-[9px] font-mono text-white/90"><Users size={10} /> {pkg.group} pax</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div className="space-y-2 mb-4">
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{pkg.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{pkg.desc}</p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">From</span>
                    <p className="text-lg font-bold text-[#F5A623]">{pkg.price}</p>
                    <span className="text-[9px] text-slate-500 font-mono">per person</span>
                  </div>
                  <button
                    onClick={() => navigate('/planner', { state: { prefill: pkg.prompt } })}
                    className="px-5 py-2.5 rounded-xl bg-[#E8650A] hover:bg-[#E8650A]/80 text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 group/btn cursor-pointer">
                    <span>Plan This</span>
                    <ArrowRight size={12} className="transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CUSTOM CTA */}
        <section className="text-center space-y-6 reveal-on-scroll">
          <Sparkles className="w-8 h-8 text-[#F5A623] mx-auto animate-pulse" />
          <h2 className="text-3xl font-extrabold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Can't find your dream holiday?
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Describe your perfect getaway and our AI agents will build a fully customized itinerary with flights, hotels, and daily schedules — in under 30 seconds.
          </p>
          <button
            onClick={() => navigate('/planner')}
            className="px-8 py-4 rounded-xl bg-[#F5A623] hover:bg-[#c39263] text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 mx-auto cursor-pointer">
            <span>Build Your Own Trip</span>
            <ArrowRight size={14} />
          </button>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[9px] text-slate-500 font-mono">© 2025 Globe Express / TripMate AI</p>
          <div className="flex items-center gap-6">
            {[
              { label: 'Home', path: '/' },
              { label: 'Planner', path: '/planner' },
              { label: 'My Trips', path: '/my-trips' }
            ].map(link => (
              <a key={link.label} onClick={() => navigate(link.path)}
                className="text-[10px] font-bold tracking-widest text-slate-400 hover:text-white uppercase transition-colors cursor-pointer">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
