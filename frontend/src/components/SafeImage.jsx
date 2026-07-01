import React, { useState } from 'react';

export default function SafeImage({ src, alt, className, destinationName }) {
  const [error, setError] = useState(!src);

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-950 to-purple-900 text-white font-bold text-center select-none uppercase tracking-wider p-4 ${className}`}
        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
      >
        <span className="text-sm md:text-base">{destinationName || alt || 'TripMate'}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
