import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles, MapPin } from 'lucide-react';

const STEPS = [
  {
    title: "Destination & Travelers",
    subtitle: "Where are you heading, and who is joining?"
  },
  {
    title: "Trip Vibe & Style",
    subtitle: "What is the primary theme of your getaway?"
  },
  {
    title: "Travel Pace",
    subtitle: "How packed do you want your schedule to be?"
  },
  {
    title: "Budget Tier",
    subtitle: "How much are you planning to spend?"
  },
  {
    title: "Interests & Nationality",
    subtitle: "Tailor activities and verify visa awareness"
  }
];

const COMPANIONS = [
  { id: 'solo', label: 'Solo 🧳', desc: 'Independent explorer' },
  { id: 'couple', label: 'Couple 💑', desc: 'Romantic getaway' },
  { id: 'family', label: 'Family 👨‍👩‍👧‍👦', desc: 'Kid-friendly pace' },
  { id: 'friends', label: 'Friends 👯', desc: 'Social adventure' },
  { id: 'group', label: 'Group 🎉', desc: 'Coordinated party' }
];

const VIBES = [
  { id: 'adventure', label: 'Adventure 🏔️', desc: 'Thrills, hikes, and nature' },
  { id: 'cultural', label: 'Cultural 🏛️', desc: 'History, museums, and local art' },
  { id: 'spiritual', label: 'Spiritual 🙏', desc: 'Temples, shrines, and peace' },
  { id: 'beach', label: 'Beach 🏖️', desc: 'Sun, sand, and relaxation' },
  { id: 'city', label: 'City Explorer 🌆', desc: 'Urban walks and shopping' },
  { id: 'mixed', label: 'Mixed 🌍', desc: 'A balance of everything' }
];

const PACES = [
  { id: 'relaxed', label: 'Relaxed 🛋️', desc: '2-3 activities per day' },
  { id: 'moderate', label: 'Moderate 🚶', desc: '4-5 activities per day' },
  { id: 'packed', label: 'Packed 🏃', desc: '6+ activities, active schedule' }
];

const BUDGETS = [
  { id: 'budget', label: 'Budget 💰', desc: 'Affordable hostels & local foods' },
  { id: 'mid_range', label: 'Mid-Range 💳', desc: 'Boutique stays & balanced plans' },
  { id: 'luxury', label: 'Luxury ✨', desc: 'Premium hotels & fine dining' }
];

const INTERESTS = [
  "Food & Street Eats", "Nightlife", "Photography", "History & Heritage", 
  "Shopping", "Nature & Hiking", "Water Sports", "Temples & Shrines", 
  "Museums & Art", "Local Workshops"
];

export default function Questionnaire() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState("5");
  const [companions, setCompanions] = useState("solo");
  const [vibe, setVibe] = useState("mixed");
  const [pace, setPace] = useState("moderate");
  const [budget, setBudget] = useState("mid_range");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [nationality, setNationality] = useState("");

  const handleInterestToggle = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && !destination.trim()) {
      alert("Please enter a destination to proceed.");
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitQuestionnaire();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/');
    }
  };

  const submitQuestionnaire = () => {
    // Construct rich natural language prompt
    let prompt = `Plan a complete ${days} days trip to ${destination}. `;
    prompt += `I am traveling as a ${companions} traveler. `;
    prompt += `The trip style is ${vibe} with a ${pace} pace. `;
    prompt += `My budget tier is ${budget}. `;
    if (selectedInterests.length > 0) {
      prompt += `I am highly interested in: ${selectedInterests.join(', ')}. `;
    }
    if (nationality.trim()) {
      prompt += `Include visa guidelines for a passport holder of ${nationality}.`;
    }

    // Build travel context object
    const context = {
      companions,
      budget_tier: budget,
      trip_type: vibe,
      pace,
      destination,
      interests: selectedInterests,
      days,
      nationality
    };

    // Redirect to planner with parameters prefilled
    navigate('/planner', { 
      state: { 
        prefilledPrompt: prompt,
        travelContext: context
      } 
    });
  };

  return (
    <div className="relative min-h-screen flex flex-col font-sans text-slate-200 bg-[#0D1B2A] pb-12">
      {/* Background glow effects */}
      <div className="background-glows">
        <div className="glow-1"></div>
        <div className="glow-2"></div>
        <div className="glow-3"></div>
      </div>

      {/* Main container with side-by-side split layout */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 pt-12 pb-16 w-full">
        
        {/* Navigation / Header */}
        <div className="w-full flex items-center justify-between mb-8 text-xs text-slate-400 font-bold tracking-wide uppercase font-mono">
          <div className="flex items-center gap-1.5 text-[#F5A623]">
            <Sparkles className="w-4 h-4 text-[#F5A623] animate-pulse" />
            <span>Wizard Step {currentStep + 1} of {STEPS.length}</span>
          </div>
          <span>{STEPS[currentStep].title}</span>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT COLUMN: Passport Aesthetic Image Card */}
          <div className="lg:col-span-5 relative rounded-2xl overflow-hidden min-h-[250px] lg:min-h-full border border-rgba(245, 166, 35, 0.15) shadow-xl bg-slate-900 flex flex-col justify-end p-8 group">
            <img 
              src="/passport-love.jpg" 
              alt="All you need is love and a passport" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
            {/* Ambient golden hour gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/40 to-transparent z-[1]" />
            <div className="absolute inset-0 bg-[#E8650A]/10 mix-blend-color z-[1]" />
            
            <div className="relative z-10 space-y-2">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono block">Adventure awaits</span>
              <h3 className="text-xl font-bold text-white uppercase leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                Curate Your Journey
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
                Answer a few quick questions about your style, pace, and budget, and let our agents formulate your passport-ready schedule.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: The Multi-Step Questionnaire Form Card */}
          <div className="lg:col-span-7 p-6 md:p-8 glass-panel border border-[#F5A623]/20 bg-slate-900/60 rounded-2xl flex flex-col justify-between shadow-2xl relative">
            
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-white leading-tight uppercase font-mono tracking-tight">
                  {STEPS[currentStep].title}
                </h2>
                <p className="text-xs text-[#F5A623] mt-1 font-medium font-mono">
                  {STEPS[currentStep].subtitle}
                </p>
              </div>

              {/* Step 1 Content */}
              {currentStep === 0 && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Where is your destination?
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. Kyoto, Japan or Rome, Italy"
                        className="w-full custom-textarea min-h-[50px] pl-11 focus:border-[#F5A623]"
                        style={{ resize: 'none', height: '50px', padding: '12px 16px 12px 44px' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      className="w-full custom-textarea min-h-[50px] focus:border-[#F5A623]"
                      style={{ resize: 'none', height: '50px', padding: '12px 16px' }}
                    />
                  </div>
                </div>
              )}

              {/* Step 2 Content */}
              {currentStep === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {VIBES.map((vb) => (
                    <button
                      key={vb.id}
                      onClick={() => setVibe(vb.id)}
                      className={`p-4 border rounded-xl text-left text-xs transition-all duration-200 ${
                        vibe === vb.id
                          ? 'bg-[#F5A623]/10 border-[#F5A623] text-[#F5A623] shadow-sm font-semibold'
                          : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80 text-slate-300'
                      }`}
                    >
                      <p className="font-bold">{vb.label}</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">{vb.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 3 Content */}
              {currentStep === 2 && (
                <div className="flex flex-col gap-3 pt-2">
                  {PACES.map((pc) => (
                    <button
                      key={pc.id}
                      onClick={() => setPace(pc.id)}
                      className={`p-4 border rounded-xl text-left text-xs transition-all duration-200 flex items-center justify-between ${
                        pace === pc.id
                          ? 'bg-[#F5A623]/10 border-[#F5A623] text-[#F5A623] shadow-sm font-semibold'
                          : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80 text-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{pc.label}</p>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal">{pc.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 4 Content */}
              {currentStep === 3 && (
                <div className="flex flex-col gap-3 pt-2">
                  {BUDGETS.map((bd) => (
                    <button
                      key={bd.id}
                      onClick={() => setBudget(bd.id)}
                      className={`p-4 border rounded-xl text-left text-xs transition-all duration-200 flex items-center justify-between ${
                        budget === bd.id
                          ? 'bg-[#F5A623]/10 border-[#F5A623] text-[#F5A623] shadow-sm font-semibold'
                          : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80 text-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{bd.label}</p>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal">{bd.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 5 Content */}
              {currentStep === 4 && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Select your Interests
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {INTERESTS.map((interest, idx) => {
                        const isSelected = selectedInterests.includes(interest);
                        return (
                          <button
                            key={idx}
                            onClick={() => handleInterestToggle(interest)}
                            className={`px-3.5 py-2 rounded-xl border text-xs transition-all duration-150 ${
                              isSelected
                                ? 'bg-[#F5A623]/15 border-[#F5A623] text-[#F5A623] font-bold shadow-sm'
                                : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80'
                            }`}
                          >
                            {interest}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Nationality / Passport Country
                    </label>
                    <input
                      type="text"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      placeholder="e.g. Bangladesh, United States"
                      className="w-full custom-textarea min-h-[50px] focus:border-[#F5A623]"
                      style={{ resize: 'none', height: '50px', padding: '12px 16px' }}
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Stepper Navigation buttons */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-6">
              <button
                onClick={handlePrev}
                className="flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                onClick={handleNext}
                className="custom-btn py-2.5 px-6 text-xs font-semibold flex items-center gap-1.5 text-white"
              >
                <span>{currentStep === STEPS.length - 1 ? 'Build Travel Plan' : 'Continue'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
