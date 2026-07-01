import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

export default function MapView({ locations, destination }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!locations || locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white/[0.02] border border-gray-800/40 rounded-2xl h-80 text-center">
        <MapPin className="w-10 h-10 text-gray-500 mb-3" />
        <h4 className="font-semibold text-gray-400 text-sm">No Location Pins Extracted</h4>
        <p className="text-xs text-gray-500 max-w-xs mt-1">
          Locations and coordinates will automatically map here when you generate a complete itinerary.
        </p>
      </div>
    );
  }

  const activeLoc = locations[activeIdx];
  const { lat, lng, name } = activeLoc;

  // Bounding box around the active point for OpenStreetMap Embed
  const delta = 0.015;
  const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
  const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 border border-gray-800/40 rounded-2xl bg-white/[0.01] overflow-hidden min-h-[320px]">
      {/* Sidebar List */}
      <div className="p-4 border-b md:border-b-0 md:border-r border-gray-800/60 flex flex-col gap-2 max-h-[320px] overflow-y-auto bg-black/10">
        <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-2">
          Route Map Pins
        </h4>
        <div className="space-y-1.5">
          {locations.map((loc, i) => {
            const isActive = activeIdx === i;
            return (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left text-xs transition-all duration-200 border ${
                  isActive
                    ? 'bg-violet-500/10 border-violet-500/30 text-white font-medium'
                    : 'bg-transparent border-transparent text-gray-400 hover:bg-white/[0.02]'
                }`}
              >
                <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-violet-400' : 'text-gray-500'}`} />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{loc.name}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Embed Frame */}
      <div className="md:col-span-2 relative h-[320px] bg-black/40">
        <iframe
          title={name}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src={iframeSrc}
          className="border-none opacity-80 hover:opacity-100 transition-opacity duration-300"
        />
        {/* Floating Label */}
        <div className="absolute bottom-4 left-4 right-4 p-3 bg-black/90 backdrop-blur border border-gray-800/80 rounded-xl pointer-events-none shadow-xl">
          <p className="text-xs font-semibold text-white truncate">{name}</p>
          <p className="text-[10px] text-violet-400 font-mono mt-0.5">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
        </div>
      </div>
    </div>
  );
}
