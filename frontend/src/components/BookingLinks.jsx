import React from 'react';
import { ExternalLink, Plane, Hotel, Ticket } from 'lucide-react';

export default function BookingLinks({ links }) {
  if (!links || links.length === 0) return null;

  return (
    <div className="glass-panel p-5 space-y-4">
      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
        <ExternalLink className="w-4 h-4 text-violet-400" />
        Booking & Search Links
      </h3>
      <div className="flex flex-col gap-2.5">
        {links.map((link, idx) => {
          const type = link.type || 'activity';
          let icon = <Ticket className="w-4 h-4 text-cyan-400" />;
          if (type === 'flight') icon = <Plane className="w-4 h-4 text-blue-400" />;
          if (type === 'hotel') icon = <Hotel className="w-4 h-4 text-emerald-400" />;

          return (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-gray-800/60 hover:border-gray-700/80 transition-all duration-200 group text-xs text-gray-300 font-medium"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                {icon}
                <span className="truncate">{link.title}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors shrink-0" />
            </a>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500 italic mt-1 leading-normal">
        * Provided links redirect to Skyscanner, Google Flights, Booking.com, or Agoda. Fares are estimates and subject to availability.
      </p>
    </div>
  );
}
