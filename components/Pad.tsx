
import React, { forwardRef, useImperativeHandle, useRef, memo } from 'react';
import { Track } from '../types';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

interface PadProps {
  track: Track;
  isSelected: boolean;
  onSelectVariation: (id: number, variation: number) => void;
  onSelect: (id: number) => void;
  onTrigger: (id: number) => void;
  onToggleMute: (id: number) => void;
  onOpenLibrary: (id: number) => void;
  shortcutKey: string;
}

export interface PadHandle {
  trigger: (variation: number) => void;
}

// Map track colors to specific styling classes
const PAD_COLORS: Record<string, { border: string, bg: string, text: string, shadow: string, ring: string }> = {
  red: { border: 'border-red-500', bg: 'bg-red-500', text: 'text-red-500', shadow: 'shadow-red-500/50', ring: 'ring-red-500' },
  orange: { border: 'border-orange-500', bg: 'bg-orange-500', text: 'text-orange-500', shadow: 'shadow-orange-500/50', ring: 'ring-orange-500' },
  amber: { border: 'border-amber-500', bg: 'bg-amber-500', text: 'text-amber-500', shadow: 'shadow-amber-500/50', ring: 'ring-amber-500' },
  yellow: { border: 'border-yellow-400', bg: 'bg-yellow-400', text: 'text-yellow-400', shadow: 'shadow-yellow-400/50', ring: 'ring-yellow-400' },
  lime: { border: 'border-lime-500', bg: 'bg-lime-500', text: 'text-lime-500', shadow: 'shadow-lime-500/50', ring: 'ring-lime-500' },
  green: { border: 'border-green-500', bg: 'bg-green-500', text: 'text-green-500', shadow: 'shadow-green-500/50', ring: 'ring-green-500' },
  emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-500', shadow: 'shadow-emerald-500/50', ring: 'ring-emerald-500' },
  teal: { border: 'border-teal-500', bg: 'bg-teal-500', text: 'text-teal-500', shadow: 'shadow-teal-500/50', ring: 'ring-teal-500' },
  cyan: { border: 'border-cyan-500', bg: 'bg-cyan-500', text: 'text-cyan-500', shadow: 'shadow-cyan-500/50', ring: 'ring-cyan-500' },
  sky: { border: 'border-sky-500', bg: 'bg-sky-500', text: 'text-sky-500', shadow: 'shadow-sky-500/50', ring: 'ring-sky-500' },
  blue: { border: 'border-blue-500', bg: 'bg-blue-500', text: 'text-blue-500', shadow: 'shadow-blue-500/50', ring: 'ring-blue-500' },
  indigo: { border: 'border-indigo-500', bg: 'bg-indigo-500', text: 'text-indigo-500', shadow: 'shadow-indigo-500/50', ring: 'ring-indigo-500' },
  violet: { border: 'border-violet-500', bg: 'bg-violet-500', text: 'text-violet-500', shadow: 'shadow-violet-500/50', ring: 'ring-violet-500' },
  purple: { border: 'border-purple-500', bg: 'bg-purple-500', text: 'text-purple-500', shadow: 'shadow-purple-500/50', ring: 'ring-purple-500' },
  fuchsia: { border: 'border-fuchsia-500', bg: 'bg-fuchsia-500', text: 'text-fuchsia-500', shadow: 'shadow-fuchsia-500/50', ring: 'ring-fuchsia-500' },
  pink: { border: 'border-pink-500', bg: 'bg-pink-500', text: 'text-pink-500', shadow: 'shadow-pink-500/50', ring: 'ring-pink-500' },
  rose: { border: 'border-rose-500', bg: 'bg-rose-500', text: 'text-rose-500', shadow: 'shadow-rose-500/50', ring: 'ring-rose-500' },
};

export const Pad = memo(forwardRef<PadHandle, PadProps>(({ 
  track, 
  isSelected, 
  onSelectVariation, 
  onSelect,
  onTrigger,
  onToggleMute,
  onOpenLibrary,
  shortcutKey 
}, ref) => {
  const variations = ['a', 'b', 'c', 'd'];
  const containerRef = useRef<HTMLDivElement>(null);
  const mainButtonRef = useRef<HTMLButtonElement>(null);
  
  // Long Press Refs
  const timeoutRef = useRef<number | null>(null);
  const isLongPress = useRef(false);
  
  const styles = PAD_COLORS[track.color] || PAD_COLORS['orange'];

  useImperativeHandle(ref, () => ({
    trigger: (playedVariation: number) => {
      if (mainButtonRef.current) {
          mainButtonRef.current.classList.remove('animate-pad-press');
          // Use RequestAnimationFrame to avoid synchronous reflow and allow audio to process
          requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                  if (mainButtonRef.current) mainButtonRef.current.classList.add('animate-pad-press');
              });
          });
      }
    }
  }));

  const handleVariationClick = (index: number, e: React.PointerEvent) => {
      e.stopPropagation(); 
      // Ensure we don't trigger the main select if clicking the variation buttons
      onSelect(track.id);
      onSelectVariation(track.id, index);
  };

  const handleMainDown = (e: React.PointerEvent) => {
      // Audio Trigger First
      onTrigger(track.id); 
      onSelect(track.id);
      
      // Visual Feedback
      if (mainButtonRef.current) {
          mainButtonRef.current.classList.remove('animate-pad-press');
          requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                 if (mainButtonRef.current) mainButtonRef.current.classList.add('animate-pad-press');
              });
          });
      }

      isLongPress.current = false;
      timeoutRef.current = window.setTimeout(() => {
          isLongPress.current = true;
          onToggleMute(track.id);
          if (navigator.vibrate) navigator.vibrate(50);
      }, 800);
  };

  const handleMainUp = () => {
      if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
      }
  };

  const handleLibraryPointerDown = (e: React.PointerEvent) => {
      e.stopPropagation();
      onOpenLibrary(track.id);
  };

  return (
    <div 
      ref={containerRef}
      className={`
        relative w-full aspect-square rounded-[4px] shadow-[0_3px_0_rgba(0,0,0,0.3)] 
        overflow-hidden select-none touch-none
        border-[2px]
        ${styles.border} 
        bg-neutral-900
      `}
    >
      {/* 4 CORNER BUTTONS FOR VARIATIONS (Background Layer - No Gaps) */}
      {variations.map((label, i) => (
         <button
            key={i}
            onPointerDown={(e) => handleVariationClick(i, e)}
            className={`
                absolute w-[50%] h-[50%] flex text-[10px] font-bold transition-colors duration-75 z-0 cursor-pointer
                ${track.variation === i ? `${styles.text} bg-white/10` : 'text-neutral-600 hover:text-neutral-400 hover:bg-white/5 active:bg-white/20'}
                ${i === 0 ? 'top-0 left-0 items-start justify-start pl-2 pt-2' : ''}
                ${i === 1 ? 'top-0 right-0 items-start justify-end pr-2 pt-2' : ''}
                ${i === 2 ? 'bottom-0 left-0 items-end justify-start pl-2 pb-2' : ''}
                ${i === 3 ? 'bottom-0 right-0 items-end justify-end pr-2 pb-2' : ''}
            `}
         >
             {label}
         </button>
      ))}

      {/* MAIN TRIGGER AREA (Compact Center Square - 46% area - easy to hit corners) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[46%] h-[46%] z-10 flex items-center justify-center pointer-events-none"> 
          <button
             ref={mainButtonRef}
             onPointerDown={handleMainDown}
             onPointerUp={handleMainUp}
             onPointerLeave={handleMainUp}
             className={`
                pointer-events-auto
                w-full h-full rounded-[4px] shadow-lg flex flex-col items-center justify-center relative
                transition-all active:scale-95 cursor-pointer
                ${isSelected 
                    ? `${styles.bg} text-white ring-2 ring-white/20 border-0` 
                    : `bg-neutral-800 ${styles.text} border-[2px] ${styles.border}`}
                ${track.muted ? 'opacity-40 grayscale' : ''}
             `}
          >
              {/* Label */}
              <span className={`
                font-black font-mono text-[9px] sm:text-[10px] uppercase tracking-tighter leading-none text-center px-0.5
                truncate w-full drop-shadow-md
              `}>
                  {track.name}
              </span>
              
              {/* Muted Overlay Text */}
              {track.muted && (
                  <span className="absolute text-[9px] font-black text-red-500 bg-black/80 px-1 rotate-12 border border-red-500 z-20">MUTE</span>
              )}

              {/* Library Selector - Bottom Right Corner */}
              <div 
                onPointerDown={handleLibraryPointerDown}
                className={`
                    absolute -bottom-1 -right-1 w-6 h-6 flex items-center justify-center cursor-pointer 
                    rounded-tl-md hover:bg-white/20 transition-colors
                    ${isSelected ? 'text-white/70' : styles.text}
                `}
              >
                  <ChevronDownIcon className="w-3 h-3 relative z-10" />
              </div>

          </button>
      </div>

      {/* Key Shortcut Badge */}
      <div className="absolute top-0.5 left-1 pointer-events-none z-20">
         <span className="text-[8px] font-mono font-bold text-neutral-500 opacity-60">
            {shortcutKey.toUpperCase()}
         </span>
      </div>

    </div>
  );
}));