import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, User, MapPin, ChevronLeft, ChevronRight, 
  ArrowDown, Plane, Hotel, CalendarDays, Sparkles, 
  ArrowRight, Compass, CompassIcon, Info, HelpCircle,
  ShieldCheck, ExternalLink, BookmarkCheck
} from 'lucide-react';

const SLIDES = [
  {
    id: 0,
    region: 'Switzerland Alps',
    title: 'SAINT\nANTÖNIEN',
    titleFlat: 'SAINT ANTÖNIEN',
    cardLabel: 'SAINT ANTÖNIEN',
    desc: 'Nestled deep in the Prättigau valley, Saint Antönien is an untouched alpine secret — where silence is interrupted only by the wind through powder snow and the distant peal of cowbells.',
    image: '/slide-switzerland.jpg',
  },
  {
    id: 1,
    region: 'Japan Alps',
    title: 'NAGANO\nPREFECTURE',
    titleFlat: 'NAGANO PREFECTURE',
    cardLabel: 'NAGANO PREFECTURE',
    desc: 'Where crimson maples flame against ancient pagodas and snow-capped peaks pierce the clouds. Nagano Prefecture is Japan’s most dramatic season of colour, etched into mountain memory.',
    image: '/slide-nagano.jpg',
  },
  {
    id: 2,
    region: 'Sahara Desert · Morocco',
    title: 'MARRAKECH\nMERZOUGA',
    titleFlat: 'MARRAKECH MERZOUGA',
    cardLabel: 'MARRAKECH MERZOUGA',
    desc: 'Vast golden dunes rolling into an infinite amber horizon. Merzouga is where the Milky Way reflects off desert silence, and camel caravans trace the same routes as the ancient spice trade.',
    image: '/slide-morocco.jpg',
  },
  {
    id: 3,
    region: 'California · United States',
    title: 'YOSEMITE\nNATIONAL PARK',
    titleFlat: 'YOSEMITE NATIONAL PARK',
    cardLabel: 'YOSEMITE NAT. PARK',
    desc: 'Half Dome, El Capitan, and Bridalveil Fall — Yosemite is the cathedral of American wilderness, where granite monoliths meet mirror rivers and rainbow mist fills the valley air.',
    image: '/slide-yosemite.jpg',
  },
  {
    id: 4,
    region: 'Tarifa · Spain',
    title: 'LOS LANCES\nBEACH',
    titleFlat: 'LOS LANCES BEACH',
    cardLabel: 'LOS LANCES BEACH',
    desc: 'Europe’s southernmost tip where the Atlantic and Mediterranean collide. Tarifa’s Los Lances Beach blazes with a hundred kites under dramatic skies, with Africa shimmering on the horizon.',
    image: '/slide-spain.jpg',
  },
];

const DURATION = 8000;

export default function LandingPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [textVisible, setTextVisible] = useState(true);
  const [progressKey, setProgressKey] = useState(0);
  const [demoInput, setDemoInput] = useState('');
  const autoTimer = useRef(null);
  const scrollRef = useRef(null);

  // Mouse ambient spotlight glow state
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  
  // Scroll percentage reading tracker
  const [scrollProgress, setScrollProgress] = useState(0);

  // Track mouse coordinates
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalScroll > 0 ? (window.pageYOffset / totalScroll) * 100 : 0;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver for reveal on scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.08 }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const goTo = useCallback((idx) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTextVisible(false);
    setPrev(current);
    setTimeout(() => {
      setCurrent(idx);
      setProgressKey(k => k + 1);
      setTimeout(() => {
        setTextVisible(true);
        setIsAnimating(false);
        setPrev(null);
      }, 100);
    }, 500);
  }, [current, isAnimating]);

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo]);
  const back = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo]);

  // Auto-advance slider
  useEffect(() => {
    autoTimer.current = setTimeout(next, DURATION);
    return () => clearTimeout(autoTimer.current);
  }, [current, next]);

  const slide = SLIDES[current];
  const prevSlide = prev !== null ? SLIDES[prev] : null;
  const queue = SLIDES.filter((_, i) => i !== current);

  const scrollToMore = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDemoGenerate = () => {
    if (demoInput.trim()) {
      navigate('/planner', { state: { prefill: demoInput } });
    } else {
      navigate('/planner');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-slate-200 font-sans selection:bg-[#F5A623]/30 selection:text-[#a06f40]">
      
      {/* ── TOP READING SCROLL PROGRESS BAR ── */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[101] bg-transparent">
        <div 
          className="h-full bg-gradient-to-r from-[#E8650A] to-[#F5A623] transition-all duration-75"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* ── CURSOR AMBIENT GLOW SPOTLIGHT ── */}
      <div 
        className="pointer-events-none fixed z-30 w-[350px] h-[350px] rounded-full mix-blend-screen bg-radial blur-[80px] opacity-[0.22] transition-all duration-300 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(245, 166, 35, 0.18) 0%, transparent 70%)',
          left: `${mousePos.x - 175}px`,
          top: `${mousePos.y - 175}px`,
        }}
      />
      
      {/* ── TOP LOADING PROGRESS BAR ── */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[100] bg-slate-900/60/10">
        <div
          key={progressKey}
          className="h-full bg-[#F5A623]"
          style={{ animation: `progressFill ${DURATION}ms linear forwards` }}
        />
      </div>

      {/* ══════════════════════════════════════════════
          HERO HEADER / NAV
      ══════════════════════════════════════════════ */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 py-5 bg-gradient-to-b from-black/50 to-transparent">
        <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer group">
          <Compass className="w-5 h-5 text-white transition-transform duration-700 group-hover:rotate-[360deg]" />
          <span className="text-white font-extrabold tracking-[0.15em] text-xs uppercase font-mono group-hover:text-[#F5A623] transition-colors">
            Globe Express
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-8">
          {['HOME', 'HOLIDAYS', 'DESTINATIONS', 'FLIGHTS', 'OFFERS', 'CONTACTS'].map((link, i) => (
            <a key={link} href="#" 
              onClick={(e) => { e.preventDefault(); if(link==='DESTINATIONS') scrollToMore(); }}
              className="text-[10px] font-bold tracking-[0.2em] text-white/80 hover:text-white uppercase transition-colors">
              {link}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/my-trips')}
            className="text-[10px] font-bold tracking-[0.2em] text-white/80 hover:text-white uppercase transition-colors bg-transparent border-none cursor-pointer">
            My Trips
          </button>
          <button 
            onClick={() => navigate('/planner')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase transition-all shadow-md"
            style={{ background: '#F5A623', color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.background = '#c39263'}
            onMouseLeave={e => e.currentTarget.style.background = '#F5A623'}>
            Plan Now
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════
          HERO SLIDER (FULL SCREEN)
      ══════════════════════════════════════════════ */}
      <section className="relative w-full h-screen overflow-hidden bg-black">
        {/* Previous background image */}
        {prevSlide && (
          <div
            className="absolute inset-0 bg-center bg-cover z-0 transition-opacity duration-700 ease-in-out opacity-0"
            style={{ backgroundImage: `url(${prevSlide.image})` }}
          />
        )}
        {/* Current background image */}
        <div
          className="absolute inset-0 bg-center bg-cover z-0 transition-opacity duration-700 ease-in-out"
          style={{ backgroundImage: `url(${slide.image})`, opacity: 1 }}
        />

        {/* Cinematic gradient mask overlays */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-transparent to-black/25" />

        {/* Content wrapper */}
        <div className="absolute inset-0 z-10 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mt-12">
            
            {/* Left side texts */}
            <div className="max-w-[480px]">
              <div 
                className="text-[10px] font-bold tracking-[0.3em] uppercase mb-4 text-[#F5A623] transition-all duration-500 font-mono"
                style={{
                  opacity: textVisible ? 1 : 0,
                  transform: textVisible ? 'translateY(0)' : 'translateY(12px)',
                }}>
                {slide.region}
              </div>
              <h1 
                className="text-white font-extrabold uppercase leading-[0.9] tracking-tight mb-6 transition-all duration-600"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 'clamp(44px, 6.5vw, 84px)',
                  color: '#ffffff',
                  whiteSpace: 'pre-line',
                  opacity: textVisible ? 1 : 0,
                  transform: textVisible ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: '50ms'
                }}>
                {slide.title}
              </h1>
              <p 
                className="text-white/70 text-xs md:text-sm leading-relaxed mb-8 transition-all duration-500"
                style={{
                  opacity: textVisible ? 1 : 0,
                  transform: textVisible ? 'translateY(0)' : 'translateY(15px)',
                  transitionDelay: '100ms'
                }}>
                {slide.desc}
              </p>
              <div 
                className="flex items-center gap-3 transition-all duration-500"
                style={{
                  opacity: textVisible ? 1 : 0,
                  transform: textVisible ? 'translateY(0)' : 'translateY(12px)',
                  transitionDelay: '150ms'
                }}>
                <button 
                  onClick={() => navigate('/planner')}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-full text-[10px] font-bold tracking-[0.2em] text-white uppercase transition-all bg-slate-900/60/10 hover:bg-slate-900/60/20 border border-white/30 backdrop-blur-md">
                  <span>Discover Location</span>
                  <div className="w-6 h-6 rounded-full bg-[#F5A623] flex items-center justify-center">
                    <MapPin size={11} className="text-black" />
                  </div>
                </button>
              </div>
            </div>

            {/* Right side next cards queue */}
            <div className="hidden lg:flex items-center gap-4">
              {queue.slice(0, 3).map((s, idx) => (
                <div 
                  key={s.id}
                  onClick={() => goTo(s.id)}
                  className="relative w-[130px] h-[190px] rounded-xl overflow-hidden cursor-pointer group transition-all duration-500 border border-white/10 hover:border-[#F5A623]/60 shadow-lg"
                  style={{
                    opacity: idx === 0 ? 1 : idx === 1 ? 0.8 : 0.55,
                    transform: `scale(${idx === 0 ? 1 : idx === 1 ? 0.94 : 0.88})`,
                  }}>
                  <img src={s.image} alt={s.cardLabel} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <span className="absolute bottom-3 left-3 right-3 text-[8px] font-bold tracking-widest text-white uppercase line-clamp-1 font-mono">
                    {s.cardLabel}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Bottom controls & mouse down indicator */}
        <div className="absolute bottom-8 left-6 lg:left-12 right-6 lg:right-12 z-30 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <button onClick={back} className="w-10 h-10 rounded-full border border-white/30 hover:border-white/60 bg-slate-900/60/5 hover:bg-slate-900/60/15 text-white transition-all flex items-center justify-center">
              <ChevronLeft size={16} />
            </button>
            <button onClick={next} className="w-10 h-10 rounded-full border border-white/30 hover:border-white/60 bg-slate-900/60/5 hover:bg-slate-900/60/15 text-white transition-all flex items-center justify-center">
              <ChevronRight size={16} />
            </button>
          </div>

          <div 
            onClick={scrollToMore}
            className="hidden md:flex flex-col items-center gap-1 cursor-pointer text-white/55 hover:text-white transition-all font-mono text-[9px] tracking-[0.2em]">
            <span>EXPLORE SCROLL</span>
            <ArrowDown size={12} className="animate-bounce" />
          </div>

          <div className="flex items-end gap-2 text-white font-mono leading-none">
            <span className="text-4xl font-extrabold tracking-tighter" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {String(current + 1).padStart(2, '0')}
            </span>
            <span className="text-white/30 text-xs pb-1">/ {String(SLIDES.length).padStart(2, '0')}</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SCROLL CONTAINER SECTION - EDITORIAL STORIES
      ══════════════════════════════════════════════ */}
      <main ref={scrollRef} className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-24 space-y-36">

        {/* Ambient glow details in background */}
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden opacity-30">
          <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#F5A623]/5 blur-[90px]" />
          <div className="absolute bottom-[20%] left-[5%] w-[450px] h-[450px] rounded-full bg-sky-500/5 blur-[90px]" />
        </div>

        {/* ── EDITORIAL STORY 1: CURATE YOUR ESCAPE (Split layout) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center reveal-on-scroll">
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]" />
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono">Curated Escapes</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Every Detail.<br />
              Crafted in Parallel.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We believe travel is too precious for generic templates. TripMate uses four specialized, independent travel agents that coordinate your schedule, live flight routing, and curated hotel stays in less than 30 seconds.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Open up maps, cross-reference travel times, and preview destinations instantly with visual tags and estimated prices.
            </p>
            <div className="pt-2">
              <button 
                onClick={() => navigate('/planner')}
                className="flex items-center gap-2.5 px-6 py-3 rounded-full text-xs font-bold tracking-widest text-white uppercase transition-all shadow-md"
                style={{ background: '#0f172a' }}
                onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                onMouseLeave={e => e.currentTarget.style.background = '#0f172a'}>
                <span>Plan Your Route</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            {/* Flatlay image display frame */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900/60 p-3 group">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#F5A623]/10 to-transparent pointer-events-none rounded-3xl" />
              <img 
                src="/hero-flatlay.png" 
                alt="Travel Preparation Flatlay" 
                className="w-full aspect-[4/3] object-cover rounded-2xl transition-transform duration-700 group-hover:scale-[1.02]" 
              />
              {/* Badge Overlay */}
              <div className="absolute top-6 left-6 px-3 py-1.5 rounded-lg bg-slate-900/60/90 backdrop-blur-md shadow-sm border border-slate-800 text-[10px] font-bold tracking-widest text-slate-800 uppercase flex items-center gap-1.5 font-mono">
                <Compass size={11} className="text-[#F5A623] animate-spin-slow" />
                <span>The Art of Wandering</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── EDITORIAL STORY 2: INSPIRATION PINBOARD (Split layout reverse) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center reveal-on-scroll">
          <div className="lg:col-span-7 order-last lg:order-first">
            {/* Mood Board frame */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900/60 p-3 group">
              <div className="absolute inset-0 bg-gradient-to-bl from-sky-500/5 to-transparent pointer-events-none rounded-3xl" />
              <img 
                src="/travel-board.png" 
                alt="Travel Mood Board" 
                className="w-full aspect-[4/3] object-cover rounded-2xl transition-transform duration-700 group-hover:scale-[1.02]" 
              />
              <div className="absolute bottom-6 right-6 px-3.5 py-2 rounded-lg bg-slate-900/95 backdrop-blur-md shadow-sm text-[10px] font-bold tracking-widest text-white uppercase flex items-center gap-1.5 font-mono">
                <BookmarkCheck size={12} className="text-[#F5A623]" />
                <span>Inspiration Board</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#E8650A] uppercase font-mono">Visual Planning</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Visual Pinboards.<br />
              Real Memories.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Get detailed visual highlights, maps, and weather outlooks directly inside your planner panel. No more switching back and forth between search engines, booking sites, and notes.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every plan generates high-resolution destination galleries, a validation checklist, and estimated price ranges for transparency.
            </p>
            <div className="pt-2">
              <button 
                onClick={() => navigate('/planner')}
                className="flex items-center gap-2.5 px-6 py-3 rounded-full text-xs font-bold tracking-widest text-slate-200 bg-slate-900/60 hover:bg-slate-900/50 border border-slate-800 uppercase transition-all shadow-sm">
                <span>Try Demo Board</span>
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        </section>

        {/* ── CHOOSE YOUR ESCAPE STYLE (Grid Showcase) ── */}
        <section className="space-y-12 reveal-on-scroll">
          <div className="text-center max-w-xl mx-auto space-y-4">
            <h2 className="text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Choose Your Travel Style
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Whether you crave beachside sunrises, alpine valleys, or exploring nature from a cozy home on wheels, we adapt the planner parameters to fit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Coastal Escapes */}
            <div className="rounded-2xl overflow-hidden bg-slate-900/60 shadow-md border border-slate-800 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="relative overflow-hidden aspect-video">
                  <img src="/beach-sunset.png" alt="Coastal Escapes" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute top-3 left-3 px-2 py-1 rounded text-[8px] font-bold tracking-widest text-white uppercase bg-slate-900/85 backdrop-blur-sm font-mono">Beach</span>
                </div>
                <div className="p-6 space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm">Coastal Escapes</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sunrise dunes, turquoise waters, and coastal villages. Discover ocean breeze retreats with live booking connections.
                  </p>
                </div>
              </div>
              <div className="p-6 pt-0">
                <button 
                  onClick={() => navigate('/planner', { state: { prefill: 'Plan a 5-day beach holiday in Tarifa, Spain under €1000' } })}
                  className="w-full text-center py-2.5 rounded-lg text-[10px] font-bold tracking-wider text-[#F5A623] bg-[#F5A623]/10 hover:bg-[#F5A623]/20 transition-colors uppercase">
                  Explore Beach Escapes
                </button>
              </div>
            </div>

            {/* Off-Grid Road Trip */}
            <div className="rounded-2xl overflow-hidden bg-slate-900/60 shadow-md border border-slate-800 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="relative overflow-hidden aspect-video">
                  <img src="/camper-van.png" alt="Off-Grid Adventure" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute top-3 left-3 px-2 py-1 rounded text-[8px] font-bold tracking-widest text-white uppercase bg-slate-900/85 backdrop-blur-sm font-mono">Off-Grid</span>
                </div>
                <div className="p-6 space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm">Road Trips & Camping</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Camper van life, forest trails, and camps under twilight stars. Tailored for mountain passes and wild campgrounds.
                  </p>
                </div>
              </div>
              <div className="p-6 pt-0">
                <button 
                  onClick={() => navigate('/planner', { state: { prefill: 'Plan a road trip with scenic camper campgrounds in Yosemite National Park' } })}
                  className="w-full text-center py-2.5 rounded-lg text-[10px] font-bold tracking-wider text-[#F5A623] bg-[#F5A623]/10 hover:bg-[#F5A623]/20 transition-colors uppercase">
                  Explore Campgrounds
                </button>
              </div>
            </div>

            {/* Alpine Sanctuary */}
            <div className="rounded-2xl overflow-hidden bg-slate-900/60 shadow-md border border-slate-800 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="relative overflow-hidden aspect-video">
                  <img src="/slide-switzerland.jpg" alt="Alpine Sanctuary" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute top-3 left-3 px-2 py-1 rounded text-[8px] font-bold tracking-widest text-white uppercase bg-slate-900/85 backdrop-blur-sm font-mono">Alpine</span>
                </div>
                <div className="p-6 space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm">Alpine Sanctuaries</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Traditional wooden chalets, deep valley stillness, and sky-high mountains. Best for hiking retreats and winter getaways.
                  </p>
                </div>
              </div>
              <div className="p-6 pt-0">
                <button 
                  onClick={() => navigate('/planner', { state: { prefill: 'Plan an alpine hiking retreat in Saint Antönien, Switzerland' } })}
                  className="w-full text-center py-2.5 rounded-lg text-[10px] font-bold tracking-wider text-[#F5A623] bg-[#F5A623]/10 hover:bg-[#F5A623]/20 transition-colors uppercase">
                  Explore Valleys
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── TRIP PLANNER DESCENT ENGINE (Interactive input panel) ── */}
        <section className="max-w-3xl mx-auto py-8 px-4">
          <div className="relative rounded-3xl overflow-hidden border border-[#F5A623]/20 shadow-2xl p-8 md:p-12 transition-all duration-500 hover:border-[#F5A623]/40 hover:shadow-[0_20px_50px_rgba(245,166,35,0.15)] group/panel space-y-6">
            
            {/* Background artwork layer */}
            <div className="absolute inset-0 z-0">
              <img 
                src="/railway-scenery.jpg" 
                alt="Railway Scenery Background" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover/panel:scale-105 animate-slow-zoom-pan"
              />
              {/* Radial gradient glow overlay to blend with #0D1B2A page background */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#0D1B2A]/90 via-[#0D1B2A]/70 to-[#0D1B2A]/95" />
              <div className="absolute inset-0 bg-[#E8650A]/10 mix-blend-color" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight uppercase" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Describe Your Getaway
                </h2>
                <p className="text-xs text-slate-350 leading-relaxed max-w-sm mx-auto font-mono">
                  Input your destination, duration, budget, and travel preferences. Our multi-agent orchestrator takes care of the details.
                </p>
              </div>

              <textarea 
                value={demoInput}
                onChange={e => setDemoInput(e.target.value)}
                placeholder="Plan a 7-day road trip from California to Yosemite, under $2500, focusing on cozy cabins and scenic hikes..."
                rows={4}
                className="w-full rounded-2xl resize-none outline-none text-xs md:text-sm leading-relaxed p-5 border border-slate-805 bg-slate-950/70 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623]/25 transition-all font-sans text-slate-100"
              />

              {/* Quick prefill tags */}
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { emoji: '🏕️', label: 'Yosemite Cabin Adventure' },
                  { emoji: '🌸', label: 'Kyoto Nagano Explorer' },
                  { emoji: '🐪', label: 'Sahara Desert Merzouga' },
                  { emoji: '🏔️', label: 'Swiss Alps Sanctuary' }
                ].map((tag, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setDemoInput(`Plan a trip details: ${tag.label} — arrange travel plans, local hotels and detailed routes`)}
                    className="px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-300 border border-slate-800 bg-slate-950/80 hover:border-[#F5A623] hover:text-[#F5A623] transition-all cursor-pointer font-mono">
                    {tag.emoji} {tag.label}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleDemoGenerate}
                  className="w-full py-4 rounded-xl text-white font-bold text-xs tracking-widest uppercase transition-all shadow-lg flex items-center justify-center gap-2 group cursor-pointer bg-[#E8650A] hover:bg-[#E8650A]/90 hover:shadow-[0_0_20px_rgba(232,101,10,0.4)]"
                >
                  <span>Generate Travel Plan</span>
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* ── THE ORCHESTRATION PROCESS ── */}
        <section className="space-y-12 reveal-on-scroll">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono">Behind the Scenes</span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Four Agents. One Perfect Plan.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 01 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 shadow-sm border border-slate-800 flex flex-col justify-between min-h-[180px] hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <span className="text-[9px] font-bold tracking-widest text-[#F5A623] font-mono">Step 01</span>
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#F5A623] flex items-center justify-center">
                  <Plane size={18} />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Flight Orchestrator</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fetches live routing coordinates via AviationStack and filters options by date, duration, and target budget.
                </p>
              </div>
            </div>

            {/* Step 02 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 shadow-sm border border-slate-800 flex flex-col justify-between min-h-[180px] hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <span className="text-[9px] font-bold tracking-widest text-[#F5A623] font-mono">Step 02</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <Hotel size={18} />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Accommodation Researcher</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Scans accommodations using Tavily web query filters, matching budget caps and visual styles.
                </p>
              </div>
            </div>

            {/* Step 03 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 shadow-sm border border-slate-800 flex flex-col justify-between min-h-[180px] hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <span className="text-[9px] font-bold tracking-widest text-[#F5A623] font-mono">Step 03</span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <CalendarDays size={18} />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Day Route Scheduler</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Draws map points and compiles schedules featuring local restaurants, stops, and coordinates.
                </p>
              </div>
            </div>

            {/* Step 04 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 shadow-sm border border-slate-800 flex flex-col justify-between min-h-[180px] hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <span className="text-[9px] font-bold tracking-widest text-[#F5A623] font-mono">Step 04</span>
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Critic Auditor</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Performs a sanity check on dates, budgets, routing distances, and outputs a formatted plan.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer className="border-t border-slate-150 bg-slate-900/60 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none" className="text-slate-800">
              <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" />
              <ellipse cx="14" cy="14" rx="5.5" ry="12" stroke="currentColor" strokeWidth="2" />
              <line x1="2" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="2" />
              <line x1="14" y1="2" x2="14" y2="26" stroke="currentColor" strokeWidth="2" />
            </svg>
            <div>
              <span className="font-extrabold text-xs uppercase tracking-widest text-white block leading-tight font-mono">
                Globe Express
              </span>
              <span className="text-[9px] font-medium text-slate-400">AI-native travel agency</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {['Home', 'Planner', 'Dashboard', 'Terms'].map(link => (
              <a 
                key={link} 
                href="#"
                onClick={(e) => { e.preventDefault(); if (link === 'Planner') navigate('/planner'); else if (link==='Dashboard') navigate('/my-trips'); }}
                className="text-[10px] font-bold tracking-widest text-slate-400 hover:text-white uppercase transition-colors">
                {link}
              </a>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 font-mono">
            FastAPI · LangGraph · AviationStack · Tavily · Render.com
          </p>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-4 text-center">
          <p className="text-[9px] text-slate-400">© 2025 Globe Express / TripMate AI. All rights reserved.</p>
        </div>
      </footer>

      {/* Embedded CSS rules for the slider progress bar */}
      <style>{`
        @keyframes progressFill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
