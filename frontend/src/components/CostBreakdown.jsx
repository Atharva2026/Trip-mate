import React from 'react';
import { Landmark } from 'lucide-react';

export default function CostBreakdown({ itineraryText }) {
  // Parse estimated budget lines from natural language text
  const parseBudget = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    const budget = {
      flights: 0,
      hotels: 0,
      activities: 0,
      food: 0,
      misc: 0,
    };

    let total = 0;
    const regex = /(flight|hotel|accommodation|stay|activity|sightseeing|food|meal|misc|other|transport|train|bus).*?(\$|€|£|¥|rs\.?|bdt)\s?([0-9,]+)/i;

    lines.forEach((line) => {
      const match = line.match(regex);
      if (match) {
        const category = match[1].toLowerCase();
        const value = parseInt(match[3].replace(/,/g, ''), 10);
        if (!isNaN(value)) {
          if (category.includes('flight') || category.includes('plane')) budget.flights += value;
          else if (category.includes('hotel') || category.includes('accommodation') || category.includes('stay')) budget.hotels += value;
          else if (category.includes('activity') || category.includes('sightseeing')) budget.activities += value;
          else if (category.includes('food') || category.includes('meal')) budget.food += value;
          else budget.misc += value;
          total += value;
        }
      }
    });

    if (total === 0) {
      // Fallback: Default reasonable splits for visual representation
      return {
        flights: 40,
        hotels: 30,
        activities: 15,
        food: 10,
        misc: 5,
        isPercentage: true,
        total: 100
      };
    }

    return { ...budget, total, isPercentage: false };
  };

  const budget = parseBudget(itineraryText);
  if (!budget) return null;

  const getPercentage = (val) => {
    if (budget.total === 0) return 0;
    return Math.round((val / budget.total) * 100);
  };

  const segments = [
    { name: '✈️ Flights', value: budget.flights, color: 'bg-blue-500' },
    { name: '🏨 Hotels', value: budget.hotels, color: 'bg-emerald-500' },
    { name: '🎟️ Activities', value: budget.activities, color: 'bg-cyan-500' },
    { name: '🍔 Food & Drinks', value: budget.food, color: 'bg-amber-500' },
    { name: '⚙️ Transport & Misc', value: budget.misc, color: 'bg-purple-500' },
  ].filter(s => s.value > 0);

  return (
    <div className="glass-panel p-5 space-y-4">
      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
        <Landmark className="w-4 h-4 text-violet-400" />
        Estimated Cost Split
      </h3>
      
      {/* Stacked Progress Bar */}
      <div className="h-3.5 w-full rounded-full bg-white/5 overflow-hidden flex border border-gray-800/40">
        {segments.map((seg, idx) => {
          const pct = budget.isPercentage ? seg.value : getPercentage(seg.value);
          if (pct === 0) return null;
          return (
            <div
              key={idx}
              className={`${seg.color} h-full transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${seg.name}: ${pct}%`}
            />
          );
        })}
      </div>

      {/* Legend List */}
      <div className="space-y-2 pt-1">
        {segments.map((seg, idx) => {
          const pct = budget.isPercentage ? seg.value : getPercentage(seg.value);
          const displayVal = budget.isPercentage 
            ? `${pct}%` 
            : `${seg.value.toLocaleString()} (${pct}%)`;
          return (
            <div key={idx} className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${seg.color}`} />
                <span>{seg.name}</span>
              </div>
              <span className="font-semibold text-gray-300">{displayVal}</span>
            </div>
          );
        })}
      </div>
      
      {!budget.isPercentage && (
        <div className="pt-2.5 border-t border-white/5 flex justify-between text-xs font-bold text-white">
          <span>Total Estimated Budget</span>
          <span>{budget.total.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
