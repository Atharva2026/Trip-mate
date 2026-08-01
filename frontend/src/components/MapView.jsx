import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ShieldAlert, Coffee, Compass, Activity, Landmark } from 'lucide-react';

export default function MapView({ locations, destination }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [filter, setFilter] = useState({
    itinerary: true,
    hidden_gem: true,
    restaurant: true,
    cafe: true,
    hospital: true,
    toilets: true,
    atm: true
  });
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerGroupRef = useRef([]);
  const polylineRef = useRef(null);

  // Load Leaflet CDN dynamically
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(cssLink);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Clean up if component unmounts early
      if (document.head.contains(cssLink)) document.head.removeChild(cssLink);
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  // Filtered locations
  const filteredLocs = (locations || []).filter(loc => {
    const type = loc.type || "itinerary";
    return filter[type] !== false;
  });

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !filteredLocs.length || !mapRef.current) return;

    const L = window.L;

    // Initialize map if not already done
    if (!mapInstance.current) {
      // Find center of locations
      const lats = filteredLocs.map(l => l.lat);
      const lngs = filteredLocs.map(l => l.lng);
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

      mapInstance.current = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 13,
        zoomControl: true
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstance.current);
    }

    // Clear old markers
    markerGroupRef.current.forEach(marker => mapInstance.current.removeLayer(marker));
    markerGroupRef.current = [];

    // Clear old polyline
    if (polylineRef.current) {
      mapInstance.current.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // Add new markers
    const latlngs = [];
    filteredLocs.forEach((loc, idx) => {
      const type = loc.type || "itinerary";
      
      // Determine marker color and icon text based on type
      let colorClass = "bg-sky-500 border-sky-300 shadow-[0_0_10px_#0ea5e9]";
      let innerHtml = loc.sequence ? `<span class="text-[9px] font-bold text-white">${loc.sequence}</span>` : "•";

      if (type === "hidden_gem") {
        colorClass = "bg-amber-500 border-amber-300 shadow-[0_0_10px_#f59e0b]";
        innerHtml = "💎";
      } else if (type === "restaurant" || type === "cafe") {
        colorClass = "bg-orange-500 border-orange-300 shadow-[0_0_10px_#f97316]";
        innerHtml = "🍴";
      } else if (type === "hospital") {
        colorClass = "bg-rose-500 border-rose-300 shadow-[0_0_10px_#f43f5e]";
        innerHtml = "🏥";
      } else if (type === "toilets" || type === "atm") {
        colorClass = "bg-emerald-500 border-emerald-300 shadow-[0_0_10px_#10b981]";
        innerHtml = type === "atm" ? "💵" : "🚻";
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${colorClass}">${innerHtml}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon })
        .addTo(mapInstance.current)
        .bindPopup(`
          <div class="text-slate-900 font-sans p-1.5 max-w-[180px]">
            <h5 class="font-bold text-xs leading-tight mb-1 text-slate-800">${loc.name}</h5>
            <span class="inline-block text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase bg-slate-100 text-slate-500">
              ${type.replace('_', ' ')}
            </span>
          </div>
        `);

      markerGroupRef.current.push(marker);

      // Collect points for itinerary route lines
      if (type === "itinerary") {
        latlngs.push({ lat: loc.lat, lng: loc.lng, sequence: loc.sequence || 0 });
      }
    });

    // Draw route lines connecting itinerary stops sequentially
    if (latlngs.length > 1) {
      latlngs.sort((a, b) => a.sequence - b.sequence);
      const points = latlngs.map(p => [p.lat, p.lng]);
      polylineRef.current = L.polyline(points, {
        color: '#38bdf8',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 8'
      }).addTo(mapInstance.current);
    }

    // Auto-adjust bounds to show all markers
    if (markerGroupRef.current.length > 0) {
      const group = L.featureGroup(markerGroupRef.current);
      mapInstance.current.fitBounds(group.getBounds().pad(0.15));
    }

  }, [leafletLoaded, locations, filter]);

  // Handle active marker changes from parent
  useEffect(() => {
    if (mapInstance.current && filteredLocs[activeIdx]) {
      const loc = filteredLocs[activeIdx];
      mapInstance.current.setView([loc.lat, loc.lng], 14);
      markerGroupRef.current[activeIdx]?.openPopup();
    }
  }, [activeIdx]);

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 border border-gray-800/40 rounded-2xl bg-white/[0.01] overflow-hidden min-h-[400px]">
      
      {/* Sidebar Controllers */}
      <div className="p-4 border-b md:border-b-0 md:border-r border-gray-800/60 flex flex-col gap-4 bg-black/10 max-h-[400px] overflow-y-auto">
        <div>
          <h4 className="text-[10px] font-bold uppercase text-[#F5A623] tracking-wider mb-3 flex items-center gap-1.5">
            <Compass size={12} /> Map Filters
          </h4>
          <div className="space-y-2">
            {[
              { id: 'itinerary', label: '📅 Itinerary Stops', color: 'text-sky-400' },
              { id: 'hidden_gem', label: '💎 Hidden Spots', color: 'text-amber-400' },
              { id: 'restaurant', label: '🍴 Curated Eats', color: 'text-orange-400' },
              { id: 'hospital', label: '🏥 Medical Care', color: 'text-rose-400' },
              { id: 'toilets', label: '🚻 Public Toilets', color: 'text-emerald-400' },
              { id: 'atm', label: '💵 ATMs / Cash', color: 'text-emerald-400' }
            ].map(item => (
              <label key={item.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={filter[item.id] !== false}
                  onChange={() => setFilter(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className="rounded border-slate-700 bg-slate-800 text-[#F5A623] focus:ring-0 focus:ring-offset-0"
                />
                <span className={`${item.color} font-medium`}>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-800/60 pt-4 flex-1">
          <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-2">
            Pin List
          </h4>
          <div className="space-y-1">
            {filteredLocs.map((loc, i) => {
              const isActive = activeIdx === i;
              const type = loc.type || "itinerary";
              
              let TypeIcon = Compass;
              if (type === "hidden_gem") TypeIcon = Landmark;
              if (type === "restaurant" || type === "cafe") TypeIcon = Coffee;
              if (type === "hospital") TypeIcon = Activity;
              if (type === "toilets" || type === "atm") TypeIcon = ShieldAlert;

              return (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left text-xs transition-all duration-200 border ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500/30 text-white font-medium'
                      : 'bg-transparent border-transparent text-gray-400 hover:bg-white/[0.02]'
                  }`}
                >
                  <TypeIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isActive ? 'text-amber-400' : 'text-gray-500'}`} />
                  <div className="min-w-0">
                    <p className="font-semibold truncate leading-tight">{loc.name}</p>
                    <p className="text-[9px] text-gray-500 font-mono mt-0.5 uppercase">
                      {type.replace('_', ' ')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Map Element */}
      <div className="md:col-span-2 relative h-[400px] bg-slate-950">
        {!leafletLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 bg-slate-950">
            Loading Map Engine...
          </div>
        )}
        <div ref={mapRef} className="h-full w-full" />
      </div>
    </div>
  );
}
