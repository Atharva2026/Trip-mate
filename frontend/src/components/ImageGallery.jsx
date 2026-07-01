import React from 'react';
import SafeImage from './SafeImage';

export default function ImageGallery({ images, destination }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
        Destination Snapshots
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {images.slice(0, 4).map((img, idx) => (
          <div key={idx} className="relative group rounded-xl overflow-hidden aspect-[4/3] border border-gray-800/40 bg-black/20">
            <SafeImage
              src={img.url}
              alt={img.alt || destination || 'Destination Photo'}
              destinationName={destination}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {img.credit && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5">
                {img.credit_url ? (
                  <a
                    href={img.credit_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-gray-300 hover:text-white truncate"
                  >
                    {img.credit}
                  </a>
                ) : (
                  <span className="text-[9px] text-gray-300 truncate">{img.credit}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
