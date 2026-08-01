import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';

export default function ValidationReport({ report }) {
  const [expanded, setExpanded] = useState(false);

  if (!report || (report.passed === undefined && !report.note)) return null;

  const { passed, issues, corrections, auto_corrected, note } = report;

  // Unverified/skipped validation state
  if (passed === null || passed === undefined) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-800 bg-white/[0.01] text-xs text-gray-400">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
        <div>
          <span className="font-semibold text-gray-300">Plan unverified.</span> {note || 'Quality validation check could not be completed.'}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
      passed 
        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' 
        : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
    }`}>
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between font-semibold text-xs text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          {passed ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <span>
              {passed 
                ? 'Plan verified: 0 issues found.' 
                : `Quality Check: ${issues?.length || 0} issue(s) identified.`
              }
            </span>
            {auto_corrected && (
              <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Auto-Corrected
              </span>
            )}
          </div>
        </div>
        <div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {passed && expanded && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-xs leading-normal">
          <h5 className="font-bold text-[#F5A623] mb-1.5 text-[9px] uppercase tracking-wider font-mono">Audited Constraints Checked:</h5>
          <ul className="space-y-1.5 text-slate-400 font-mono text-[10px] pl-1">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Flight Carrier & Schedule Verification
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Hotel Pricing Tiers & Budget Safeguard Bounds
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Transit Sequence Spacing & Distances Audited
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Travel Advisories, Alerts, & Currency Rates Validated
            </li>
          </ul>
        </div>
      )}

      {!passed && expanded && issues && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-3 text-xs leading-normal">
          <div>
            <h5 className="font-bold text-gray-300 mb-1.5">Identified Issues:</h5>
            <ul className="list-disc pl-4 space-y-1 text-gray-400">
              {issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
          {corrections && (
            <div>
              <h5 className="font-bold text-gray-300 mb-1">Applied Corrections:</h5>
              <p className="text-gray-400 italic">"{corrections}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
