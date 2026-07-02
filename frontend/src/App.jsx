import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import LandingPage from './pages/LandingPage';
import Questionnaire from './pages/Questionnaire';
import Dashboard from './pages/Dashboard';
import MyTrips from './pages/MyTrips';
import SharedPlan from './pages/SharedPlan';
import HolidaysPage from './pages/HolidaysPage';
import DestinationsPage from './pages/DestinationsPage';
import FlightsPage from './pages/FlightsPage';
import OffersPage from './pages/OffersPage';
import ContactsPage from './pages/ContactsPage';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export default function App() {
  if (!CLERK_PUBLISHABLE_KEY || CLERK_PUBLISHABLE_KEY === "YOUR_CLERK_PUBLISHABLE_KEY_HERE" || CLERK_PUBLISHABLE_KEY.trim() === "") {
    return (
      <div className="min-h-screen bg-[#070F19] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans select-none">
        {/* Background glow layers */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#E8650A]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative w-full max-w-lg bg-slate-900/60 backdrop-blur-md border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
            <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold uppercase tracking-tight text-white">Clerk Integration Required</h2>
            <p className="text-xs text-slate-400 font-mono leading-relaxed max-w-sm mx-auto">
              To enable production-grade authentication with Google, please configure Clerk credentials.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-950 text-left space-y-3 font-mono text-xs text-slate-300">
            <p className="font-bold text-[#F5A623] uppercase tracking-wider">Setup Instructions:</p>
            <ol className="list-decimal pl-5 space-y-2 leading-relaxed text-[11px]">
              <li>Sign up or log in to <a href="https://clerk.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">clerk.com</a>.</li>
              <li>Create a new application named **TripMate** or **Globe Express**.</li>
              <li>Select **Google** as your authentication provider.</li>
              <li>Copy your **Publishable Key** from the Clerk Dashboard API Keys page.</li>
              <li>Paste it inside the `.env` file in the project root:
                <code className="block mt-1.5 p-2 bg-slate-900 rounded text-slate-400 select-all border border-slate-800">VITE_CLERK_PUBLISHABLE_KEY = "pk_test_..."</code>
              </li>
              <li>Restart the development server.</li>
            </ol>
          </div>

          <p className="text-[10px] text-slate-500 font-mono italic">
            Once the key is added, the app will automatically mount Clerk sign-in and session controllers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/planner" element={<Dashboard />} />
          <Route path="/my-trips" element={<MyTrips />} />
          <Route path="/plan/:tripId" element={<SharedPlan />} />
          <Route path="/holidays" element={<HolidaysPage />} />
          <Route path="/destinations" element={<DestinationsPage />} />
          <Route path="/flights" element={<FlightsPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
        </Routes>
      </Router>
    </ClerkProvider>
  );
}
