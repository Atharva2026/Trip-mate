import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser, useSignIn } from '@clerk/clerk-react';
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
  Plus,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';

export default function MyTrips() {
  const navigate = useNavigate();
  const { isSignedIn, userId, getToken, signOut } = useAuth();
  const { user } = useUser();
  const { signIn } = useSignIn();

  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  // Sync Clerk session with local states and local storage for planner quotas
  useEffect(() => {
    const syncClerkSession = async () => {
      if (isSignedIn) {
        try {
          const clerkToken = await getToken();
          setToken(clerkToken);
          const email = user?.primaryEmailAddress?.emailAddress || null;
          setUserEmail(email);
          
          localStorage.setItem("tripmate_token", clerkToken);
          localStorage.setItem("tripmate_user", JSON.stringify({
            email: email,
            name: user?.fullName || "Wanderer"
          }));
        } catch (e) {
          console.error("Error syncing Clerk session token", e);
        }
      } else {
        setToken(null);
        setUserEmail(null);
        localStorage.removeItem("tripmate_token");
        localStorage.removeItem("tripmate_user");
      }
    };
    syncClerkSession();
  }, [isSignedIn, user, getToken]);

  const handleGoogleSignIn = () => {
    if (!signIn) return;
    try {
      signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: window.location.origin + "/my-trips",
        redirectUrlComplete: window.location.origin + "/my-trips"
      });
    } catch (err) {
      setAuthError(err.message || "Failed to initiate Clerk Google login");
    }
  };

  const [authError, setAuthError] = useState(null);
  
  // Trips state
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Custom modal states
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);

  // Magnetic button custom cursor effect hook
  const useMagneticButton = () => {
    const ref = useRef(null);
    useEffect(() => {
      const elem = ref.current;
      if (!elem) return;
      const handleMouseMove = (e) => {
        const { clientX, clientY } = e;
        const { left, top, width, height } = elem.getBoundingClientRect();
        const x = clientX - (left + width / 2);
        const y = clientY - (top + height / 2);
        elem.style.transform = `translate3d(${x * 0.28}px, ${y * 0.28}px, 0)`;
      };
      const handleMouseLeave = () => {
        elem.style.transform = 'translate3d(0, 0, 0)';
      };
      elem.addEventListener('mousemove', handleMouseMove);
      elem.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        elem.removeEventListener('mousemove', handleMouseMove);
        elem.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, []);
    return ref;
  };





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
        headers: { 
          "Authorization": `Bearer ${token}`,
          "X-User-Email": userEmail
        }
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



  const handleLogout = () => {
    signOut();
    setTrips([]);
  };

  const executeDelete = async (tripId) => {
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "X-User-Email": userEmail
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete trip plan.");
      }
      
      setTrips(trips.filter(t => t.id !== tripId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleShare = async (tripId, currentStatus) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/share`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-User-Email": userEmail
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
      {/* Ambient background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#F5A623]/5 blur-[120px] animate-float-a" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-sky-500/5 blur-[150px] animate-float-b" />
      </div>

      {/* Global textured noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
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
            {isSignedIn && (
              <button 
                onClick={() => setShowLogoutConfirm(true)}
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
        
        {!isSignedIn ? (
          <div className="max-w-4xl mx-auto pt-4 space-y-8 animate-fade-in relative z-10">
            {/* Unified Page Header */}
            <div className="text-center space-y-2">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono block">Your Trips, Everywhere</span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Never Lose a Plan Again
              </h2>
              <p className="text-xs text-slate-400 font-mono max-w-lg mx-auto">
                Every itinerary, saved the moment it's generated — pick up on any device.
              </p>
            </div>

            {/* Symmetrical Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Aesthetic Panel with dynamic matching travel illustration */}
              <div className="md:col-span-5 relative rounded-2xl overflow-hidden min-h-[320px] md:min-h-full border border-slate-800 shadow-xl bg-slate-950 flex flex-col justify-end p-8 group">
                <img 
                  src="/auth-safe-travel.png" 
                  alt="Your Travel Journal and Passport Kept Securely" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/40 to-transparent z-[1]" />
                <div className="absolute inset-0 bg-[#E8650A]/10 mix-blend-color z-[1]" />
                
                <div className="relative z-10 space-y-2">
                  <span className="text-[9px] font-bold tracking-[0.25em] text-[#F5A623] uppercase font-mono block">
                    Globe Express Vault
                  </span>
                  <h3 className="text-lg font-bold text-white uppercase leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Your Travel life, kept safe
                  </h3>
                  <p className="text-[10px] text-slate-300 leading-relaxed font-mono">
                    Keep your custom nature routes, flight itineraries, and accommodation schedules stored safely under one account.
                  </p>
                </div>
              </div>

              {/* Right Auth Form */}
              <div className="md:col-span-7 flex flex-col justify-center">
                {/* Auth Form Card */}
                <div className="p-6 md:p-8 border border-slate-850 bg-slate-900/60 backdrop-blur-md shadow-2xl rounded-2xl space-y-6">
                  {authError && (
                    <div className="p-3 rounded-lg border border-red-500/20 bg-red-950/20 text-xs text-red-400 font-mono animate-pulse">
                      {authError}
                    </div>
                  )}

                  {/* Clerk Google Sign In Container */}
                  <div className="space-y-4 text-center">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Sign In to Your Account</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Authorize via Clerk to instantly sync plans across all your devices.
                    </p>
                    
                    <div className="pt-2">
                      <button
                        onClick={handleGoogleSignIn}
                        className="w-full py-4 rounded-xl text-white font-bold text-xs tracking-widest uppercase transition-all shadow-lg flex items-center justify-center gap-3 cursor-pointer bg-[#E8650A] hover:bg-[#E8650A]/90 hover:shadow-[0_0_20px_rgba(232,101,10,0.4)] shimmer-btn"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.435-2.884-6.435-6.435s2.88-6.435 6.435-6.435c1.622 0 3.093.593 4.237 1.583l3.072-3.072C19.243 1.937 15.892 1 12 1 5.925 1 1 5.925 1 12s4.925 11 11 11c6.262 0 11-4.738 11-11 0-.756-.086-1.487-.245-2.285H12.24z" fill="currentColor" />
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    </div>
                  </div>

                  {/* Trust Signal Badge */}
                  <div className="flex items-center justify-center gap-1.5 text-[9px] font-mono text-slate-500 select-none">
                    <ShieldCheck size={11} className="text-emerald-400" />
                    <span>Secured by Clerk Identity</span>
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
                            onClick={() => setTripToDelete(trip.id)}
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

      {/* Premium Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]" 
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative w-full max-w-sm bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl shadow-2xl z-10 animate-fade-in-up space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#E8650A]/10 text-[#E8650A] flex items-center justify-center mx-auto border border-[#E8650A]/20">
                <Lock size={20} className="animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight font-mono">Confirm Logout</h3>
              <p className="text-xs text-slate-400 font-mono">
                Are you sure you want to log out of your Globe Express account?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer text-center font-mono"
              >
                Log Out
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer text-center font-mono"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Custom Delete Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]" 
            onClick={() => setTripToDelete(null)}
          />
          <div className="relative w-full max-w-sm bg-[#0D1B2A] border border-slate-800 p-6 rounded-2xl shadow-2xl z-10 animate-fade-in-up space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-red-950/30 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
                <Trash2 size={20} className="animate-bounce" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight font-mono">Delete Travel Plan</h3>
              <p className="text-xs text-slate-400 font-mono">
                Are you sure you want to permanently delete this travel plan? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const id = tripToDelete;
                  setTripToDelete(null);
                  await executeDelete(id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer text-center font-mono"
              >
                Delete
              </button>
              <button
                onClick={() => setTripToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer text-center font-mono"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
