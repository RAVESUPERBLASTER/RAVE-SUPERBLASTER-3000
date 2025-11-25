
import React, { useRef, useEffect, useState } from 'react';
import { Track } from '../types';
import { TrashIcon } from '@heroicons/react/24/solid';

interface AutomationEditorProps {
  track: Track;
  paramName: string;
  paramLabel: string;
  automation: (number | null)[];
  onUpdate: (step: number, value: number | null) => void;
  onClear: () => void;
  color: string;
  currentStep: number;
  isPlaying: boolean;
}

const COLOR_MAP: Record<string, string> = {
    red: '#dc2626', orange: '#f97316', amber: '#f59e0b', yellow: '#facc15',
    lime: '#84cc16', green: '#16a34a', emerald: '#10b981', teal: '#14b8a6',
    cyan: '#06b6d4', sky: '#0ea5e9', blue: '#2563eb', indigo: '#6366f1',
    violet: '#8b5cf6', purple: '#9333ea', fuchsia: '#d946ef', pink: '#ec4899',
    rose: '#f43f5e', white: '#ffffff'
};

export const AutomationEditor: React.FC<AutomationEditorProps> = ({
  track, paramName, paramLabel, automation, onUpdate, onClear, color, currentStep, isPlaying
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const themeColor = COLOR_MAP[track.color] || '#f97316';

  const handlePointer = (e: React.PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const stepWidth = rect.width / 16;
      const step = Math.floor(x / stepWidth);
      
      // Invert Y because 1.0 is top
      let value = 1 - (y / rect.height);
      value = Math.max(0, Math.min(1, value));

      if (step >= 0 && step < 16) {
          // Right click to clear step
          if (e.buttons === 2 || e.button === 2) {
              onUpdate(step, null);
          } else {
              onUpdate(step, value);
          }
      }
  };

  const handleDown = (e: React.PointerEvent) => {
      e.preventDefault();
      setDrawing(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      handlePointer(e);
  };

  const handleMove = (e: React.PointerEvent) => {
      if (drawing) handlePointer(e);
  };

  const handleUp = (e: React.PointerEvent) => {
      setDrawing(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Generate SVG Path for the line
  const generatePath = () => {
      let d = "";
      const width = 100; // viewbox units
      const height = 100;
      const stepW = width / 16;

      let started = false;

      for (let i = 0; i < 16; i++) {
          const val = automation[i];
          const x = (i * stepW) + (stepW / 2);
          
          // If no automation, we technically visualize "nothing" or the base value
          // Here we just skip drawing lines to null points to indicate "no automation data"
          // Or we draw gaps.
          
          if (val !== null) {
              const y = height - (val * height);
              if (!started) {
                  d += `M ${x} ${y} `;
                  started = true;
              } else {
                  // Cubic bezier for FL Studio feel? Or linear? Linear is cleaner for step sequencer
                  d += `L ${x} ${y} `;
              }
          }
      }
      return d;
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-sm border border-white/10 overflow-hidden relative">
        <div className="flex justify-between items-center bg-[#222] px-2 py-1 border-b border-white/5 h-6 shrink-0">
             <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]`} style={{ backgroundColor: themeColor }}></div>
                 <span className="text-[10px] font-bold text-white uppercase tracking-wider">AUTO: {track.name} / <span style={{ color: themeColor }}>{paramLabel}</span></span>
             </div>
             <button onClick={onClear} className="text-[9px] text-neutral-500 hover:text-red-500 flex items-center gap-1 uppercase font-bold">
                 <TrashIcon className="w-3 h-3" /> Clear
             </button>
        </div>

        <div 
            ref={containerRef}
            className="flex-1 relative cursor-crosshair touch-none bg-[#111]"
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Grid Background */}
            <div className="absolute inset-0 flex pointer-events-none">
                {Array.from({length: 16}).map((_, i) => (
                    <div 
                        key={i} 
                        className={`flex-1 border-r border-white/5 ${i % 4 === 0 ? 'border-r-white/10' : ''} relative`}
                    >
                         {/* Playhead Highlight */}
                         {isPlaying && currentStep === i && (
                             <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                         )}
                    </div>
                ))}
            </div>
            <div className="absolute inset-0 flex flex-col pointer-events-none">
                 <div className="flex-1 border-b border-white/5"></div>
                 <div className="flex-1 border-b border-white/5"></div>
                 <div className="flex-1 border-b border-white/5"></div>
                 <div className="flex-1"></div>
            </div>

            {/* Automation Bars (Ghost / Background) */}
            <div className="absolute inset-0 flex items-end pointer-events-none px-[3%]">
                 {automation.map((val, i) => (
                     <div key={i} className="flex-1 flex items-end justify-center h-full">
                         {val !== null && (
                             <div 
                                className="w-full mx-[1px] bg-white/5 rounded-t-sm"
                                style={{ height: `${val * 100}%` }}
                             ></div>
                         )}
                     </div>
                 ))}
            </div>

            {/* Automation Line (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path 
                    d={generatePath()} 
                    fill="none" 
                    stroke={themeColor} 
                    strokeWidth="0.5" 
                    vectorEffect="non-scaling-stroke"
                    className="drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]"
                 />
                 
                 {/* Points */}
                 {automation.map((val, i) => {
                     if (val === null) return null;
                     const x = ((i * (100/16)) + (100/32));
                     const y = 100 - (val * 100);
                     return (
                         <circle 
                            key={i} 
                            cx={x} 
                            cy={y} 
                            r="1.5" 
                            fill="#fff" 
                            stroke={themeColor}
                            strokeWidth="0.5"
                            vectorEffect="non-scaling-stroke"
                        />
                     )
                 })}
            </svg>
        </div>
    </div>
  );
};
