
import React, { useRef } from 'react';

interface PitchModWheelsProps {
    onPitchChange: (val: number) => void;
    onModChange: (val: number) => void;
    pitchValue: number; 
    modValue: number;   
}

export const PitchModWheels: React.FC<PitchModWheelsProps> = ({ 
    onPitchChange, onModChange, pitchValue, modValue 
}) => {
    const pitchRef = useRef<HTMLDivElement>(null);
    const modRef = useRef<HTMLDivElement>(null);

    const handleWheel = (e: React.PointerEvent, type: 'pitch' | 'mod') => {
        e.preventDefault();
        const el = type === 'pitch' ? pitchRef.current : modRef.current;
        if (!el) return;
        el.setPointerCapture(e.pointerId);
        const startY = e.clientY;
        const startVal = type === 'pitch' ? pitchValue : modValue;
        const onMove = (ev: PointerEvent) => {
            const delta = (startY - ev.clientY) / 150; 
            let next = startVal + delta;
            if (type === 'pitch') {
                next = Math.max(-1, Math.min(1, next));
                if (Math.abs(next) < 0.05) next = 0;
                onPitchChange(next);
            } else {
                next = Math.max(0, Math.min(1, next));
                onModChange(next);
            }
        };
        const onUp = (ev: PointerEvent) => {
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            el.releasePointerCapture(ev.pointerId);
            if (type === 'pitch') onPitchChange(0); 
        };
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
    };

    return (
        <div className="h-full w-16 sm:w-24 bg-[#1a1a1a] rounded-sm border-2 border-[#444] shadow-lg flex flex-col p-1 gap-1 shrink-0">
            <div className="flex-1 flex gap-1 px-0.5 items-center justify-center">
                <div className="flex flex-col items-center h-full w-full">
                    <div ref={pitchRef} onPointerDown={(e) => handleWheel(e, 'pitch')} className="relative w-full h-full bg-[#050505] rounded-sm overflow-hidden border-x border-white/10 shadow-inner cursor-ns-resize touch-none">
                         <div className="absolute left-0 right-0 top-0 bottom-0" style={{
                                transform: `perspective(100px) rotateX(${pitchValue * -40}deg)`,
                                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.9) 100%)`,
                                backgroundSize: '100% 15px'
                            }}>
                             <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.8)]"></div>
                         </div>
                    </div>
                    <span className="text-[7px] font-black text-neutral-500 mt-0.5">PIT</span>
                </div>
                <div className="flex flex-col items-center h-full w-full">
                    <div ref={modRef} onPointerDown={(e) => handleWheel(e, 'mod')} className="relative w-full h-full bg-[#050505] rounded-sm overflow-hidden border-x border-white/10 shadow-inner cursor-ns-resize touch-none">
                         <div className="absolute left-0 right-0 top-0 bottom-0" style={{
                                transform: `perspective(100px) rotateX(${(modValue - 0.5) * -40}deg)`,
                                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.9) 100%)`,
                                backgroundSize: '100% 15px'
                            }}>
                             <div className="absolute left-0 right-0 h-[2px] bg-white/40" style={{ top: `${(1 - modValue) * 80 + 10}%` }}></div>
                         </div>
                    </div>
                    <span className="text-[7px] font-black text-neutral-500 mt-0.5">MOD</span>
                </div>
            </div>
        </div>
    );
};
