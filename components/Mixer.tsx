import React, { memo, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Track } from '../types';

export interface MixerHandle {
  trigger: (id: number) => void;
}

interface MixerProps {
  tracks: Track[];
  onUpdateVolume: (id: number, volume: number) => void;
  onUpdateEffect: (id: number, type: 'reverb' | 'delay' | 'filter' | 'bitcrush' | 'stutter' | 'glitch', param: 'active' | 'value', val: number | boolean) => void;
  onUpdatePitch: (id: number, val: number) => void;
  onToggleMute: (id: number) => void;
  activeTrackId: number;
  currentStep: number;
  isPlaying: boolean;
  activeScene: number;
}

interface EffectKnobProps {
    label: string;
    active: boolean;
    value: number;
    trackColor: string;
    onToggle: () => void;
    onChange: (v: number) => void;
}

interface MixerChannelHandle {
    trigger: () => void;
}

interface MixerChannelProps {
    track: Track;
    isActive: boolean;
    isTriggered: boolean;
    onUpdateVolume: (id: number, v: number) => void;
    onToggleMute: (id: number) => void;
    onUpdateEffect: (id: number, type: any, param: any, val: any) => void;
    onUpdatePitch: (id: number, val: number) => void;
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

// --- Gain Scale Constants ---
const ZERO_DB_GAIN = 1.0;
const MAX_GAIN = 31.62; // +30dB approx (10^(30/20))
const ZERO_DB_POS = 0.75; // 0dB point at 75% height

// Convert linear Gain value to UI Height (0-1)
const gainToHeight = (gain: number) => {
    if (gain <= 0) return 0;
    if (gain <= ZERO_DB_GAIN) {
        // Linear mapping for the bottom section
        return (gain / ZERO_DB_GAIN) * ZERO_DB_POS;
    }
    // Logarithmic mapping for the top boost section (1.0 to 31.62)
    const rel = Math.log(gain) / Math.log(MAX_GAIN);
    // Scale rel back to range [ZERO_DB_POS, 1.0]
    // Note: log(1) = 0, log(MAX) = log(MAX). 
    // We actually need mapping from [1, MAX] -> [ZERO_DB_POS, 1]
    // A simple power curve works better for feel:
    // rel = (gain - 1) is handled linearly in log space above? 
    // Let's use the exponent relation: gain = MAX_GAIN^((h - 0.75)/0.25)
    
    // Reverse:
    // log(gain) = ((h - 0.75)/0.25) * log(MAX_GAIN)
    // h = 0.75 + 0.25 * (log(gain)/log(MAX_GAIN))
    
    return ZERO_DB_POS + (1 - ZERO_DB_POS) * (Math.log(gain) / Math.log(MAX_GAIN));
};

// Convert UI Height (0-1) to linear Gain value
const heightToGain = (height: number) => {
    const h = Math.max(0, Math.min(1, height));
    if (h <= ZERO_DB_POS) {
        return (h / ZERO_DB_POS) * ZERO_DB_GAIN;
    }
    // Exponential boost above 0dB
    const rel = (h - ZERO_DB_POS) / (1 - ZERO_DB_POS);
    // gain = MAX_GAIN^rel
    return Math.pow(MAX_GAIN, rel);
};


const EffectKnob = ({ label, active, value, trackColor, onToggle, onChange }: EffectKnobProps) => {
    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const elm = e.currentTarget;
        elm.setPointerCapture(e.pointerId);
        
        const startY = e.clientY;
        const startValue = value;
        const startTime = Date.now();
        let hasMoved = false;

        const handlePointerMove = (me: PointerEvent) => {
            const deltaY = startY - me.clientY;
            if (Math.abs(deltaY) > 3) {
                hasMoved = true;
                const change = deltaY / 150;
                const next = Math.min(1, Math.max(0, startValue + change));
                onChange(next);
            }
        };

        const handlePointerUp = (me: PointerEvent) => {
            const duration = Date.now() - startTime;
            if (!hasMoved && duration < 250) {
                onToggle();
            }
            
            elm.removeEventListener('pointermove', handlePointerMove as any);
            elm.removeEventListener('pointerup', handlePointerUp as any);
            elm.releasePointerCapture(e.pointerId);
        };

        elm.addEventListener('pointermove', handlePointerMove as any);
        elm.addEventListener('pointerup', handlePointerUp as any);
    };

    const rotation = -135 + (value * 270);

    return (
        <div 
            onPointerDown={handlePointerDown}
            className="flex flex-col items-center justify-center cursor-ns-resize touch-none select-none group w-full"
        >
            <div className={`
                w-7 h-7 rounded-full relative shadow-[0_2px_4px_rgba(0,0,0,0.15)] transition-transform active:scale-95
                ${active 
                    ? 'bg-[#222] border border-black' 
                    : 'bg-[#e0e0e0] border border-[#bbb] hover:bg-[#eee]'}
            `}>
                {active && (
                     <div className={`absolute inset-0 rounded-full opacity-10 ${COLOR_MAP[trackColor]}`}></div>
                )}

                <div 
                    className="absolute inset-0 w-full h-full"
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    <div className={`
                        absolute top-[3px] left-1/2 -translate-x-1/2 w-1 h-2.5 rounded-full shadow-sm
                        ${active ? COLOR_MAP[trackColor] : 'bg-neutral-400'}
                    `}></div>
                </div>
            </div>
            
            <span className={`text-[8px] font-black uppercase mt-0.5 tracking-tight leading-none ${active ? 'text-black' : 'text-neutral-400'}`}>
                {label}
            </span>
        </div>
    );
};

const MixerChannel = memo(forwardRef<MixerChannelHandle, MixerChannelProps>(({ 
    track, isActive, isTriggered, onUpdateVolume, onToggleMute, onUpdateEffect, onUpdatePitch
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        trigger: () => {
            if (containerRef.current) {
                containerRef.current.classList.remove('animate-mixer-flash');
                void containerRef.current.offsetWidth; // Reflow
                containerRef.current.classList.add('animate-mixer-flash');
            }
        }
    }));

    const handleFaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const container = e.currentTarget;
        container.setPointerCapture(e.pointerId);
        
        const rect = container.getBoundingClientRect();
        const height = rect.height;

        const updateVolume = (clientY: number) => {
            const relativeY = clientY - rect.top;
            const normalizedHeight = 1 - (relativeY / height);
            // Convert Height (0-1) to Gain (0-31.6)
            const newGain = heightToGain(normalizedHeight);
            onUpdateVolume(track.id, newGain);
        };
        
        updateVolume(e.clientY);

        const onPointerMove = (pe: PointerEvent) => {
            if (pe.pointerId === e.pointerId) {
                 updateVolume(pe.clientY);
            }
        };

        const onPointerUp = (pe: PointerEvent) => {
            if (pe.pointerId === e.pointerId) {
                container.removeEventListener('pointermove', onPointerMove as any);
                container.removeEventListener('pointerup', onPointerUp as any);
                container.releasePointerCapture(e.pointerId);
            }
        };

        container.addEventListener('pointermove', onPointerMove as any);
        container.addEventListener('pointerup', onPointerUp as any);
    };

    // Calculate height for rendering based on current gain
    const faderHeightPct = Math.min(100, gainToHeight(track.volume) * 100);

    return (
        <div 
            ref={containerRef}
            className={`
                flex flex-col p-1 rounded bg-[#d8d8d8] border transition-all duration-100 relative overflow-hidden min-h-0 shadow-sm
                ${isActive 
                    ? 'border-neutral-600 ring-1 ring-neutral-400/50 z-10' 
                    : 'border-neutral-300 hover:border-neutral-400'}
                ${track.muted ? 'opacity-70' : 'opacity-100'}
            `}
        >
            <style>{`
                @keyframes mixerFlash {
                    0% { background-color: #ffffff; filter: brightness(1.2); }
                    100% { background-color: #d8d8d8; filter: brightness(1); }
                }
                .animate-mixer-flash {
                    animation: mixerFlash 0.15s ease-out;
                }
            `}</style>

            <div className="flex justify-between items-center mb-1 pb-1 border-b border-neutral-300/50">
                 <span className={`text-[10px] font-black uppercase tracking-tight truncate ${isActive ? 'text-black' : 'text-neutral-600'}`}>
                        {track.id + 1}. {track.name}
                 </span>
                 {isTriggered && (
                     <div className={`w-2 h-2 rounded-full ${COLOR_MAP[track.color]} shadow-sm animate-pulse`}></div>
                 )}
            </div>

            <div className="flex flex-1 gap-1 min-h-0 items-stretch"> 
                
                <div className="flex-1 flex flex-col gap-1">
                    
                    {/* PITCH KNOB (-3 to +3 Octaves) */}
                    <div className="w-full flex justify-center pb-1 border-b border-neutral-300/30">
                        <div className="w-10">
                             <EffectKnob 
                                label="PITCH" 
                                active={true} 
                                // Map Pitch -3..3 to Knob 0..1
                                value={(Math.max(-3, Math.min(3, track.pitch)) + 3) / 6} 
                                trackColor={track.color} 
                                onToggle={() => onUpdatePitch(track.id, 0)} 
                                onChange={(v) => onUpdatePitch(track.id, (v * 6) - 3)} 
                             />
                        </div>
                    </div>

                    {/* Effects Grid */}
                    <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-2 content-center justify-items-center h-full">
                            <EffectKnob label="FLT" active={track.effects.filter.active} value={track.effects.filter.value} trackColor={track.color} 
                                onToggle={() => onUpdateEffect(track.id, 'filter', 'active', !track.effects.filter.active)} onChange={(v) => onUpdateEffect(track.id, 'filter', 'value', v)} />
                            <EffectKnob label="REV" active={track.effects.reverb.active} value={track.effects.reverb.value} trackColor={track.color} 
                                onToggle={() => onUpdateEffect(track.id, 'reverb', 'active', !track.effects.reverb.active)} onChange={(v) => onUpdateEffect(track.id, 'reverb', 'value', v)} />
                            
                            <EffectKnob label="DLY" active={track.effects.delay.active} value={track.effects.delay.value} trackColor={track.color} 
                                onToggle={() => onUpdateEffect(track.id, 'delay', 'active', !track.effects.delay.active)} onChange={(v) => onUpdateEffect(track.id, 'delay', 'value', v)} />
                            <EffectKnob label="BIT" active={track.effects.bitcrush.active} value={track.effects.bitcrush.value} trackColor={track.color} 
                                onToggle={() => onUpdateEffect(track.id, 'bitcrush', 'active', !track.effects.bitcrush.active)} onChange={(v) => onUpdateEffect(track.id, 'bitcrush', 'value', v)} />

                            <EffectKnob label="STU" active={track.effects.stutter.active} value={track.effects.stutter.value} trackColor={track.color} 
                                onToggle={() => onUpdateEffect(track.id, 'stutter', 'active', !track.effects.stutter.active)} onChange={(v) => onUpdateEffect(track.id, 'stutter', 'value', v)} />
                            <EffectKnob label="GLI" active={track.effects.glitch.active} value={track.effects.glitch.value} trackColor={track.color} 
                                onToggle={() => onUpdateEffect(track.id, 'glitch', 'active', !track.effects.glitch.active)} onChange={(v) => onUpdateEffect(track.id, 'glitch', 'value', v)} />
                    </div>
                </div>

                <div className="w-10 flex flex-col gap-1 h-full">
                     
                    <div className="flex-1 flex flex-col items-center justify-end relative">
                        {/* Fader Track */}
                        <div 
                            className="w-6 h-full bg-[#222] rounded-sm relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] border border-white/10 cursor-ns-resize touch-none overflow-hidden"
                            onPointerDown={handleFaderPointerDown}
                        >
                            {/* 0dB Marker - Slight Indication */}
                            <div className="absolute left-0 right-0 h-[1px] bg-white/30 z-0 pointer-events-none" style={{ bottom: `${ZERO_DB_POS * 100}%` }}></div>
                            <div className="absolute right-0.5 text-[6px] text-white/40 font-mono z-0 pointer-events-none" style={{ bottom: `${ZERO_DB_POS * 100 + 1}%` }}>0dB</div>

                            {/* +30dB Warning at top */}
                            <div className="absolute top-0.5 left-0 w-full text-center text-[5px] text-red-500/50 font-black pointer-events-none">+30dB</div>

                            {/* Fill Level */}
                            <div 
                                className={`absolute bottom-0 left-0 w-full opacity-80 pointer-events-none transition-all duration-75 ${track.volume > ZERO_DB_GAIN ? 'bg-red-500 mix-blend-screen' : COLOR_MAP[track.color]}`}
                                style={{ height: `${faderHeightPct}%` }}
                            ></div>
                            
                            {/* If Boosting, show secondary normal level underneath for reference */}
                             {track.volume > ZERO_DB_GAIN && (
                                <div 
                                    className={`absolute bottom-0 left-0 w-full ${COLOR_MAP[track.color]} opacity-50 pointer-events-none transition-all duration-75`}
                                    style={{ height: `${ZERO_DB_POS * 100}%` }}
                                ></div>
                             )}

                            {/* Fader Handle */}
                            <div 
                                className={`
                                    absolute left-1/2 -translate-x-1/2 w-7 h-3
                                    rounded-[1px] shadow-[0_2px_4px_rgba(0,0,0,0.5)] 
                                    border-t border-white/90 border-b border-black/60
                                    flex items-center justify-center z-20 pointer-events-none
                                    group-hover:bg-white
                                    ${track.volume > ZERO_DB_GAIN ? 'bg-red-100' : 'bg-neutral-300'}
                                `}
                                style={{ bottom: `calc(${faderHeightPct}% - 6px)` }} 
                            >
                                <div className="w-full h-[1px] bg-black/30 mt-[1px]"></div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => onToggleMute(track.id)}
                        className={`
                            h-6 w-full rounded-[2px] text-[9px] font-bold uppercase tracking-wider border-b-[2px] active:border-b-0 active:translate-y-[2px] transition-all
                            flex items-center justify-center shadow-sm
                            ${track.muted 
                                ? 'bg-neutral-800 text-red-500 border-neutral-950' 
                                : 'bg-neutral-300 text-neutral-500 border-neutral-400 hover:bg-neutral-200'}
                        `}
                    >
                        M
                    </button>

                </div>
            </div>
        </div>
    );
}));

export const Mixer = memo(forwardRef<MixerHandle, MixerProps>(({ 
    tracks, onUpdateVolume, onUpdateEffect, onUpdatePitch, onToggleMute, activeTrackId, currentStep, isPlaying, activeScene 
}, ref) => {
  
  const channelRefs = useRef<(MixerChannelHandle | null)[]>([]);

  useImperativeHandle(ref, () => ({
    trigger: (id: number) => {
        channelRefs.current[id]?.trigger();
    }
  }));

  return (
    <div className="grid grid-cols-5 grid-rows-3 gap-2 h-full w-full">
        {tracks.map((track, index) => (
            <MixerChannel
                key={track.id}
                ref={(el) => { channelRefs.current[track.id] = el }}
                track={track}
                isActive={activeTrackId === track.id}
                isTriggered={isPlaying && track.patterns[track.activePatternIdx].steps[currentStep]}
                onUpdateVolume={onUpdateVolume}
                onToggleMute={onToggleMute}
                onUpdateEffect={onUpdateEffect}
                onUpdatePitch={onUpdatePitch}
            />
        ))}
    </div>
  );
}));