import React from 'react';
import { Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function AgentStepper({ progressEvents, activeStep, status }) {
  // Step nodes representation
  const steps = [
    { key: 'supervisor', label: 'Supervisor Router', desc: 'Classifying intent and mapping context' },
    { key: 'flight_agent', label: 'Flight Search Agent', desc: 'Fetching flight status & routing info' },
    { key: 'hotel_agent', label: 'Hotel Research Agent', desc: 'Investigating matching hotel availability' },
    { key: 'itinerary_agent', label: 'Itinerary Planner', desc: 'Compiling customized travel timetable' },
    { key: 'validator', label: 'Quality Auditor', desc: 'Auditing constraints and correcting issues' },
    { key: 'final_agent', label: 'Response Formatter', desc: 'Writing final formatted markdown plan' },
  ];

  const getStepStatus = (key, idx) => {
    // Find the latest event for this node
    const nodeEvents = progressEvents.filter(e => e.node === key);
    if (nodeEvents.length === 0) {
      if (idx === activeStep) return 'active';
      if (idx < activeStep) return 'skipped'; // Node was bypassed
      return 'pending';
    }

    const latest = nodeEvents[nodeEvents.length - 1];
    if (latest.done) return 'completed';
    return 'active';
  };

  const getStepMessage = (key) => {
    const nodeEvents = progressEvents.filter(e => e.node === key);
    if (nodeEvents.length === 0) return null;
    return nodeEvents[nodeEvents.length - 1].message;
  };

  return (
    <div className="glass-panel p-6 max-w-xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-full bg-violet-500/10 text-violet-400 animate-spin">
          <Loader2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Multi-Agent Pipeline Active</h3>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">
          Our specialized AI agents are collaborating in real-time. This usually takes 15-30 seconds.
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const stepStatus = getStepStatus(step.key, idx);
          const message = getStepMessage(step.key);

          let bubbleClass = 'border-gray-800 text-gray-600 bg-transparent';
          let textClass = 'text-gray-500';
          let icon = <span>{idx + 1}</span>;

          if (stepStatus === 'completed') {
            bubbleClass = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';
            textClass = 'text-gray-300';
            icon = <CheckCircle2 className="w-4.5 h-4.5" />;
          } else if (stepStatus === 'active') {
            bubbleClass = 'border-violet-500 text-violet-400 bg-violet-500/10 shadow-[0_0_12px_rgba(139,92,246,0.25)]';
            textClass = 'text-white font-semibold';
            icon = <Loader2 className="w-4.5 h-4.5 animate-spin" />;
          } else if (stepStatus === 'skipped') {
            bubbleClass = 'border-gray-900 text-gray-700 bg-transparent';
            textClass = 'text-gray-600 line-through';
            icon = <CheckCircle2 className="w-4.5 h-4.5 opacity-20" />;
          }

          return (
            <div key={idx} className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs ${bubbleClass} shrink-0`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-xs font-semibold ${textClass}`}>{step.label}</h4>
                  {stepStatus === 'active' && (
                    <span className="text-[9px] uppercase font-bold text-violet-400 tracking-wider animate-pulse">
                      Running
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                  {message || step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
