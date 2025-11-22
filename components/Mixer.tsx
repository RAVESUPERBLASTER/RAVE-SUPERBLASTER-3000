
import React, { memo, useRef, forwardRef, useImperativeHandle } from 'react';
import { Track } from '../types';

export interface MixerHandle { trigger: (id: number) => void; }

interface MixerProps {
  tracks: Track[];
  onUpdateVolume: (id: number, volume: number) => void;
  onUpdateEffect: (id: number, type: any, param: any, val: any) => void;
  onToggleMute: (id: number) => void;
  activeTrackId: number;
  currentStep: number;
  isPlaying: boolean;
  activeScene: number;
}

const COLOR_MAP: Record<string, string> = {
    red: 'bg-red-600', orange: 'bg-orange-500', amber: 'bg-amber-500', yellow: 'bg-yellow-400',
    lime: 'bg-lime-500', green: 'bg-green-600', emerald: 'bg-emerald-500', teal: 'bg-teal-500',
    cyan: 'bg-cyan-500', sky: 'bg-sky-500', blue: 'bg-blue-600', indigo: 'bg-indigo-500',
    violet: 'bg-violet-500', purple: 'bg-purple-600', fuchsia: 'bg-fuchsia-500', pink: 'bg-pink-500',
    rose: 'bg-rose-500', white: 'bg-white',
};

const EffectKnob = memo(({ label, active, value, trackColor, onToggle, onChange }: any) => {
    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation();
        const elm = e.currentTarget;
        elm.setPointerCapture(e.pointerId);
        const startY = e.clientY;
        const startValue = value;
        const startTime = Date.now();
        let hasMoved = false;
        const onMove = (me: PointerEvent) => {
            if (Math.abs(startY - me.clientY) > 3) {
                hasMoved = true;
                onChange(Math.min(1, Math.max(0, startValue + (startY - me.clientY) / 100)));
            }
        };
        const onUp = () => {
            if (!hasMoved && Date.now() - startTime < 200) onToggle();
            elm.removeEventListener('pointermove', onMove as any);
            elm.removeEventListener('pointerup', onUp as any);
            elm.releasePointerCapture(e.pointerId);
        };
        elm.addEventListener('pointermove', onMove as any);
        elm.addEventListener('pointerup', onUp as any);
    };
    return (
        <div onPointerDown={handlePointerDown} className="flex flex-col items-center justify-center cursor-ns-resize touch-none w-full">
            <div className={`w-6 h-6 rounded-full relative shadow-sm transition-transform active:scale-95 ${active ? 'bg-[#222] border border-black' : 'bg-[#e0e0e0] border border-[#bbb]'}`}>
                {active && <div className={`absolute inset-0 rounded-full opacity-20 ${COLOR_MAP[trackColor]}`}></div>}
                <div className="absolute inset-0 w-full h-full" style={{ transform: `rotate(${-135 + (value * 270)}deg)` }}>
                    <div className={`absolute top-[2px] left-1/2 -translate-x-1/2 w-0.5 h-2 rounded-full ${active ? COLOR_MAP[trackColor] : 'bg-neutral-400'}`}></div>
                </div>
            </div>
            <span className={`text-[7px] font-black uppercase mt-0.5 ${active ? 'text-black' : 'text-neutral-400'}`}>{label}</span>
        </div>
    );
});

const MixerChannel = memo(forwardRef(({ track, isActive, isTriggered, onUpdateVolume, onToggleMute, onUpdateEffect }: any, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => ({
        trigger: () => {
            if (containerRef.current) {
                containerRef.current.classList.remove('animate-mixer-flash');
                void containerRef.current.offsetWidth;
                containerRef.current.classList.add('animate-mixer-flash');
            }
        }
    }));
    const handleFader = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        const container = e.currentTarget;
        container.setPointerCapture(e.pointerId);
        const rect = container.getBoundingClientRect();
        const update = (cy: number) => onUpdateVolume(track.id, Math.max(0, Math.min(1, 1 - (cy - rect.top) / rect.height)));
        update(e.clientY);
        const onMove = (pe: PointerEvent) => update(pe.clientY);
        const onUp = () => {
            container.removeEventListener('pointermove', onMove as any);
            container.removeEventListener('pointerup', onUp as any);
            container.releasePointerCapture(e.pointerId);
        };
        container.addEventListener('pointermove', onMove as any);
        container.addEventListener('pointerup', onUp as any);
    };
    return (
        <div ref={containerRef} className={`flex flex-col p-1 rounded bg-[#d8d8d8] border transition-all relative min-h-0 ${isActive ? 'border-neutral-600 ring-1 ring-neutral-400' : 'border-neutral-300'}`}>
            <style>{` @keyframes mixerFlash { 0% { background: #fff; } 100% { background: #d8d8d8; } } .animate-mixer-flash { animation: mixerFlash 0.15s ease-out; } `}</style>
            <div className="flex justify-between items-center mb-1 border-b border-neutral-300/50 pb-0.5">
                 <span className={`text-[8px] font-black truncate ${isActive ? 'text-black' : 'text-neutral-600'}`}>{track.id + 1}</span>
                 {isTriggered && <div className={`w-1.5 h-1.5 rounded-full ${COLOR_MAP[track.color]} animate-pulse`}></div>}
            </div>
            <div className="flex flex-1 gap-1 min-h-0">
                <div className="flex-1 grid grid-cols-2 gap-y-1 content-center justify-items-center">
                        {['filter', 'reverb', 'delay', 'bitcrush', 'stutter', 'glitch'].map(fx => (
                            <EffectKnob key={fx} label={fx.substring(0,3)} active={track.effects[fx].active} value={track.effects[fx].value} trackColor={track.color} onToggle={() => onUpdateEffect(track.id, fx, 'active', !track.effects[fx].active)} onChange={(v: number) => onUpdateEffect(track.id, fx, 'value', v)} />
                        ))}
                </div>
                <div className="w-6 flex flex-col gap-1 h-full">
                    <div className="flex-1 relative bg-[#222] rounded-sm border border-white/10 touch-none cursor-ns-resize" onPointerDown={handleFader}>
                        <div className={`absolute bottom-0 w-full opacity-60 ${COLOR_MAP[track.color]}`} style={{ height: `${track.volume * 100}%` }}></div>
                        <div className="absolute left-0 right-0 h-2 bg-neutral-300 border-y border-black/50 shadow-sm pointer-events-none" style={{ bottom: `calc(${track.volume * 100}% - 4px)` }}></div>
                    </div>
                    <button onClick={() => onToggleMute(track.id)} className={`h-5 w-full rounded-[1px] text-[8px] font-bold ${track.muted ? 'bg-neutral-800 text-red-500' : 'bg-neutral-300 text-neutral-600'}`}>M</button>
                </div>
            </div>
        </div>
    );
}));

export const Mixer = memo(forwardRef<MixerHandle, MixerProps>(({ tracks, onUpdateVolume, onUpdateEffect, onToggleMute, activeTrackId, currentStep, isPlaying }, ref) => {
  const channelRefs = useRef<(any)[]>([]);
  useImperativeHandle(ref, () => ({ trigger: (id: number) => channelRefs.current[id]?.trigger() }));
  return (
    <div className="grid grid-cols-5 grid-rows-3 gap-1 h-full w-full">
        {tracks.map((track) => (
            <MixerChannel key={track.id} ref={(el: any) => { channelRefs.current[track.id] = el }} track={track} isActive={activeTrackId === track.id} isTriggered={isPlaying && track.patterns[track.activePatternIdx].steps[currentStep]} onUpdateVolume={onUpdateVolume} onToggleMute={onToggleMute} onUpdateEffect={onUpdateEffect} />
        ))}
    </div>
  );
}));
