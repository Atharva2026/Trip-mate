import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Questionnaire from './pages/Questionnaire';
import Dashboard from './pages/Dashboard';
import MyTrips from './pages/MyTrips';
import SharedPlan from './pages/SharedPlan';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/questionnaire" element={<Questionnaire />} />
        <Route path="/planner" element={<Dashboard />} />
        <Route path="/my-trips" element={<MyTrips />} />
        <Route path="/plan/:tripId" element={<SharedPlan />} />
      </Routes>
    </Router>
  );
}
