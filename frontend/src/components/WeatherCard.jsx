import React from 'react';
import { Cloud, Sun, CloudRain, CloudSun, Thermometer, Droplets } from 'lucide-react';

export default function WeatherCard({ weather, destination }) {
  if (!weather || !weather.success) return null;

  const { current_temp, condition, humidity, forecast } = weather;

  // Select icon based on condition string
  const getIcon = (desc) => {
    const d = (desc || '').toLowerCase();
    if (d.includes('rain') || d.includes('shower') || d.includes('drizzle')) return <CloudRain className="w-8 h-8 text-blue-400 shrink-0" />;
    if (d.includes('sunny') || d.includes('clear')) return <Sun className="w-8 h-8 text-amber-400 shrink-0" />;
    if (d.includes('partly') || d.includes('cloudy') || d.includes('overcast')) return <CloudSun className="w-8 h-8 text-gray-300 shrink-0" />;
    return <Cloud className="w-8 h-8 text-gray-400 shrink-0" />;
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
        Weather Outlook
      </h3>
      <div className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-xl border border-gray-800/40">
        {getIcon(condition)}
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white">{current_temp}</span>
            <span className="text-xs text-gray-400 truncate max-w-[120px]">{condition}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1">
            <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3 text-cyan-500" /> {humidity} Humidity</span>
          </div>
        </div>
      </div>
      {forecast && forecast.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
            3-Day Forecast
          </h4>
          <div className="space-y-1.5">
            {forecast.map((f, i) => (
              <p key={i} className="text-xs text-gray-400 truncate">
                {f}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
