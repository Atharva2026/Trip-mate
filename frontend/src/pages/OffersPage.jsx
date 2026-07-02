import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowRight, Tag, Clock, Percent, Sparkles, Mail } from 'lucide-react';

const DEALS = [
  {
    title: 'Maldives Paradise',
    image: '/offers-hero.png',
    original: '₹2,80,000',
    discounted: '₹1,89,000',
    discount: '32%',
    duration: '5 Nights',
    urgency: 'Ends in 3 days',
    prompt: 'Plan a 5-night luxury Maldives getaway with overwater villa, spa, and snorkeling'
  },
  {
    title: 'Bali Zen Retreat',
    image: '/dest-bali.png',
    original: '₹65,000',
    discounted: '₹42,000',
    discount: '35%',
    duration: '7 Nights',
    urgency: 'Ends in 5 days',
    prompt: 'Plan a 7-night Bali wellness retreat with yoga, rice terrace walks, and spa treatments'
  },
  {
    title: 'Morocco Sahara Camp',
    image: '/slide-morocco.jpg',
    original: '₹75,000',
    discounted: '₹52,500',
    discount: '30%',
    duration: '6 Nights',
    urgency: 'Limited spots',
    prompt: 'Plan a 6-night Moroccan adventure through Marrakech souks and Sahara desert camping'
  },
  {
    title: 'Swiss Alps Explorer',
    image: '/slide-switzerland.jpg',
    original: '₹2,20,000',
    discounted: '₹1,65,000',
    discount: '25%',
    duration: '10 Nights',
    urgency: 'Summer special',
    prompt: 'Plan a 10-night Swiss Alps hiking trip with chalet stays and scenic train rides'
  },
  {
    title: 'Tokyo Street Food Tour',
    image: '/dest-tokyo.png',
    original: '₹1,10,000',
    discounted: '₹82,500',
    discount: '25%',
    duration: '6 Nights',
    urgency: 'Ends in 7 days',
    prompt: 'Plan a 6-night Tokyo trip focusing on street food, Shibuya nightlife, and temple visits'
  },
  {
    title: 'Cape Town Adventure',
    image: '/dest-cape-town.png',
    original: '₹1,40,000',
    discounted: '₹98,000',
    discount: '30%',
    duration: '7 Nights',
    urgency: 'Best season now',
    prompt: 'Plan a 7-night Cape Town trip with Table Mountain hike, wine tours, and penguin colonies'
  },
];

export default function OffersPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

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
              className={`text-[10px] font-bold tracking-[0.2em] uppercase transition-colors cursor-pointer ${link.label === 'OFFERS' ? 'text-[#F5A623]' : 'text-white/80 hover:text-white'}`}>
              {link.label}
            </a>
          ))}
        </nav>
        <button onClick={() => navigate('/planner')} className="px-5 py-2.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase bg-[#F5A623] text-white hover:bg-[#c39263] transition-all shadow-md">Plan Now</button>
      </header>

      {/* HERO */}
      <section className="relative w-full h-[60vh] overflow-hidden">
        <img src="/offers-hero.png" alt="Limited Offers" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D1B2A]/80 to-transparent" />
        <div className="absolute bottom-16 left-6 lg:left-12 z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="px-3 py-1 rounded-full bg-red-600/90 text-white text-[9px] font-bold tracking-widest uppercase font-mono animate-pulse flex items-center gap-1.5">
              <Tag size={10} /> Limited Time Deals
            </div>
          </div>
          <h1 className="text-4xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Exclusive<br />Travel Offers
          </h1>
          <p className="text-sm text-white/70 leading-relaxed max-w-sm">
            Hand-picked seasonal deals with massive savings. Book now before they're gone — these prices won't last.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-20 space-y-24">

        {/* DEALS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {DEALS.map((deal, idx) => (
            <div key={idx} className="rounded-2xl overflow-hidden bg-slate-900/60 shadow-md border border-slate-800 hover:shadow-xl hover:border-[#F5A623]/30 transition-all duration-500 flex flex-col group reveal-on-scroll">
              <div className="relative overflow-hidden aspect-[4/3]">
                <img src={deal.image} alt={deal.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {/* Discount badge */}
                <div className="absolute top-4 right-4 w-14 h-14 rounded-full bg-red-600 flex flex-col items-center justify-center shadow-lg">
                  <span className="text-white font-extrabold text-sm leading-none">{deal.discount}</span>
                  <span className="text-white/80 text-[7px] font-mono uppercase">off</span>
                </div>
                {/* Urgency label */}
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-[#0D1B2A]/80 backdrop-blur-sm border border-[#F5A623]/30 text-[8px] font-bold text-[#F5A623] tracking-widest uppercase font-mono flex items-center gap-1">
                  <Clock size={9} /> {deal.urgency}
                </div>
                <div className="absolute bottom-4 left-4">
                  <span className="text-[9px] font-mono text-white/70">{deal.duration}</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{deal.title}</h3>
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <span className="text-slate-500 line-through text-sm">{deal.original}</span>
                    <p className="text-2xl font-extrabold text-[#F5A623]">{deal.discounted}</p>
                    <span className="text-[9px] text-slate-500 font-mono">per person</span>
                  </div>
                  <button
                    onClick={() => navigate('/planner', { state: { prefill: deal.prompt } })}
                    className="px-5 py-2.5 rounded-xl bg-[#E8650A] hover:bg-[#E8650A]/80 text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer">
                    <span>Grab Deal</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* NEWSLETTER */}
        <section className="text-center space-y-6 reveal-on-scroll">
          <Mail className="w-8 h-8 text-[#F5A623] mx-auto" />
          <h2 className="text-3xl font-extrabold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Never Miss a Deal
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Subscribe to our travel newsletter and get exclusive offers delivered straight to your inbox every week.
          </p>
          {!subscribed ? (
            <div className="flex items-center gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-5 py-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder-slate-500 outline-none focus:border-[#F5A623] transition-colors"
              />
              <button
                onClick={() => { if (email.includes('@')) setSubscribed(true); }}
                className="px-6 py-3.5 rounded-xl bg-[#F5A623] hover:bg-[#c39263] text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap">
                Subscribe
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-bold">
              <Sparkles size={16} /> You're subscribed! Watch your inbox for hot deals.
            </div>
          )}
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
