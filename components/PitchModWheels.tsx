
import React, { useRef } from 'react';

interface PitchModWheelsProps {
    onPitchChange: (val: number) => void;
    onModChange: (val: number) => void;
    pitchValue: number; // -1 to 1
    modValue: number;   // 0 to 1
}

export const PitchModWheels: React.FC<PitchModWheelsProps> = ({ 
    onPitchChange, 
    onModChange, 
    pitchValue, 
    modValue 
}) => {
    const pitchRef = useRef<HTMLDivElement>(null);
    const modRef = useRef<HTMLDivElement>(null);

    // --- PITCH WHEEL LOGIC (Stays in position - No Spring Back) ---
    const handlePitchDown = (e: React.PointerEvent) => {
        e.preventDefault();
        const el = pitchRef.current;
        if (!el) return;
        el.setPointerCapture(e.pointerId);

        const startY = e.clientY;
        const startVal = pitchValue;
        
        // Sensitivity: 200px for full range (-1 to 1)
        const sensitivity = 200;

        const onMove = (ev: PointerEvent) => {
            const deltaY = startY - ev.clientY; 
            const change = deltaY / (sensitivity / 2); // Adjust scalar
            const next = Math.max(-1, Math.min(1, startVal + change));
            
            // Deadzone snap to center
            if (Math.abs(next) < 0.05) {
                onPitchChange(0);
            } else {
                onPitchChange(next);
            }
        };

        const onUp = (ev: PointerEvent) => {
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            el.releasePointerCapture(ev.pointerId);
        };

        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
    };

    // --- MOD WHEEL LOGIC (Stays set) ---
    const handleModDown = (e: React.PointerEvent) => {
        e.preventDefault();
        const el = modRef.current;
        if (!el) return;
        el.setPointerCapture(e.pointerId);
        
        const startY = e.clientY;
        const startVal = modValue;

        const onMove = (ev: PointerEvent) => {
            const deltaY = startY - ev.clientY;
            const change = deltaY / 150;
            const next = Math.min(1, Math.max(0, startVal + change));
            onModChange(next);
        };

        const onUp = (ev: PointerEvent) => {
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            el.releasePointerCapture(ev.pointerId);
        };

        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
    };

    return (
        <div className="h-56 w-28 bg-[#1a1a1a] rounded-sm border-4 border-[#444] shadow-xl flex flex-col p-2 gap-2 shrink-0 relative">
            {/* Screw heads for vintage look */}
            <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-[#333] shadow-[inset_0_0_2px_black]"></div>
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#333] shadow-[inset_0_0_2px_black]"></div>
            <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-[#333] shadow-[inset_0_0_2px_black]"></div>
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-[#333] shadow-[inset_0_0_2px_black]"></div>

            <div className="flex-1 flex gap-3 px-1 items-center justify-center">
                
                {/* PITCH WHEEL */}
                <div className="flex flex-col items-center h-full w-full">
                    <div 
                        ref={pitchRef}
                        onPointerDown={handlePitchDown}
                        className="relative w-full h-full bg-[#050505] rounded-sm overflow-hidden border-x border-white/10 shadow-inner cursor-ns-resize touch-none group"
                    >
                         {/* Wheel Surface */}
                         <div 
                            className="absolute -left-[10%] right-[10%] top-[-20%] bottom-[-20%] w-[120%] bg-neutral-800 rounded-lg shadow-[inset_0_0_20px_black]"
                            style={{
                                transform: `perspective(100px) rotateX(${pitchValue * -40}deg)`,
                                backgroundImage: `linear-gradient(to bottom, 
                                    rgba(0,0,0,0.8) 0%, 
                                    rgba(255,255,255,0.1) 2%, 
                                    rgba(0,0,0,0.8) 4%,
                                    rgba(0,0,0,1) 50%,
                                    rgba(0,0,0,0.8) 96%, 
                                    rgba(255,255,255,0.1) 98%, 
                                    rgba(0,0,0,0.8) 100%
                                )`,
                                backgroundSize: '100% 20px', // Ridge spacing
                                backgroundPosition: `0px ${pitchValue * 100}px`, // Moves ridges visually
                                transition: 'transform 0.05s linear' 
                            }}
                         >
                             {/* Center Marker Line on the Wheel Itself */}
                             <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.8)] opacity-90"></div>
                         </div>

                         {/* Static Center Detent Marker on Casing */}
                         <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1.5 h-[1px] bg-white/50 z-20"></div>
                         <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1.5 h-[1px] bg-white/50 z-20"></div>
                    </div>
                    <span className="text-[9px] font-black text-neutral-500 mt-1 tracking-widest">PITCH</span>
                </div>

                {/* MOD WHEEL */}
                <div className="flex flex-col items-center h-full w-full">
                    <div 
                        ref={modRef}
                        onPointerDown={handleModDown}
                        className="relative w-full h-full bg-[#050505] rounded-sm overflow-hidden border-x border-white/10 shadow-inner cursor-ns-resize touch-none group"
                    >
                         {/* Wheel Surface */}
                         <div 
                            className="absolute -left-[10%] right-[10%] top-[-20%] bottom-[-20%] w-[120%] bg-neutral-800 rounded-lg shadow-[inset_0_0_20px_black]"
                            style={{
                                transform: `perspective(100px) rotateX(${(modValue - 0.5) * -40}deg)`,
                                backgroundImage: `linear-gradient(to bottom, 
                                    rgba(0,0,0,0.8) 0%, 
                                    rgba(255,255,255,0.1) 2%, 
                                    rgba(0,0,0,0.8) 4%,
                                    rgba(0,0,0,1) 50%,
                                    rgba(0,0,0,0.8) 96%, 
                                    rgba(255,255,255,0.1) 98%, 
                                    rgba(0,0,0,0.8) 100%
                                )`,
                                backgroundSize: '100% 20px',
                                backgroundPosition: `0px ${modValue * 100}px`
                            }}
                         >
                             {/* Position Marker on Mod Wheel */}
                             <div 
                                className="absolute left-0 right-0 h-[2px] bg-white/40"
                                style={{ top: `${(1 - modValue) * 80 + 10}%` }} // Approximate visual position tracking
                             ></div>
                         </div>
                    </div>
                    <span className="text-[9px] font-black text-neutral-500 mt-1 tracking-widest">MOD</span>
                </div>

            </div>
        </div>
    );
};
