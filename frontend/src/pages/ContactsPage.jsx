import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Mail, MessageCircle, Phone, Send, ChevronDown, ChevronUp, MapPin, ArrowRight } from 'lucide-react';

const FAQS = [
  { q: 'How does TripMate generate travel plans?', a: 'TripMate uses a multi-agent AI system powered by LangGraph. Four specialized agents — Flight Orchestrator, Hotel Researcher, Day Route Scheduler, and Critic Auditor — work in parallel to build your complete itinerary in under 30 seconds.' },
  { q: 'Is the flight data real-time?', a: 'Yes. We fetch live routing data from AviationStack API. When direct flights aren\'t available, our algorithm identifies optimal connecting routes through major transit hubs.' },
  { q: 'Can I save and share my travel plans?', a: 'Absolutely! Every generated plan can be saved to your account, downloaded as a PDF, or shared via a unique link that anyone can access.' },
  { q: 'What budget ranges do you support?', a: 'We support all budgets — from backpacker hostels under ₹30,000 to luxury resorts above ₹3L per person. Our hotel agent adapts recommendations based on your specified budget tier.' },
  { q: 'Do you book flights and hotels directly?', a: 'Currently, TripMate is a planning and recommendation tool. We provide detailed options with price estimates and direct you to booking platforms like Expedia, Booking.com, or airline websites for final booking.' },
  { q: 'Is my data private?', a: 'Yes. We don\'t store personal data beyond your saved trips. All travel plans are linked to your browser session and can be deleted at any time.' },
];

export default function ContactsPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

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
              className={`text-[10px] font-bold tracking-[0.2em] uppercase transition-colors cursor-pointer ${link.label === 'CONTACTS' ? 'text-[#F5A623]' : 'text-white/80 hover:text-white'}`}>
              {link.label}
            </a>
          ))}
        </nav>
        <button onClick={() => navigate('/planner')} className="px-5 py-2.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase bg-[#F5A623] text-white hover:bg-[#c39263] transition-all shadow-md">Plan Now</button>
      </header>

      {/* HERO */}
      <section className="relative w-full h-[55vh] overflow-hidden">
        <img src="/contacts-hero.png" alt="Get in Touch" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/60 to-[#0D1B2A]/30" />
        <div className="absolute bottom-16 left-6 lg:left-12 z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle size={14} className="text-[#F5A623]" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono">Support & Help</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Get in<br />Touch
          </h1>
          <p className="text-sm text-white/70 leading-relaxed max-w-sm">
            Questions about your trip? Need help with your plan? Our team is here for you.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-20 space-y-24">

        {/* CONTACT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 reveal-on-scroll">
          {[
            { icon: <Mail size={24} />, title: 'Email Us', detail: 'shahatharva20@gmail.com', sub: 'We respond within 24 hours' },
            { icon: <MessageCircle size={24} />, title: 'Live Chat', detail: 'Available 9am – 9pm IST', sub: 'Instant AI-assisted support' },
            { icon: <Phone size={24} />, title: 'Call Us', detail: '+91 98933*****', sub: 'Mon – Sat, 10am – 6pm' },
          ].map((card, idx) => (
            <div key={idx} className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-[#F5A623]/30 transition-all text-center space-y-4 group">
              <div className="w-14 h-14 rounded-2xl bg-[#E8650A]/10 text-[#E8650A] flex items-center justify-center mx-auto group-hover:bg-[#E8650A]/20 transition-colors">
                {card.icon}
              </div>
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{card.title}</h3>
              <p className="text-sm font-semibold text-[#F5A623]">{card.detail}</p>
              <p className="text-[10px] text-slate-500 font-mono">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* CONTACT FORM + MAP */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 reveal-on-scroll">
          {/* Form */}
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono">Send a Message</span>
              <h2 className="text-3xl font-extrabold text-white mt-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                We'd Love to Hear From You
              </h2>
            </div>

            {!sent ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder-slate-500 outline-none focus:border-[#F5A623] transition-colors"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-5 py-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder-slate-500 outline-none focus:border-[#F5A623] transition-colors"
                />
                <textarea
                  placeholder="Your Message..."
                  rows={5}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-5 py-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder-slate-500 outline-none focus:border-[#F5A623] transition-colors resize-none"
                />
                <button
                  onClick={() => { if (formData.name && formData.email && formData.message) setSent(true); }}
                  className="w-full py-4 rounded-xl bg-[#E8650A] hover:bg-[#E8650A]/90 text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <Send size={14} />
                  <span>Send Message</span>
                </button>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-emerald-950/30 border border-emerald-800/30 text-center space-y-3">
                <div className="text-3xl">✉️</div>
                <h3 className="text-lg font-bold text-emerald-400">Message Sent!</h3>
                <p className="text-xs text-slate-400">Thank you, {formData.name}. We'll get back to you within 24 hours.</p>
              </div>
            )}
          </div>

          {/* Office Info */}
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 p-6 space-y-6">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#F5A623] mt-1 shrink-0" />
                <div>
                  <h4 className="font-bold text-white text-sm">Headquarters</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    Globe Express AI Labs<br />
                    WeWork Galaxy, Residency Road<br />
                    Bangalore, Karnataka 560025<br />
                    India
                  </p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden aspect-[16/10] bg-slate-950 border border-slate-800">
                <img src="/contacts-hero.png" alt="Office" className="w-full h-full object-cover opacity-60" />
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {['Twitter', 'Instagram', 'LinkedIn', 'YouTube'].map(social => (
                <a key={social} href="#" className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-950/60 text-[9px] font-bold tracking-widest text-slate-400 hover:text-white hover:border-slate-600 uppercase transition-all cursor-pointer font-mono">
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <section className="space-y-8 reveal-on-scroll">
          <div className="text-center">
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono">FAQ</span>
            <h2 className="text-3xl font-extrabold text-white mt-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Frequently Asked Questions
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, idx) => (
              <div key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all hover:border-slate-700">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer">
                  <span className="text-sm font-semibold text-white pr-4">{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={16} className="text-[#F5A623] shrink-0" /> : <ChevronDown size={16} className="text-slate-500 shrink-0" />}
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4">
                    <p className="text-xs text-slate-400 leading-relaxed">{faq.a}</p>
                  </div>
                )}
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
