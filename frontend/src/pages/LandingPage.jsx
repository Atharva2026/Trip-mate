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

const QUIZ_QUESTIONS = [
  {
    key: 'vibe',
    title: "What's the vibe you're chasing?",
    subtitle: "Select the atmosphere that matches your wanderlust",
    options: [
      { value: 'relax', label: 'Relax & recharge', emoji: '🧘' },
      { value: 'adventure', label: 'Adventure & outdoors', emoji: '⛰️' },
      { value: 'culture', label: 'Culture & history', emoji: '⛩️' },
      { value: 'party', label: 'Party & nightlife', emoji: '🎉' },
      { value: 'romance', label: 'Romance', emoji: '💖' },
      { value: 'family', label: 'Family fun', emoji: '🎡' }
    ]
  },
  {
    key: 'companion',
    title: "Who are you travelling with?",
    subtitle: "Travel size shapes the local pacing and hotel choices",
    options: [
      { value: 'solo', label: 'Solo Traveler', emoji: '🎒' },
      { value: 'couple', label: 'Couple', emoji: '👩‍❤️‍👨' },
      { value: 'friends', label: 'Friends Group', emoji: '🍻' },
      { value: 'kids', label: 'Family with kids', emoji: '👶' },
      { value: 'nokids', label: 'Family without kids', emoji: '👨‍👩‍👧' }
    ]
  },
  {
    key: 'budget',
    title: "What's your total budget per person?",
    subtitle: "Helps us filter geographical tiers and travel costs",
    options: [
      { value: 'under30k', label: 'Under ₹30,000', emoji: '💳' },
      { value: '30k-75k', label: '₹30k – ₹75k', emoji: '💵' },
      { value: '75k-1.5L', label: '₹75k – ₹1.5L', emoji: '💸' },
      { value: '1.5L-3L', label: '₹1.5L – ₹3L', emoji: '💰' },
      { value: '3Lplus', label: '₹3L+', emoji: '💎' }
    ]
  },
  {
    key: 'duration',
    title: "How long is your trip?",
    subtitle: "Time shapes distance and scheduling depth",
    options: [
      { value: 'weekend', label: 'Weekend (2–3 days)', emoji: '⏰' },
      { value: 'short', label: 'Short (4–6 days)', emoji: '📅' },
      { value: 'oneweek', label: 'One week', emoji: '✈️' },
      { value: 'twoweeks', label: '2 weeks', emoji: '🌍' },
      { value: 'month', label: '1 month+', emoji: '🧭' }
    ]
  },
  {
    key: 'dealbreaker',
    title: "What's one thing that would make or break this trip?",
    subtitle: "The ultimate tiebreaker filter for matching regions",
    options: [
      { value: 'beach', label: 'Must have beach', emoji: '🏖️' },
      { value: 'mountains', label: 'Must have mountains', emoji: '🏔️' },
      { value: 'streetfood', label: 'Must have street food scene', emoji: '🍜' },
      { value: 'safesolo', label: 'Must be safe for solo woman', emoji: '🛡️' },
      { value: 'hiking', label: 'Must have good hiking', emoji: '🥾' },
      { value: 'luxury', label: 'Must have luxury hotels', emoji: '🏨' },
      { value: 'english', label: 'Must be English-friendly', emoji: '🗣️' },
      { value: 'visa', label: 'Must have visa on arrival', emoji: '🛂' }
    ]
  }
];

const calculateDestination = (ans) => {
  const vibe = (ans.vibe || "").toLowerCase();
  const companion = (ans.companion || "").toLowerCase();
  const budget = ans.budget || "";
  const duration = ans.duration || "";
  const dealbreaker = (ans.dealbreaker || "").toLowerCase();

  if (vibe.includes("romance") || dealbreaker.includes("luxury")) {
    return {
      name: "Marrakech, Morocco",
      desc: "A sensory wanderlust of private candlelit courtyards, luxury riads, and amber dunes under infinite starry skies.",
      img: "/slide-morocco.jpg",
      query: "Plan a luxury 7-day romantic honeymoon in Marrakech, Morocco, staying in a premium riad with desert camel tours."
    };
  }

  if (vibe.includes("adventure") || dealbreaker.includes("hiking") || dealbreaker.includes("mountains")) {
    if (budget.includes("1.5L") || budget.includes("3L") || budget.includes("75k")) {
      return {
        name: "Switzerland Alps",
        desc: "Untouched snow peaks, deep valleys, and majestic alpine trails. The peak of mountain trekking and outdoor luxury.",
        img: "/slide-switzerland.jpg",
        query: "Plan a 10-day alpine hiking retreat in Saint Antönien, Switzerland, focusing on valley trails and chalet stays."
      };
    } else {
      return {
        name: "Yosemite, USA",
        desc: "Giant granite domes, sequoia forests, and roaring rivers. Best for campers, van life, and mountain road trips.",
        img: "/slide-yosemite.jpg",
        query: "Plan a road trip with camper van campgrounds and scenic hikes in Yosemite National Park."
      };
    }
  }

  if (vibe.includes("culture") || vibe.includes("history") || dealbreaker.includes("streetfood")) {
    return {
      name: "Kyoto & Nagano, Japan",
      desc: "Charming wooden shrines, red pagoda leaves, and historic mountain temples. The perfect blend of heritage and street food.",
      img: "/slide-nagano.jpg",
      query: "Plan a cultural 7-day holiday in Kyoto and Nagano, focusing on historic temples and local street food tours."
    };
  }

  if (vibe.includes("party") || vibe.includes("nightlife") || dealbreaker.includes("beach")) {
    return {
      name: "Los Lances Beach, Spain",
      desc: "Golden coastlines where high winds and ocean waves meet world-famous sunset beach club parties.",
      img: "/slide-spain.jpg",
      query: "Plan a 5-day holiday in Tarifa, Spain, focusing on beaches, windsurfing, and evening parties."
    };
  }

  return {
    name: "Marrakech, Morocco",
    desc: "A sensory wanderlust of private candlelit courtyards, luxury riads, and amber dunes under infinite starry skies.",
    img: "/slide-morocco.jpg",
    query: "Plan a luxury 7-day romantic honeymoon in Marrakech, Morocco, staying in a premium riad with desert camel tours."
  };
};

// Magnetic button hook helper
function useMagneticButton() {
  const ref = useRef(null);

  useEffect(() => {
    const btn = ref.current;
    if (!btn) return;

    const handleMouseMove = (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Calculate distance from center
      const dist = Math.sqrt(x * x + y * y);
      if (dist < 80) { // activation radius
        // Interpolate offset up to 8px
        const pullX = (x / (rect.width / 2)) * 8;
        const pullY = (y / (rect.height / 2)) * 8;
        btn.style.transform = `translate3d(${pullX}px, ${pullY}px, 0)`;
      } else {
        btn.style.transform = 'translate3d(0, 0, 0)';
      }
    };

    const handleMouseLeave = () => {
      btn.style.transform = 'translate3d(0, 0, 0)';
      btn.style.transition = 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    };

    const handleMouseEnter = () => {
      btn.style.transition = 'none';
    };

    btn.addEventListener('mousemove', handleMouseMove);
    btn.addEventListener('mouseleave', handleMouseLeave);
    btn.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      btn.removeEventListener('mousemove', handleMouseMove);
      btn.removeEventListener('mouseleave', handleMouseLeave);
      btn.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  return ref;
}

const DURATION = 8000;

export default function LandingPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [textVisible, setTextVisible] = useState(true);
  const [progressKey, setProgressKey] = useState(0);
  const [demoInput, setDemoInput] = useState('');

  // Magnetic button hooks
  const planNowRef = useMagneticButton();
  const generateRef = useMagneticButton();
  const planThisRef = useMagneticButton();

  // Typewriter states
  const [placeholder, setPlaceholder] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Globe Recommendation Quiz States
  const [quizStep, setQuizStep] = useState(1);
  const [quizAnswers, setQuizAnswers] = useState({
    vibe: '',
    companion: '',
    budget: '',
    duration: '',
    dealbreaker: ''
  });
  const [quizRecommendation, setQuizRecommendation] = useState(null);
  const [slideStatus, setSlideStatus] = useState('static'); // 'static', 'merging', 'active'
  const [selectedOptionVal, setSelectedOptionVal] = useState(null);

  const autoTimer = useRef(null);
  const scrollRef = useRef(null);

  const handleSelectOption = (key, value) => {
    setSelectedOptionVal(value);
    
    setTimeout(() => {
      const nextAnswers = { ...quizAnswers, [key]: value };
      setQuizAnswers(nextAnswers);
      setSelectedOptionVal(null);

      if (quizStep < 5) {
        setQuizStep(quizStep + 1);
      } else {
        const rec = calculateDestination(nextAnswers);
        setQuizRecommendation(rec);
        setQuizStep(6);
      }
    }, 280);
  };

  // Typewriter loop for empty/unfocused textarea placeholder
  useEffect(() => {
    if (isFocused || demoInput) {
      setPlaceholder("Describe your getaway...");
      return;
    }

    const PHRASES = [
      "Plan a 7-day road trip from California to Yosemite, under $2500, focusing on cozy cabins...",
      "Plan a 5-day romantic escape in the Swiss Alps, with budget hotels and quiet spots...",
      "Describe a 10-day cultural journey in Kyoto, Japan, with temple visits and sushi places...",
      "Create a weekend getaway package in Marrakech, Merzouga, under ₹50,000 per person..."
    ];

    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let timeoutId = null;

    const tick = () => {
      const currentPhrase = PHRASES[phraseIdx];
      
      if (!isDeleting) {
        setPlaceholder(currentPhrase.substring(0, charIdx + 1));
        charIdx++;
        
        if (charIdx === currentPhrase.length) {
          isDeleting = true;
          timeoutId = setTimeout(tick, 2000);
        } else {
          timeoutId = setTimeout(tick, 40);
        }
      } else {
        setPlaceholder(currentPhrase.substring(0, charIdx - 1));
        charIdx--;
        
        if (charIdx === 0) {
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % PHRASES.length;
          timeoutId = setTimeout(tick, 450);
        } else {
          timeoutId = setTimeout(tick, 25);
        }
      }
    };

    tick();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isFocused, demoInput]);

  // 3D tilt mouse handlers for cards
  const handleTiltMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    
    const rotateX = -((y - yc) / yc) * 6;
    const rotateY = ((x - xc) / xc) * 6;
    
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    card.style.transition = 'none';
  };

  const handleTiltMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
    card.style.transition = 'transform 450ms cubic-bezier(0.16, 1, 0.3, 1)';
  };

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

    setSlideStatus('merging');
    setCurrent(idx);
    setProgressKey(k => k + 1);

    setTimeout(() => {
      setSlideStatus('active');
    }, 40);

    setTimeout(() => {
      setTextVisible(true);
      setIsAnimating(false);
      setPrev(null);
      setSlideStatus('static');
    }, 950);
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

      {/* Film Grain Noise Overlay */}
      <div className="noise-overlay">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.03 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

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
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[100] bg-slate-900/10">
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
          {[
            { label: 'HOME', path: '/' },
            { label: 'HOLIDAYS', path: '/holidays' },
            { label: 'DESTINATIONS', path: '/destinations' },
            { label: 'FLIGHTS', path: '/flights' },
            { label: 'OFFERS', path: '/offers' },
            { label: 'CONTACTS', path: '/contacts' }
          ].map(link => (
            <a key={link.label} onClick={() => navigate(link.path)}
              className="text-[10px] font-bold tracking-[0.2em] text-white/80 hover:text-white uppercase transition-colors cursor-pointer">
              {link.label}
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
            ref={planNowRef}
            onClick={() => navigate('/planner')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase transition-all shadow-md cursor-pointer"
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
            className={`absolute inset-0 bg-center bg-cover z-0 ${slideStatus === 'merging' || slideStatus === 'active' ? 'slide-outgoing-bg slide-fade-out' : 'opacity-0'
              }`}
            style={{ backgroundImage: `url(${prevSlide.image})` }}
          />
        )}
        {/* Current background image */}
        <div
          className={`absolute inset-0 bg-center bg-cover z-0 ${slideStatus === 'merging' ? 'slide-incoming-bg' :
            slideStatus === 'active' ? 'slide-incoming-bg slide-merged-bg' : ''
            }`}
          style={{ backgroundImage: `url(${slide.image})` }}
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
                  className="flex items-center gap-2 px-6 py-3.5 rounded-full text-[10px] font-bold tracking-[0.2em] text-white uppercase transition-all bg-slate-900/10 hover:bg-slate-900/20 border border-white/30 backdrop-blur-md cursor-pointer">
                  <span>Discover Location</span>
                  <div className="w-6 h-6 rounded-full bg-[#F5A623] flex items-center justify-center">
                    <MapPin size={11} className="text-black" />
                  </div>
                </button>
              </div>
            </div>

            {/* Right side next cards queue */}
            <div className="hidden lg:block relative w-[422px] h-[190px] overflow-visible">
              {SLIDES.map((s) => {
                const relativeIndex = (s.id - current + SLIDES.length) % SLIDES.length;

                let leftPosition = 0;
                let scale = 1;
                let opacity = 0;
                let pointerEvents = 'auto';
                let zIndex = 0;

                if (relativeIndex === 1) {
                  leftPosition = 0;
                  scale = 1;
                  opacity = 1;
                  zIndex = 30;
                } else if (relativeIndex === 2) {
                  leftPosition = 146;
                  scale = 0.94;
                  opacity = 0.8;
                  zIndex = 20;
                } else if (relativeIndex === 3) {
                  leftPosition = 292;
                  scale = 0.88;
                  opacity = 0.55;
                  zIndex = 10;
                } else if (relativeIndex === 0) {
                  leftPosition = -146;
                  scale = 1.1;
                  opacity = 0;
                  pointerEvents = 'none';
                  zIndex = 40;
                } else {
                  leftPosition = 438;
                  scale = 0.8;
                  opacity = 0;
                  pointerEvents = 'none';
                  zIndex = 0;
                }

                return (
                  <div
                    key={s.id}
                    onClick={() => goTo(s.id)}
                    className="absolute top-0 w-[130px] h-[190px] rounded-xl overflow-hidden cursor-pointer group border border-white/10 hover:border-[#F5A623]/60 shadow-lg"
                    style={{
                      left: `${leftPosition}px`,
                      opacity: opacity,
                      transform: `scale(${scale})`,
                      pointerEvents: pointerEvents,
                      zIndex: zIndex,
                      transition: 'left 850ms cubic-bezier(0.16, 1, 0.3, 1), transform 850ms cubic-bezier(0.16, 1, 0.3, 1), opacity 850ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}>
                    <img src={s.image} alt={s.cardLabel} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <span className="absolute bottom-3 left-3 right-3 text-[8px] font-bold tracking-widest text-white uppercase line-clamp-1 font-mono">
                      {s.cardLabel}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Bottom controls & mouse down indicator */}
        <div className="absolute bottom-8 left-6 lg:left-12 right-6 lg:right-12 z-30 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <button onClick={back} className="w-10 h-10 rounded-full border border-white/30 hover:border-white/60 bg-slate-900/5 hover:bg-slate-900/15 text-white transition-all flex items-center justify-center cursor-pointer">
              <ChevronLeft size={16} />
            </button>
            <button onClick={next} className="w-10 h-10 rounded-full border border-white/30 hover:border-white/60 bg-slate-900/5 hover:bg-slate-900/15 text-white transition-all flex items-center justify-center cursor-pointer">
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
          <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#F5A623]/5 blur-[90px] animate-float-a" />
          <div className="absolute bottom-[20%] left-[5%] w-[450px] h-[450px] rounded-full bg-sky-500/5 blur-[90px] animate-float-b" />
        </div>

        {/* ── EDITORIAL STORY 1: CURATE YOUR ESCAPE (Split layout) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center reveal-on-scroll">
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono eyebrow-underline">Curated Escapes</span>
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
                className="flex items-center gap-2.5 px-6 py-3 rounded-full text-xs font-bold tracking-widest text-white uppercase transition-all shadow-md cursor-pointer"
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
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900/60 p-3 group reveal-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#F5A623]/10 to-transparent pointer-events-none rounded-3xl" />
              <img
                src="/hero-flatlay.png"
                alt="Travel Preparation Flatlay"
                className="w-full aspect-[4/3] object-cover rounded-2xl animate-slow-zoom-pan clip-reveal"
              />
              {/* Badge Overlay */}
              <div className="absolute top-6 left-6 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md shadow-sm border border-slate-800 text-[10px] font-bold tracking-widest text-slate-300 uppercase flex items-center gap-1.5 font-mono">
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
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900/60 p-3 group reveal-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-bl from-sky-500/5 to-transparent pointer-events-none rounded-3xl" />
              <img
                src="/travel-board.png"
                alt="Travel Mood Board"
                className="w-full aspect-[4/3] object-cover rounded-2xl animate-slow-zoom-pan clip-reveal"
              />
              <div className="absolute bottom-6 right-6 px-3.5 py-2 rounded-lg bg-slate-900/90 backdrop-blur-md shadow-sm text-[10px] font-bold tracking-widest text-slate-350 uppercase flex items-center gap-1.5 font-mono">
                <BookmarkCheck size={12} className="text-[#F5A623]" />
                <span>Inspiration Board</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#E8650A] uppercase font-mono eyebrow-underline">Visual Planning</span>
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
                className="flex items-center gap-2.5 px-6 py-3 rounded-full text-xs font-bold tracking-widest text-slate-200 bg-slate-900/60 hover:bg-slate-900/50 border border-slate-800 uppercase transition-all shadow-sm cursor-pointer">
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
            <div
              onMouseMove={handleTiltMouseMove}
              onMouseLeave={handleTiltMouseLeave}
              className="conic-border-card rounded-2xl overflow-hidden bg-slate-900/60 shadow-md border border-slate-800 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="relative overflow-hidden aspect-video">
                  <img src="/beach-sunset.png" alt="Coastal Escapes" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute top-3 left-3 px-2 py-1 rounded text-[8px] font-bold tracking-widest text-white uppercase bg-slate-900/85 backdrop-blur-sm font-mono">Beach</span>
                </div>
                <div className="p-6 space-y-2">
                  <h4 className="font-bold text-white text-sm">Coastal Escapes</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sunrise dunes, turquoise waters, and coastal villages. Discover ocean breeze retreats with live booking connections.
                  </p>
                </div>
              </div>
              <div className="p-6 pt-0">
                <button
                  onClick={() => navigate('/planner', { state: { prefill: 'Plan a 5-day beach holiday in Tarifa, Spain under €1000' } })}
                  className="w-full text-center py-2.5 rounded-lg text-[10px] font-bold tracking-wider text-[#F5A623] bg-[#F5A623]/10 hover:bg-[#F5A623]/20 transition-colors uppercase cursor-pointer">
                  Explore Beach Escapes
                </button>
              </div>
            </div>

            {/* Off-Grid Road Trip */}
            <div
              onMouseMove={handleTiltMouseMove}
              onMouseLeave={handleTiltMouseLeave}
              className="conic-border-card rounded-2xl overflow-hidden bg-slate-900/60 shadow-md border border-slate-800 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="relative overflow-hidden aspect-video">
                  <img src="/camper-van.png" alt="Off-Grid Adventure" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute top-3 left-3 px-2 py-1 rounded text-[8px] font-bold tracking-widest text-white uppercase bg-slate-900/85 backdrop-blur-sm font-mono">Off-Grid</span>
                </div>
                <div className="p-6 space-y-2">
                  <h4 className="font-bold text-white text-sm">Road Trips & Camping</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Camper van life, forest trails, and camps under twilight stars. Tailored for mountain passes and wild campgrounds.
                  </p>
                </div>
              </div>
              <div className="p-6 pt-0">
                <button
                  onClick={() => navigate('/planner', { state: { prefill: 'Plan a road trip with scenic camper campgrounds in Yosemite National Park' } })}
                  className="w-full text-center py-2.5 rounded-lg text-[10px] font-bold tracking-wider text-[#F5A623] bg-[#F5A623]/10 hover:bg-[#F5A623]/20 transition-colors uppercase cursor-pointer">
                  Explore Campgrounds
                </button>
              </div>
            </div>

            {/* Alpine Sanctuary */}
            <div
              onMouseMove={handleTiltMouseMove}
              onMouseLeave={handleTiltMouseLeave}
              className="conic-border-card rounded-2xl overflow-hidden bg-slate-900/60 shadow-md border border-slate-800 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="relative overflow-hidden aspect-video">
                  <img src="/slide-switzerland.jpg" alt="Alpine Sanctuary" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute top-3 left-3 px-2 py-1 rounded text-[8px] font-bold tracking-widest text-white uppercase bg-slate-900/85 backdrop-blur-sm font-mono">Alpine</span>
                </div>
                <div className="p-6 space-y-2">
                  <h4 className="font-bold text-white text-sm">Alpine Sanctuaries</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Traditional wooden chalets, deep valley stillness, and sky-high mountains. Best for hiking retreats and winter getaways.
                  </p>
                </div>
              </div>
              <div className="p-6 pt-0">
                <button
                  onClick={() => navigate('/planner', { state: { prefill: 'Plan an alpine hiking retreat in Saint Antönien, Switzerland' } })}
                  className="w-full text-center py-2.5 rounded-lg text-[10px] font-bold tracking-wider text-[#F5A623] bg-[#F5A623]/10 hover:bg-[#F5A623]/20 transition-colors uppercase cursor-pointer">
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
                placeholder={placeholder}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                rows={4}
                className="w-full rounded-2xl resize-none outline-none text-xs md:text-sm leading-relaxed p-5 border border-slate-800 bg-slate-950/70 transition-all font-sans text-slate-100 textarea-pulse-focus"
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
                  ref={generateRef}
                  onClick={handleDemoGenerate}
                  className="w-full py-4 rounded-xl text-white font-bold text-xs tracking-widest uppercase transition-all shadow-lg flex items-center justify-center gap-2 group cursor-pointer bg-[#E8650A] hover:bg-[#E8650A]/90 hover:shadow-[0_0_20px_rgba(232,101,10,0.4)] shimmer-btn"
                >
                  <span>Generate Travel Plan</span>
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

          </div>
        </section>







        {/* ── DESTINATION DISCOVERY QUIZ + SONAR RADAR ── */}
        <section className="reveal-on-scroll py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

            {/* Left Column: Quiz Panel */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#F5A623]/20 bg-[#F5A623]/5 text-[#F5A623] text-[9px] font-bold tracking-[0.25em] uppercase font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />
                  Destination Finder — AI Quiz
                </div>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Where Should<br />You Go Next?
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed font-mono max-w-sm">
                  Answer 5 short questions and our algorithm maps your personality to the perfect destination — watch the radar scan narrow it down live.
                </p>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map(step => (
                  <div
                    key={step}
                    className="h-[3px] rounded-full transition-all duration-500"
                    style={{
                      width: step <= quizStep ? '32px' : '12px',
                      background: step < quizStep ? '#F5A623' : step === quizStep ? '#E8650A' : '#1e293b',
                      boxShadow: step === quizStep ? '0 0 8px #E8650A, 0 0 15px rgba(232, 101, 10, 0.5)' : 'none'
                    }}
                  />
                ))}
                <span className="ml-2 text-[10px] font-mono text-slate-500">
                  {quizStep <= 5 ? `${quizStep}/5` : 'Done'}
                </span>
              </div>

              {quizStep <= 5 ? (
                /* Question View */
                <div className="space-y-5">
                  {(() => {
                    const q = QUIZ_QUESTIONS[quizStep - 1];
                    return (
                      <>
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono text-[#F5A623] uppercase tracking-widest">Q{quizStep} of 5</p>
                          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                            {q.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-mono">{q.subtitle}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          {q.options.map((option, idx) => (
                            <button
                              key={`${quizStep}-${option.value}`}
                              onClick={() => handleSelectOption(q.key, option.value)}
                              className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-[#0f172a] hover:border-[#E8650A]/50 hover:shadow-[0_0_14px_rgba(232,101,10,0.15)] transition-all cursor-pointer group/btn text-left quiz-option-btn ${
                                selectedOptionVal === option.value ? 'option-select-ripple' : ''
                              }`}
                              style={{ animationDelay: `${idx * 70}ms` }}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg">{option.emoji}</span>
                                <span className="text-xs font-semibold text-slate-300 group-hover/btn:text-white transition-colors">{option.label}</span>
                              </div>
                            </button>
                          ))}
                        </div>

                        {quizStep > 1 && (
                          <button
                            onClick={() => setQuizStep(quizStep - 1)}
                            className="text-[10px] font-bold text-slate-500 hover:text-white flex items-center gap-1.5 cursor-pointer uppercase font-mono"
                          >
                            ← Back
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                /* Result View */
                <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-900/40 bg-emerald-950/20 text-emerald-400 text-[9px] font-bold tracking-widest uppercase font-mono">
                    <svg className="w-2.5 h-2.5 text-emerald-400" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 6 L5 8.5 L9.5 3.5" className="draw-checkmark-path" />
                    </svg>
                    Target Acquired
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono block">Your Match</span>
                    <h3 className="text-3xl font-extrabold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                      {quizRecommendation?.name}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono max-w-sm">
                      {quizRecommendation?.desc}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      ref={planThisRef}
                      onClick={() => navigate('/planner', { state: { prefilledPrompt: quizRecommendation?.query } })}
                      className="px-6 py-3 rounded-xl bg-[#E8650A] hover:bg-[#E8650A]/90 hover:shadow-[0_0_20px_rgba(232,101,10,0.4)] text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 group shimmer-btn"
                    >
                      <span>Plan this Trip</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </button>
                    <button
                      onClick={() => {
                        setQuizStep(1);
                        setQuizAnswers({ vibe: '', companion: '', budget: '', duration: '', dealbreaker: '' });
                        setQuizRecommendation(null);
                      }}
                      className="px-6 py-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-950 text-slate-300 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer text-center"
                    >
                      Restart
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Futuristic Sonar Radar Terminal */}
            <div className="lg:col-span-5 flex justify-center relative">
              <div className="relative w-72 h-72">
                {/* Outer glow ring */}
                <div className="absolute inset-[-8px] rounded-full border border-[#E8650A]/10 animate-[spin_30s_linear_infinite]" />
                <div className="absolute inset-[-18px] rounded-full border border-[#F5A623]/5 animate-[spin_50s_linear_infinite_reverse]" />

                {/* Coordinate labels */}
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-600 tracking-widest">000°</span>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-600 tracking-widest">180°</span>
                <span className="absolute top-1/2 -left-8 -translate-y-1/2 text-[8px] font-mono text-slate-600 tracking-widest">270°</span>
                <span className="absolute top-1/2 -right-8 -translate-y-1/2 text-[8px] font-mono text-slate-600 tracking-widest">090°</span>

                {/* Radar circle body */}
                <div className="w-full h-full rounded-full border border-slate-800 bg-slate-950/90 shadow-[0_0_60px_rgba(232,101,10,0.12),inset_0_0_40px_rgba(0,0,0,0.8)] relative overflow-hidden flex items-center justify-center">

                  {/* Radial background gradient */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(245,166,35,0.03)_0%,_transparent_65%)] pointer-events-none" />

                  {/* SVG Radar Canvas */}
                  <svg className="w-full h-full absolute inset-0 z-10 pointer-events-none" viewBox="0 0 320 320">
                    <defs>
                      <radialGradient id="radarCenterGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#E8650A" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#E8650A" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="sweepFadeGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#F5A623" stopOpacity="0.55" />
                        <stop offset="85%" stopColor="#F5A623" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Concentric sonar rings */}
                    <circle cx="160" cy="160" r="30" stroke="#1e293b" strokeWidth="1" fill="none" opacity="0.5" />
                    <circle cx="160" cy="160" r="60" stroke="#1e293b" strokeWidth="1" fill="none" opacity="0.55" strokeDasharray="3 3" />
                    <circle cx="160" cy="160" r="95" stroke="#1e293b" strokeWidth="1" fill="none" opacity="0.6" />
                    <circle cx="160" cy="160" r="128" stroke="#1e293b" strokeWidth="1.5" fill="none" opacity="0.7" strokeDasharray="5 7" />
                    <circle cx="160" cy="160" r="148" stroke="#E8650A" strokeWidth="0.8" fill="none" opacity="0.2" />

                    {/* Crosshair dashed axes */}
                    <line x1="160" y1="10" x2="160" y2="310" stroke="#1e293b" strokeWidth="0.8" opacity="0.4" strokeDasharray="2 2" />
                    <line x1="10" y1="160" x2="310" y2="160" stroke="#1e293b" strokeWidth="0.8" opacity="0.4" strokeDasharray="2 2" />

                    {/* Cardinal tick marks */}
                    <line x1="160" y1="10" x2="160" y2="18" stroke="#475569" strokeWidth="1.5" opacity="0.7" />
                    <line x1="160" y1="302" x2="160" y2="310" stroke="#475569" strokeWidth="1.5" opacity="0.7" />
                    <line x1="10" y1="160" x2="18" y2="160" stroke="#475569" strokeWidth="1.5" opacity="0.7" />
                    <line x1="302" y1="160" x2="310" y2="160" stroke="#475569" strokeWidth="1.5" opacity="0.7" />

                    {/* 45° diagonal ticks */}
                    <line x1="55" y1="55" x2="61" y2="61" stroke="#334155" strokeWidth="1" opacity="0.5" />
                    <line x1="265" y1="55" x2="259" y2="61" stroke="#334155" strokeWidth="1" opacity="0.5" />
                    <line x1="55" y1="265" x2="61" y2="259" stroke="#334155" strokeWidth="1" opacity="0.5" />
                    <line x1="265" y1="265" x2="259" y2="259" stroke="#334155" strokeWidth="1" opacity="0.5" />

                    {/* Rotating sonar sweep group */}
                    <g className="radar-sweep-group">
                      {/* Sweep wedge arc (≈60° arc from top) */}
                      <path
                        d="M 160 160 L 160 12 A 148 148 0 0 1 244.2 42 Z"
                        fill="url(#sweepFadeGlow)"
                        opacity="0.6"
                      />
                      {/* Trailing Comet Lines */}
                      <line x1="160" y1="160" x2="139.4" y2="13.5" stroke="#F5A623" strokeWidth="1" opacity="0.25" />
                      <line x1="160" y1="160" x2="149.7" y2="12.4" stroke="#F5A623" strokeWidth="1.2" opacity="0.5" />

                      {/* Leading scan line */}
                      <line x1="160" y1="160" x2="160" y2="12" stroke="#F5A623" strokeWidth="1.5" opacity="0.9" />
                    </g>

                    {/* Sync’d Expanding Sonar Ping */}
                    <circle cx="160" cy="160" r="10" stroke="#E8650A" strokeWidth="1.5" fill="none" className="sonar-ping-ring" />

                    {/* Center amber glow disc */}
                    <circle cx="160" cy="160" r="30" fill="url(#radarCenterGlow)" />

                    {/* Flight Arcs (Dynamic Visibility) */}
                    {[
                      { key: "Morocco", cx: 105, cy: 130, steps: [1, 2] },
                      { key: "Alps", cx: 120, cy: 100, steps: [1, 2, 3] },
                      { key: "Yosemite", cx: 62, cy: 108, steps: [1, 2, 3, 4] },
                      { key: "Kyoto", cx: 218, cy: 122, steps: [1, 2, 3, 4] },
                      { key: "Spain", cx: 110, cy: 118, steps: [1, 2, 3, 4, 5] }
                    ].map((node, index) => {
                      let isActive = false;
                      if (quizStep <= 5) {
                        isActive = node.steps.includes(quizStep) || index % 3 === (quizStep % 3);
                      } else {
                        isActive = quizRecommendation?.name?.includes(node.key) ||
                          (quizRecommendation?.name?.includes("Switzerland") && node.key === "Alps");
                      }
                      const isChosen = quizStep > 5 && isActive;

                      return (
                        <g key={node.key} style={{ opacity: isActive ? 1 : 0.07, transition: 'opacity 700ms ease' }}>
                          <path
                            d={`M 160 160 Q ${(160 + node.cx) / 2} ${((160 + node.cy) / 2) - 38} ${node.cx} ${node.cy}`}
                            stroke={isChosen ? "#F5A623" : "#E8650A"}
                            strokeWidth={isChosen ? "2.5" : "1.2"}
                            fill="none"
                            className={isActive ? "flight-path-arc" : ""}
                          />
                          <circle
                            cx={node.cx}
                            cy={node.cy}
                            r={isChosen ? "5" : "3"}
                            fill={isChosen ? "#F5A623" : "#334155"}
                            className={isActive ? "globe-destination-marker" : ""}
                          />
                        </g>
                      );
                    })}

                    {/* Origin dot with ping */}
                    <circle cx="160" cy="160" r="4.5" fill="#E8650A" />
                    <circle cx="160" cy="160" r="12" stroke="#E8650A" strokeWidth="1" fill="none" className="animate-ping" style={{ animationDuration: '3s' }} />

                    {/* Destination pin (quiz complete) */}
                    {quizStep > 5 && quizRecommendation && (() => {
                      const pins = [
                        { key: "Alps", cx: 120, cy: 100, label: "Swiss Alps" },
                        { key: "Yosemite", cx: 62, cy: 108, label: "Yosemite" },
                        { key: "Kyoto", cx: 218, cy: 122, label: "Kyoto" },
                        { key: "Spain", cx: 110, cy: 118, label: "Spain" },
                        { key: "Morocco", cx: 105, cy: 130, label: "Morocco" }
                      ];
                      const pin = pins.find(p =>
                        quizRecommendation.name.includes(p.key) ||
                        (quizRecommendation.name.includes("Switzerland") && p.key === "Alps")
                      );
                      if (!pin) return null;
                      return (
                        <g>
                          <circle cx={pin.cx} cy={pin.cy} r="7" fill="#F5A623" />
                          <circle cx={pin.cx} cy={pin.cy} r="20" stroke="#F5A623" strokeWidth="1.5" fill="none" className="animate-ping" />
                          <text x={pin.cx} y={pin.cy - 16} fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                            {pin.label.toUpperCase()}
                          </text>
                        </g>
                      );
                    })()}
                  </svg>

                  {/* Center status readout */}
                  <div className="relative z-20 text-center pointer-events-none">
                    <p className="text-[7px] font-mono text-[#F5A623]/60 tracking-[0.3em] uppercase">
                      {quizStep <= 5 ? `Scanning Q${quizStep}` : 'Target Locked'}
                    </p>
                    <p className="text-[8px] font-mono text-slate-600 mt-0.5">
                      {quizStep <= 5 ? `${5 - quizStep + 1} signals remaining` : quizRecommendation?.name?.split(',')[0]}
                    </p>
                  </div>
                </div>
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

          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 01 */}
              <div
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between min-h-[180px] reveal-on-scroll step-card-hover"
                style={{ transitionDelay: '0ms' }}
              >
                <div className="space-y-4">
                  <span className="text-[9px] font-bold tracking-widest text-[#F5A623] font-mono">Step 01</span>
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center step-icon-container border border-slate-800 shadow-inner">
                    <img src="/slide-nagano.jpg" className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-[1px]" />
                    <div className="absolute inset-0 bg-[#0D1B2A]/40" />
                    <Plane size={18} className="relative z-10 text-[#F5A623]" />
                  </div>
                  <h4 className="font-bold text-white text-sm">Flight Orchestrator</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Fetches live routing coordinates via AviationStack and filters options by date, duration, and target budget.
                  </p>
                </div>
              </div>

              {/* Step 02 */}
              <div
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between min-h-[180px] reveal-on-scroll step-card-hover"
                style={{ transitionDelay: '120ms' }}
              >
                <div className="space-y-4">
                  <span className="text-[9px] font-bold tracking-widest text-[#F5A623] font-mono">Step 02</span>
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center step-icon-container border border-slate-800 shadow-inner">
                    <img src="/slide-switzerland.jpg" className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-[1px]" />
                    <div className="absolute inset-0 bg-[#0D1B2A]/40" />
                    <Hotel size={18} className="relative z-10 text-emerald-400" />
                  </div>
                  <h4 className="font-bold text-white text-sm">Accommodation Researcher</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Scans accommodations using Tavily web query filters, matching budget caps and visual styles.
                  </p>
                </div>
              </div>

              {/* Step 03 */}
              <div
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between min-h-[180px] reveal-on-scroll step-card-hover"
                style={{ transitionDelay: '240ms' }}
              >
                <div className="space-y-4">
                  <span className="text-[9px] font-bold tracking-widest text-[#F5A623] font-mono">Step 03</span>
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center step-icon-container border border-slate-800 shadow-inner">
                    <img src="/slide-morocco.jpg" className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-[1px]" />
                    <div className="absolute inset-0 bg-[#0D1B2A]/40" />
                    <CalendarDays size={18} className="relative z-10 text-amber-400" />
                  </div>
                  <h4 className="font-bold text-white text-sm">Day Route Scheduler</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Draws map points and compiles schedules featuring local restaurants, stops, and coordinates.
                  </p>
                </div>
              </div>

              {/* Step 04 */}
              <div
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between min-h-[180px] reveal-on-scroll step-card-hover"
                style={{ transitionDelay: '360ms' }}
              >
                <div className="space-y-4">
                  <span className="text-[9px] font-bold tracking-widest text-[#F5A623] font-mono">Step 04</span>
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center step-icon-container border border-slate-800 shadow-inner">
                    <img src="/slide-yosemite.jpg" className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-[1px]" />
                    <div className="absolute inset-0 bg-[#0D1B2A]/40" />
                    <Sparkles size={18} className="relative z-10 text-violet-400" />
                  </div>
                  <h4 className="font-bold text-white text-sm">Critic Auditor</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Performs a sanity check on dates, budgets, routing distances, and outputs a formatted plan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none" className="text-[#F5A623]">
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
                onClick={(e) => {
                  e.preventDefault();
                  if (link === 'Home') navigate('/');
                  else if (link === 'Planner') navigate('/planner');
                  else if (link === 'Dashboard') navigate('/my-trips');
                }}
                className="text-[10px] font-bold tracking-widest text-slate-400 hover:text-white uppercase transition-colors">
                {link}
              </a>
            ))}
          </div>

          <div className="w-56 marquee-container text-[10px] text-slate-500 font-mono select-none">
            <div className="marquee-content">
              <span>FastAPI · LangGraph · AviationStack · Tavily · Render.com ·&nbsp;</span>
              <span>FastAPI · LangGraph · AviationStack · Tavily · Render.com ·&nbsp;</span>
            </div>
          </div>
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
