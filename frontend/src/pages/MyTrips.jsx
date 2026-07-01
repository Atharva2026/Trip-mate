import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Trash2, 
  Share2, 
  ExternalLink, 
  AlertCircle, 
  MapPin, 
  Calendar, 
  ArrowLeft,
  Lock,
  Unlock,
  Plus
} from 'lucide-react';

export default function MyTrips() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("tripmate_token"));
  
  // Auth state
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(null);
  
  // Trips state
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load trips when authenticated
  useEffect(() => {
    if (token) {
      fetchTrips();
    }
  }, [token]);

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/trips', {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        if (response.status === 401) {
          // Token expired or invalid
          handleLogout();
        }
        throw new Error(data.error || "Failed to fetch saved trips.");
      }
      
      setTrips(data.trips || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(null);
    
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.error || "Authentication failed.");
      }
      
      localStorage.setItem("tripmate_token", data.token);
      localStorage.setItem("tripmate_user", JSON.stringify(data.user));
      setToken(data.token);
      
      // Clear inputs
      setEmail("");
      setPassword("");
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("tripmate_token");
    localStorage.removeItem("tripmate_user");
    setToken(null);
    setTrips([]);
  };

  const handleDelete = async (tripId) => {
    if (!confirm("Are you sure you want to delete this travel plan?")) return;
    
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete trip plan.");
      }
      
      // Remove locally
      setTrips(trips.filter(t => t.id !== tripId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleShare = async (tripId, currentStatus) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/share`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ is_public: !currentStatus })
      });
      
      if (!response.ok) {
        throw new Error("Failed to update sharing settings.");
      }
      
      // Update local state
      setTrips(trips.map(t => t.id === tripId ? { ...t, is_public: !currentStatus } : t));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleShareClick = (tripId) => {
    const url = `${window.location.origin}/plan/${tripId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert(`Copied sharing link to clipboard:\n${url}`);
    });
  };

  return (
    <div className="relative min-h-screen bg-[#0D1B2A] text-slate-200 font-sans pb-12 flex flex-col">
      {/* Background glow animations */}
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

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/planner')}
              className="custom-btn custom-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Go to Planner
            </button>
            {token && (
              <button 
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
              >
                Log Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-6 pt-8 space-y-6">
        
        {/* If NOT Authenticated: Show Auth Gateway Wall */}
        {!token ? (
          <div className="max-w-4xl mx-auto pt-4 grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Aesthetic Panel with Camper Van Nature Image */}
            <div className="md:col-span-5 relative rounded-2xl overflow-hidden min-h-[260px] md:min-h-full border border-[#F5A623]/25 shadow-xl bg-slate-900 flex flex-col justify-end p-8 group">
              <img 
                src="/no-internet-nature.jpg" 
                alt="Throw your phone away and find a spot in nature" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/40 to-transparent z-[1]" />
              <div className="absolute inset-0 bg-[#E8650A]/10 mix-blend-color z-[1]" />
              
              <div className="relative z-10 space-y-2">
                <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono block">Offline Wanderlust</span>
                <h3 className="text-lg font-bold text-white uppercase leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Find Your Sanctuary
                </h3>
                <p className="text-[10px] text-slate-350 leading-relaxed">
                  Disconnect to reconnect. Keep all your nature and travel schedules stored safely under one account.
                </p>
              </div>
            </div>

            {/* Right Auth Form */}
            <div className="md:col-span-7 flex flex-col justify-center">
              <div className="space-y-6">
                <div className="text-left space-y-2">
                  <h2 className="text-2xl font-bold text-white uppercase tracking-tight font-mono">Save & Sync Your Trips</h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Create a secure account to save itineraries, configure visibility options, and share links.
                  </p>
                </div>

                {/* Auth Form Card */}
                <div className="p-6 md:p-8 glass-panel border border-[#F5A623]/20 bg-slate-900/60 shadow-2xl rounded-2xl">
                  <form onSubmit={handleAuth} className="space-y-4">
                    {authError && (
                      <div className="p-3 rounded-lg border border-red-500/20 bg-red-950/20 text-xs text-red-400 font-mono">
                        {authError}
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full custom-textarea min-h-[48px] focus:border-[#F5A623]"
                        style={{ resize: 'none', height: '48px', padding: '12px 16px' }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">Password</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full custom-textarea min-h-[48px] focus:border-[#F5A623]"
                        style={{ resize: 'none', height: '48px', padding: '12px 16px' }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full custom-btn py-3 font-semibold text-xs mt-2 text-white cursor-pointer"
                    >
                      {isRegister ? 'Create Account' : 'Sign In'}
                    </button>
                  </form>

                  {/* Toggle registering */}
                  <div className="text-center mt-4">
                    <button
                      onClick={() => {
                        setIsRegister(!isRegister);
                        setAuthError(null);
                      }}
                      className="text-xs text-[#F5A623] hover:text-[#d38b19] font-bold transition-colors cursor-pointer bg-transparent border-none"
                    >
                      {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Authenticated Dashboard View */
          <div className="space-y-8 animate-fade-in">
            
            {/* Welcoming Top Hero Grid Card */}
            <div className="relative rounded-2xl overflow-hidden min-h-[160px] border border-[#F5A623]/25 shadow-lg bg-slate-900 p-8 flex flex-col justify-end">
              <img src="/cabin-lake.jpg" alt="Lake Cabin" className="absolute inset-0 w-full h-full object-cover object-bottom" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0D1B2A] via-[#0D1B2A]/50 to-transparent" />
              <div className="relative z-10 max-w-sm space-y-1.5">
                <span className="text-[9px] font-bold text-[#F5A623] uppercase tracking-widest font-mono block">Welcome back, wanderer</span>
                <h3 className="text-xl md:text-2xl font-bold text-white uppercase leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Your Saved Sanctuary
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Manage, delete, or generate sharing links for your itineraries. Access them anytime from anywhere.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight font-mono">My Saved Trips</h2>
              </div>
              
              <button 
                onClick={() => navigate('/planner')}
                className="custom-btn px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 text-white cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Plan Trip
              </button>
            </div>

            {/* List saved trips */}
            {loading ? (
              <div className="py-24 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-[#E8650A] border-t-transparent animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500 font-mono">Retrieving saved trips list...</p>
              </div>
            ) : error ? (
              <div className="py-24 text-center space-y-2">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                <h4 className="font-semibold text-red-400 text-sm">Failed to Load Saved Plans</h4>
                <p className="text-xs text-red-400 font-mono">{error}</p>
              </div>
            ) : trips.length === 0 ? (
              <div className="py-24 text-center space-y-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20 shadow-sm">
                <MapPin className="w-12 h-12 text-slate-600 mx-auto" />
                <div>
                  <h4 className="font-bold text-white text-sm">No Saved Itineraries Found</h4>
                  <p className="text-xs text-slate-450 mt-1 max-w-xs mx-auto font-mono">
                    Plans generated while logged in will automatically appear here.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/planner')}
                  className="custom-btn px-6 py-2.5 text-xs font-semibold mx-auto text-white cursor-pointer"
                >
                  Create Your First Trip
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left side: Trips list */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trips.map((trip) => (
                    <div
                      key={trip.id}
                      className="p-5 glass-panel border border-slate-800 bg-slate-900/40 hover:shadow-xl flex flex-col justify-between min-h-[160px] transition-all duration-300 rounded-2xl"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {trip.id.slice(0, 8)}
                          </span>
                          
                          <button
                            onClick={() => handleToggleShare(trip.id, trip.is_public)}
                            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all duration-200 cursor-pointer ${
                              trip.is_public
                                ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            {trip.is_public ? (
                              <>
                                <Unlock className="w-3 h-3 text-emerald-500" />
                                <span>Public</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span>Private</span>
                              </>
                            )}
                          </button>
                        </div>

                        <h4 
                          onClick={() => navigate(`/plan/${trip.id}`)}
                          className="font-bold text-white text-sm hover:text-[#F5A623] cursor-pointer transition-colors"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          {trip.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-mono">
                          "{trip.query}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-800 pt-3.5 mt-4 text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#F5A623]" />
                          {new Date(trip.created_at).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-1">
                          {trip.is_public && (
                            <button
                              onClick={() => handleShareClick(trip.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all duration-150 cursor-pointer"
                              title="Copy sharing link"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/plan/${trip.id}`)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all duration-150 cursor-pointer"
                            title="Open plan details"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(trip.id)}
                            className="p-1.5 rounded-lg hover:bg-red-950/20 text-slate-400 hover:text-red-400 transition-all duration-150 cursor-pointer"
                            title="Delete plan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right side: Nature Camper Van Philosophy Card */}
                <div className="lg:col-span-4 relative rounded-2xl overflow-hidden border border-[#F5A623]/25 bg-slate-900 p-6 flex flex-col justify-end min-h-[340px] shadow-lg group">
                  {/* Image background layer */}
                  <img 
                    src="/no-internet-nature.jpg" 
                    alt="Camper Van Under Twilight Stars" 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                  />
                  {/* Blending gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/40 to-transparent z-[1]" />
                  <div className="absolute inset-0 bg-[#E8650A]/10 mix-blend-color z-[1]" />
                  
                  {/* floating hover animation text container */}
                  <div className="relative z-10 space-y-2 transform transition-transform duration-300 group-hover:translate-y-[-4px]">
                    <span className="text-[9px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono block">Offline Sanctuary</span>
                    <h4 className="text-base font-bold text-white uppercase leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Wander Wisely
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                      Throw your phone away. Find a spot in nature. Enjoy the silence.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
