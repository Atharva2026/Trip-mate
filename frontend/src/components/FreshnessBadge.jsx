import React from 'react';

export default function FreshnessBadge({ freshness }) {
  if (!freshness) return null;
  
  const source = freshness.source || 'estimated';
  
  // Calculate relative age in minutes
  const fetchedAt = freshness.fetched_at;
  const ageMins = fetchedAt 
    ? Math.max(0, Math.round((Date.now() / 1000 - fetchedAt) / 60))
    : null;

  let badgeClass = '';
  let badgeText = '';

  if (source === 'live') {
    badgeClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    badgeText = '🟢 Live';
  } else if (source === 'cached') {
    badgeClass = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    badgeText = ageMins !== null && ageMins >= 1 
      ? `🕐 Cached (${ageMins}m ago)`
      : '🕐 Cached';
  } else {
    badgeClass = 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    badgeText = '📋 Estimated';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
      {badgeText}
    </span>
  );
}
