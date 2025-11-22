
import React, { memo } from 'react';

interface StepSequencerProps {
  steps: boolean[];
  currentStep: number;
  onToggleStep: (index: number) => void;
  trackColor: string;
}

const COLOR_MAP: Record<string, string> = {
    red: 'bg-red-600',
    orange: 'bg-orange-500',
    amber: 'bg-amber-500',
    yellow: 'bg-yellow-400',
    lime: 'bg-lime-500',
    green: 'bg-green-600',
    emerald: 'bg-emerald-500',
    teal: 'bg-teal-500',
    cyan: 'bg-cyan-500',
    sky: 'bg-sky-500',
    blue: 'bg-blue-600',
    indigo: 'bg-indigo-500',
    violet: 'bg-violet-500',
    purple: 'bg-purple-600',
    fuchsia: 'bg-fuchsia-500',
    pink: 'bg-pink-500',
    rose: 'bg-rose-500',
    white: 'bg-white',
};

export const StepSequencer = memo(({ steps, currentStep, onToggleStep, trackColor }: StepSequencerProps) => {
  const activeColorClass = COLOR_MAP[trackColor] || 'bg-orange-500';

  return (
    <div className="w-full h-full flex gap-1 items-center justify-center px-1 relative">
      {steps.map((isActive, index) => {
        const isCurrent = index === currentStep;
        const isBeat = index % 4 === 0;
        
        let bgColor = "bg-neutral-700";
        let shadowClass = "shadow-[0_2px_0_rgba(0,0,0,0.2)]";
        let transformClass = "";
        let zIndex = "z-0";
        
        if (isActive) {
             bgColor = `${activeColorClass}`;
             shadowClass = "shadow-[0_1px_3px_rgba(0,0,0,0.3)]";
        }

        // Visual Feedback Logic
        if (isCurrent) {
            zIndex = "z-20";
            if (isActive) {
                // Active Step Triggered
                bgColor = "bg-white";
                shadowClass = "shadow-[0_0_20px_rgba(255,255,255,1)] ring-2 ring-white";
                transformClass = "scale-110 -translate-y-1.5 z-30 brightness-125";
            } else {
                // Empty Step Playhead - More Visible
                bgColor = "bg-neutral-300";
                transformClass = "scale-95 ring-1 ring-white/50";
            }
        } else {
             transformClass = "active:translate-y-[1px] hover:opacity-90";
        }

        return (
          <button
            key={index}
            onClick={() => onToggleStep(index)}
            className={`
              flex-1 h-[85%] rounded-[2px] transition-all duration-75 relative overflow-visible
              ${bgColor} 
              ${isBeat && index !== 0 ? 'ml-0.5' : ''}
              ${shadowClass}
              ${transformClass}
              ${zIndex}
            `}
          >
            {/* Playhead Marker Above */}
            {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-white drop-shadow-sm animate-bounce"></div>
            )}

            {/* Beat Marker Number */}
            {isBeat && (
                <span className={`absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold pointer-events-none transition-colors ${isCurrent ? 'text-white' : 'text-neutral-500'}`}>
                    {(index / 4) + 1}
                </span>
            )}
            
            {/* LED Gloss */}
            <div className={`w-full h-full bg-gradient-to-b from-white/20 to-transparent rounded-[2px] pointer-events-none absolute inset-0`} />

            {/* Center Dot for Trigger Clarity */}
            {isActive && isCurrent && (
                <div className={`absolute inset-0 flex items-center justify-center`}>
                    <div className={`w-2 h-2 rounded-full ${activeColorClass} shadow-sm ring-2 ring-white/80`}></div>
                </div>
            )}
            
          </button>
        );
      })}
    </div>
  );
});
