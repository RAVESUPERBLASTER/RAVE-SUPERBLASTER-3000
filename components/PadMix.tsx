
import React, { memo, useRef, forwardRef, useImperativeHandle } from 'react';
import { Track } from '../types';
import { Pad, PadHandle } from './Pad';
import { TrashIcon } from '@heroicons/react/24/solid';

export interface PadMixHandle {
    trigger: (variation: number) => void;
}

interface PadMixProps {
    track: Track;
    isSelected: boolean;
    onSelect: (id: number) => void;
    onSelectVariation: (id: number, variation: number) => void;
    onTrigger: (id: number) => void;
    onToggleMute: (id: number) => void;
    onOpenLibrary: (id: number) => void;
    
    // Mixer Props
    onUpdateVolume: (id: number, volume: number) => void;
    onUpdatePitch: (id: number, val: number) => void;
    onUpdateEffect: (id: number, type: 'reverb' | 'delay' | 'filter' | 'bitcrush' | 'stutter' | 'glitch', param: 'active' | 'value', val: number | boolean) => void;
    
    // Management Props
    onDelete: (id: number) => void;
    onColorChange: (id: number, color: string) => void;
    shortcutKey: string;
    
    // Automation Animation Props
    currentStep: number;
    isPlaying: boolean;
}

// Reuse constants from Mixer to keep logic consistent
const ZERO_DB_GAIN = 1.0;
const MAX_GAIN = 31.62; 
const ZERO_DB_POS = 0.75; 

const gainToHeight = (gain: number) => {
    if (gain <= 0) return 0;
    if (gain <= ZERO_DB_GAIN) return (gain / ZERO_DB_GAIN) * ZERO_DB_POS;
    return ZERO_DB_POS + (1 - ZERO_DB_POS) * (Math.log(gain) / Math.log(MAX_GAIN));
};

const heightToGain = (height: number) => {
    const h = Math.max(0, Math.min(1, height));
    if (h <= ZERO_DB_POS) return (h / ZERO_DB_POS) * ZERO_DB_GAIN;
    return Math.pow(MAX_GAIN, (h - ZERO_DB_POS) / (1 - ZERO_DB_POS));
};

const COLOR_MAP: Record<string, string> = {
    red: 'bg-red-600', orange: 'bg-orange-500', amber: 'bg-amber-500', yellow: 'bg-yellow-400',
    lime: 'bg-lime-500', green: 'bg-green-600', emerald: 'bg-emerald-500', teal: 'bg-teal-500',
    cyan: 'bg-cyan-500', sky: 'bg-sky-500', blue: 'bg-blue-600', indigo: 'bg-indigo-500',
    violet: 'bg-violet-500', purple: 'bg-purple-600', fuchsia: 'bg-fuchsia-500', pink: 'bg-pink-500',
    rose: 'bg-rose-500', white: 'bg-white'
};

const COLORS_LIST = Object.keys(COLOR_MAP);

const EffectKnob = memo(({ label, active, value, trackColor, onToggle, onChange, isAutomated }: any) => {
    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation();
        const elm = e.currentTarget; elm.setPointerCapture(e.pointerId);
        const startY = e.clientY; const startValue = value; const startTime = Date.now();
        let hasMoved = false;

        const handleMove = (me: PointerEvent) => {
            if (Math.abs(startY - me.clientY) > 3) {
                hasMoved = true;
                const change = (startY - me.clientY) / 150;
                onChange(Math.min(1, Math.max(0, startValue + change)));
            }
        };

        const handleUp = (me: PointerEvent) => {
            if (!hasMoved && Date.now() - startTime < 250) onToggle();
            elm.removeEventListener('pointermove', handleMove as any);
            elm.removeEventListener('pointerup', handleUp as any);
            elm.releasePointerCapture(me.pointerId);
        };
        elm.addEventListener('pointermove', handleMove as any);
        elm.addEventListener('pointerup', handleUp as any);
    };

    return (
        <div onPointerDown={handlePointerDown} className="flex flex-col items-center justify-center cursor-ns-resize touch-none select-none w-full group relative">
            <div className={`w-7 h-7 rounded-full relative shadow-sm transition-transform active:scale-95 ${active ? 'bg-[#222] border border-black' : 'bg-[#e0e0e0] border border-[#bbb] hover:bg-[#eee]'}`}>
                {active && <div className={`absolute inset-0 rounded-full opacity-10 ${COLOR_MAP[trackColor]}`}></div>}
                
                {/* Knob Indicator */}
                <div className="absolute inset-0 w-full h-full transition-transform duration-75 ease-linear" style={{ transform: `rotate(${-135 + (value * 270)}deg)` }}>
                    <div className={`absolute top-[3px] left-1/2 -translate-x-1/2 w-1 h-2.5 rounded-full shadow-sm ${active ? COLOR_MAP[trackColor] : 'bg-neutral-400'}`}></div>
                </div>

                {/* Automation Dot Indicator */}
                {isAutomated && (
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full border border-black z-20"></div>
                )}
            </div>
            <span className={`text-[8px] font-black uppercase mt-1 tracking-tighter scale-90 ${active ? 'text-black' : 'text-neutral-400'}`}>{label}</span>
        </div>
    );
});

export const PadMix = memo(forwardRef<PadMixHandle, PadMixProps>(({
    track, isSelected, onSelect, onSelectVariation, onTrigger, onToggleMute, onOpenLibrary,
    onUpdateVolume, onUpdatePitch, onUpdateEffect, onDelete, onColorChange, shortcutKey,
    currentStep, isPlaying
}, ref) => {
    
    const padRef = useRef<PadHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        trigger: (variation: number) => {
            padRef.current?.trigger(variation);
            // Async class switching to prevent synchronous reflow during audio trigger
            if (containerRef.current) {
                containerRef.current.classList.remove('animate-flash');
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (containerRef.current) containerRef.current.classList.add('animate-flash');
                    });
                });
            }
            if (overlayRef.current) {
                overlayRef.current.classList.remove('animate-overlay-pulse');
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (overlayRef.current) overlayRef.current.classList.add('animate-overlay-pulse');
                    });
                });
            }
        }
    }));

    const handleFader = (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation();
        const el = e.currentTarget; el.setPointerCapture(e.pointerId);
        const rect = el.getBoundingClientRect();
        const update = (clientY: number) => {
            const h = 1 - ((clientY - rect.top) / rect.height);
            onUpdateVolume(track.id, heightToGain(h));
        };
        update(e.clientY);
        const move = (pe: PointerEvent) => { if(pe.pointerId === e.pointerId) update(pe.clientY); }
        const up = (pe: PointerEvent) => { if(pe.pointerId === e.pointerId) { el.releasePointerCapture(pe.pointerId); el.removeEventListener('pointermove', move as any); el.removeEventListener('pointerup', up as any); }}
        el.addEventListener('pointermove', move as any);
        el.addEventListener('pointerup', up as any);
    };

    // --- Automation Value Logic ---
    const getAutomatedValue = (paramKey: string, baseValue: number) => {
        if (!isPlaying) return baseValue;
        const auto = track.patterns[track.activePatternIdx].automation?.[paramKey];
        if (auto && auto[currentStep] !== null && auto[currentStep] !== undefined) {
            return auto[currentStep] as number;
        }
        return baseValue;
    };
    
    const isParamAutomated = (paramKey: string) => {
        const auto = track.patterns[track.activePatternIdx].automation?.[paramKey];
        return auto ? auto.some(v => v !== null) : false;
    };

    const liveVolume = getAutomatedValue('volume', track.volume);
    const livePitch = getAutomatedValue('pitch', track.pitch);
    const faderH = Math.min(100, gainToHeight(liveVolume) * 100);
    const volAutomated = isParamAutomated('volume');

    // Effect Values
    const getEffVal = (type: string, field: 'value' | 'active') => {
        const key = `effects.${type}.${field}`;
        const base = (track.effects as any)[type][field];
        const val = getAutomatedValue(key, typeof base === 'boolean' ? (base ? 1 : 0) : base);
        // If field is active (boolean), convert back
        if (field === 'active') return val > 0.5;
        return val;
    };

    return (
        <div ref={containerRef} className={`relative flex flex-row w-full bg-[#dcdcdc] rounded-sm border border-black/20 shadow-sm shrink-0 transition-all ${isSelected ? 'ring-2 ring-orange-500 z-10' : 'hover:border-black/40'}`}>
            {/* LEFT: PAD (Massive Square) */}
            <div className="flex-1 min-w-0 p-1 border-r border-black/10 flex flex-col justify-center bg-[#eaeaea]">
                <Pad 
                    ref={padRef}
                    track={track}
                    isSelected={isSelected}
                    onSelect={onSelect}
                    onSelectVariation={onSelectVariation}
                    onTrigger={onTrigger}
                    onToggleMute={onToggleMute}
                    onOpenLibrary={onOpenLibrary}
                    shortcutKey={shortcutKey}
                />
            </div>

            {/* RIGHT: MIXER STRIP (Compact w-20) */}
            <div className="w-20 flex flex-col p-1 gap-1 bg-[#dcdcdc] shrink-0">
                {/* Header Row */}
                <div className="flex justify-between items-center px-1 pb-1 border-b border-black/10 shrink-0">
                    <span className="text-[9px] font-black text-neutral-600 truncate max-w-[30px]">{track.id + 1}. {track.name}</span>
                    <div className="flex items-center gap-0.5">
                        <div className="relative group">
                             <div className={`w-2 h-2 rounded-full cursor-pointer ${COLOR_MAP[track.color]} border border-black/20`}></div>
                             <div className="absolute right-0 top-full mt-1 bg-white p-1 rounded shadow-lg border border-black/20 hidden group-hover:grid grid-cols-4 gap-1 z-50 w-24">
                                {COLORS_LIST.map(c => (
                                    <button key={c} onClick={(e) => { e.stopPropagation(); onColorChange(track.id, c); }} className={`w-4 h-4 rounded-full ${COLOR_MAP[c]} hover:scale-110 border border-black/10`}></button>
                                ))}
                             </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(track.id); }} className="text-neutral-400 hover:text-red-500 transition-colors">
                            <TrashIcon className="w-2 h-2" />
                        </button>
                    </div>
                </div>

                {/* Mixer Controls */}
                <div className="flex-1 flex gap-1 min-h-0">
                    {/* Knobs Area - Spaced out vertically */}
                    <div className="flex-1 flex flex-col py-2 justify-between items-center">
                        <div className="w-full flex justify-center border-b border-black/5 pb-2 mb-1">
                            <div className="w-10">
                                <EffectKnob 
                                    label="PITCH" active={true} 
                                    value={(Math.max(-3, Math.min(3, livePitch)) + 3) / 6} 
                                    trackColor={track.color} 
                                    isAutomated={isParamAutomated('pitch')}
                                    onToggle={() => onUpdatePitch(track.id, 0)} 
                                    onChange={(v: number) => onUpdatePitch(track.id, (v*6)-3)} 
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-1 gap-y-3 w-full justify-items-center content-center flex-1">
                             <EffectKnob label="FLT" active={getEffVal('filter','active')} value={getEffVal('filter','value')} trackColor={track.color} isAutomated={isParamAutomated('effects.filter.value')} onToggle={() => onUpdateEffect(track.id, 'filter', 'active', !track.effects.filter.active)} onChange={(v: number) => onUpdateEffect(track.id, 'filter', 'value', v)} />
                             <EffectKnob label="REV" active={getEffVal('reverb','active')} value={getEffVal('reverb','value')} trackColor={track.color} isAutomated={isParamAutomated('effects.reverb.value')} onToggle={() => onUpdateEffect(track.id, 'reverb', 'active', !track.effects.reverb.active)} onChange={(v: number) => onUpdateEffect(track.id, 'reverb', 'value', v)} />
                             <EffectKnob label="DLY" active={getEffVal('delay','active')} value={getEffVal('delay','value')} trackColor={track.color} isAutomated={isParamAutomated('effects.delay.value')} onToggle={() => onUpdateEffect(track.id, 'delay', 'active', !track.effects.delay.active)} onChange={(v: number) => onUpdateEffect(track.id, 'delay', 'value', v)} />
                             <EffectKnob label="BIT" active={getEffVal('bitcrush','active')} value={getEffVal('bitcrush','value')} trackColor={track.color} isAutomated={isParamAutomated('effects.bitcrush.value')} onToggle={() => onUpdateEffect(track.id, 'bitcrush', 'active', !track.effects.bitcrush.active)} onChange={(v: number) => onUpdateEffect(track.id, 'bitcrush', 'value', v)} />
                             <EffectKnob label="STU" active={getEffVal('stutter','active')} value={getEffVal('stutter','value')} trackColor={track.color} isAutomated={isParamAutomated('effects.stutter.value')} onToggle={() => onUpdateEffect(track.id, 'stutter', 'active', !track.effects.stutter.active)} onChange={(v: number) => onUpdateEffect(track.id, 'stutter', 'value', v)} />
                             <EffectKnob label="GLI" active={getEffVal('glitch','active')} value={getEffVal('glitch','value')} trackColor={track.color} isAutomated={isParamAutomated('effects.glitch.value')} onToggle={() => onUpdateEffect(track.id, 'glitch', 'active', !track.effects.glitch.active)} onChange={(v: number) => onUpdateEffect(track.id, 'glitch', 'value', v)} />
                        </div>
                    </div>

                    {/* Fader Area */}
                    <div className="w-6 flex flex-col justify-end pb-1">
                        <div className="relative w-full flex-1 bg-[#222] rounded-sm border border-white/10 overflow-hidden cursor-ns-resize touch-none shadow-inner" onPointerDown={handleFader}>
                            {/* Automation Indicator Line */}
                            {volAutomated && <div className="absolute top-0 right-0 w-[2px] h-full bg-red-500/20 z-0"></div>}
                            
                            <div className="absolute left-0 right-0 h-[1px] bg-white/30 z-0 pointer-events-none" style={{ bottom: `${ZERO_DB_POS * 100}%` }}></div>
                            <div className={`absolute bottom-0 left-0 w-full transition-all duration-75 ease-linear ${liveVolume > ZERO_DB_GAIN ? 'bg-red-500 mix-blend-screen' : COLOR_MAP[track.color]} opacity-80`} style={{ height: `${faderH}%` }}></div>
                            <div className={`absolute left-0 w-full h-[3px] bg-white shadow-sm z-10 pointer-events-none transition-all duration-75 ease-linear ${liveVolume > ZERO_DB_GAIN ? 'bg-red-100' : 'bg-neutral-300'}`} style={{ bottom: `calc(${faderH}% - 1px)` }}></div>
                        </div>
                        <button onClick={() => onToggleMute(track.id)} className={`mt-1 h-5 text-[9px] font-black rounded border-b-2 active:border-b-0 active:translate-y-[2px] transition-all ${track.muted ? 'bg-neutral-800 text-red-500 border-black' : 'bg-neutral-300 text-neutral-600 border-neutral-400'}`}>M</button>
                    </div>
                </div>
            </div>
            
            {/* Trigger Light Overlay */}
            <div ref={overlayRef} className="absolute inset-0 bg-white opacity-0 pointer-events-none z-20"></div>
        </div>
    );
}));
