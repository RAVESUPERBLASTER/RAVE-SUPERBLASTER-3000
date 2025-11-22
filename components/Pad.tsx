
import React, { forwardRef, useImperativeHandle, useRef, memo } from 'react';
import { Track } from '../types';

interface PadProps {
  track: Track;
  isSelected: boolean;
  onSelectVariation: (id: number, variation: number) => void;
  onSelect: (id: number) => void;
  onToggleMute: (id: number) => void;
  shortcutKey: string;
}

export interface PadHandle {
  trigger: (variation: number) => void;
}

// Map track colors to specific styling classes
const PAD_COLORS: Record<string, { border: string, bg: string, text: string, shadow: string }> = {
  red: { border: 'border-red-500', bg: 'bg-red-500', text: 'text-red-500', shadow: 'shadow-red-500/50' },
  orange: { border: 'border-orange-500', bg: 'bg-orange-500', text: 'text-orange-500', shadow: 'shadow-orange-500/50' },
  amber: { border: 'border-amber-500', bg: 'bg-amber-500', text: 'text-amber-500', shadow: 'shadow-amber-500/50' },
  yellow: { border: 'border-yellow-400', bg: 'bg-yellow-400', text: 'text-yellow-400', shadow: 'shadow-yellow-400/50' },
  lime: { border: 'border-lime-500', bg: 'bg-lime-500', text: 'text-lime-500', shadow: 'shadow-lime-500/50' },
  green: { border: 'border-green-500', bg: 'bg-green-500', text: 'text-green-500', shadow: 'shadow-green-500/50' },
  emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-500', shadow: 'shadow-emerald-500/50' },
  teal: { border: 'border-teal-500', bg: 'bg-teal-500', text: 'text-teal-500', shadow: 'shadow-teal-500/50' },
  cyan: { border: 'border-cyan-500', bg: 'bg-cyan-500', text: 'text-cyan-500', shadow: 'shadow-cyan-500/50' },
  sky: { border: 'border-sky-500', bg: 'bg-sky-500', text: 'text-sky-500', shadow: 'shadow-sky-500/50' },
  blue: { border: 'border-blue-500', bg: 'bg-blue-500', text: 'text-blue-500', shadow: 'shadow-blue-500/50' },
  indigo: { border: 'border-indigo-500', bg: 'bg-indigo-500', text: 'text-indigo-500', shadow: 'shadow-indigo-500/50' },
  violet: { border: 'border-violet-500', bg: 'bg-violet-500', text: 'text-violet-500', shadow: 'shadow-violet-500/50' },
  purple: { border: 'border-purple-500', bg: 'bg-purple-500', text: 'text-purple-500', shadow: 'shadow-purple-500/50' },
  fuchsia: { border: 'border-fuchsia-500', bg: 'bg-fuchsia-500', text: 'text-fuchsia-500', shadow: 'shadow-fuchsia-500/50' },
  pink: { border: 'border-pink-500', bg: 'bg-pink-500', text: 'text-pink-500', shadow: 'shadow-pink-500/50' },
  rose: { border: 'border-rose-500', bg: 'bg-rose-500', text: 'text-rose-500', shadow: 'shadow-rose-500/50' },
};

export const Pad = memo(forwardRef<PadHandle, PadProps>(({ 
  track, 
  isSelected, 
  onSelectVariation, 
  onSelect,
  onToggleMute,
  shortcutKey 
}, ref) => {
  const variations = ['A', 'B', 'C', 'D'];
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Long Press Refs
  const timeoutRef = useRef<number | null>(null);
  const isLongPress = useRef(false);
  
  const styles = PAD_COLORS[track.color] || PAD_COLORS['orange'];

  useImperativeHandle(ref, () => ({
    trigger: (playedVariation: number) => {
      const overlay = overlayRefs.current[playedVariation];
      if (overlay) {
          overlay.classList.remove('animate-flash-fade');
          void overlay.offsetWidth; // Minimal reflow
          overlay.classList.add('animate-flash-fade');
      }
      
      if (containerRef.current) {
        containerRef.current.classList.remove('animate-pad-press');
        void containerRef.current.offsetWidth;
        containerRef.current.classList.add('animate-pad-press');
      }
    }
  }));

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
      e.preventDefault(); // Prevent scrolling/ghost clicks
      
      // IMMEDIATE TRIGGER for responsiveness
      onSelect(track.id); 
      onSelectVariation(track.id, index);

      isLongPress.current = false;
      
      // Start Long Press Timer (1000ms) for Mute functionality
      // Sound still plays on touch, which is standard performance behavior
      timeoutRef.current = window.setTimeout(() => {
          isLongPress.current = true;
          onToggleMute(track.id);
          // Haptic feedback if available
          if (navigator.vibrate) navigator.vibrate(50);
      }, 1000);
  };

  const handlePointerUp = (e: React.PointerEvent, index: number) => {
      if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
      }
  };

  const handlePointerLeave = () => {
      // Cancel if user slides off
      if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
      }
  };

  return (
    <div 
      ref={containerRef}
      className={`
        relative w-full aspect-square rounded-[4px] shadow-[0_3px_0_rgba(0,0,0,0.3)] 
        overflow-hidden select-none touch-none
        border-[3px] active:scale-[0.98] transition-transform duration-75
        ${styles.border} /* Colored border all around */
        ${isSelected ? 'bg-neutral-500 ring-1 ring-white/30' : 'bg-neutral-600'} /* Lighter backgrounds */
      `}
    >
      <style>{`
        @keyframes flashFade {
            0% { opacity: 0.8; }
            100% { opacity: 0; }
        }
        .animate-flash-fade {
            animation: flashFade 200ms ease-out forwards;
        }
        @keyframes padPress {
            0% { transform: scale(0.98); filter: brightness(1.1); }
            100% { transform: scale(1); filter: brightness(1); }
        }
        .animate-pad-press {
            animation: padPress 100ms ease-out forwards;
        }
      `}</style>
      
      {/* Tint Overlay to make color identifiable on the body too */}
      <div className={`absolute inset-0 opacity-[0.08] pointer-events-none ${styles.bg}`}></div>

      {/* 2x2 Grid for Variations */}
      <div className="w-full h-full grid grid-cols-2 grid-rows-2 relative z-10">
        {variations.map((label, i) => {
            const isVarActive = track.variation === i;
            
            // Create crosshair separation lines
            const borderClass = `
                border-black/20
                ${(i === 0 || i === 2) ? 'border-r' : ''}
                ${(i === 0 || i === 1) ? 'border-b' : ''}
            `;

            return (
                <div
                    key={i}
                    onPointerDown={(e) => handlePointerDown(e, i)}
                    onPointerUp={(e) => handlePointerUp(e, i)}
                    onPointerLeave={handlePointerLeave}
                    className={`
                        relative group flex items-center justify-center
                        outline-none cursor-pointer
                        ${borderClass}
                        ${isVarActive ? 'bg-white/10' : 'bg-transparent'}
                        hover:bg-white/5 transition-colors
                    `}
                >
                     {/* Variation Indicator Dot */}
                     {isVarActive && (
                        <div className={`w-2 h-2 rounded-full ${styles.bg} shadow-[0_0_6px_currentColor]`}></div>
                     )}

                     {/* Subtle Label on Hover */}
                     <span className="absolute top-0.5 left-1 text-[8px] font-mono text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {label}
                     </span>
                    
                    {/* Flash Overlay - True Color Flash (No Mix Blend) */}
                    <div 
                        ref={el => { overlayRefs.current[i] = el }}
                        className={`absolute inset-0 ${styles.bg} opacity-0 pointer-events-none`} 
                    />
                </div>
            )
        })}
      </div>

      {/* Mute Overlay - Strong Visual Feedback */}
      {track.muted && (
         <div className="absolute inset-0 z-30 bg-neutral-900/80 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
             <div className="border-2 border-red-500 text-red-500 font-black text-sm px-2 py-0.5 transform -rotate-12 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                 MUTED
             </div>
         </div>
      )}

      {/* Center Label - MAXIMIZED SIZE */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-1 z-20">
          <span className={`
            font-black font-mono text-sm sm:text-base lg:text-lg uppercase tracking-tighter px-2 py-1 rounded-[2px] 
            bg-neutral-900/60 backdrop-blur-[1px] border border-white/5 text-center leading-none
            ${isSelected ? 'text-white' : 'text-neutral-200'}
            ${track.muted ? 'opacity-20' : 'opacity-100'}
          `}>
            {track.name}
          </span>
      </div>

      {/* Corner Badges */}
      <div className="absolute bottom-1 right-1.5 pointer-events-none z-20">
         <span className={`text-xs font-black ${styles.text} opacity-100 drop-shadow-md`}>
            {variations[track.variation]}
         </span>
      </div>

      <div className="absolute top-1 left-1.5 pointer-events-none z-20">
         <span className="text-[10px] font-mono font-bold text-neutral-400 bg-black/30 px-1.5 rounded">
            {shortcutKey.toUpperCase()}
         </span>
      </div>
    </div>
  );
}));
