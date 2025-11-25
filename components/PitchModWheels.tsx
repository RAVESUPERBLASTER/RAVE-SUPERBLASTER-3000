
import React, { useRef } from 'react';
import { ChevronUpIcon, ChevronDownIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/solid';

interface PitchModWheelsProps {
    onPitchChange: (val: number) => void;
    pitchValue: number; // -1 to 1
    isLocked?: boolean;
    onToggleLock?: () => void;
}

export const PitchModWheels: React.FC<PitchModWheelsProps> = ({ 
    onPitchChange, 
    pitchValue,
    isLocked,
    onToggleLock
}) => {
    const pitchRef = useRef<HTMLDivElement>(null);

    const handlePitchDown = (e: React.PointerEvent) => {
        e.preventDefault();
        const el = pitchRef.current;
        if (!el) return;
        el.setPointerCapture(e.pointerId);

        const startY = e.clientY;
        const startVal = pitchValue;
        
        const sensitivity = 200;

        const onMove = (ev: PointerEvent) => {
            const deltaY = startY - ev.clientY; 
            const change = deltaY / (sensitivity / 2); 
            const next = Math.max(-1, Math.min(1, startVal + change));
            
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

    return (
        <div className="h-full w-16 md:w-20 bg-[#dcdcdc] rounded-sm border border-[#bbb] shadow-sm flex flex-col p-2 gap-2 shrink-0 relative transition-all mt-4">
            
            {/* Lock Button Above Wheel */}
            <button 
                onClick={onToggleLock} 
                className={`
                   absolute -top-7 left-1/2 -translate-x-1/2 
                   w-8 h-8 rounded-full border-2 flex items-center justify-center
                   shadow-sm transition-all active:translate-y-[1px] hover:scale-105
                   ${isLocked ? 'bg-orange-500 border-orange-600 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-[#e0e0e0] border-[#bbb] text-neutral-400 hover:text-neutral-600'}
                `}
                title="Lock Length (Stretch Mode)"
            >
                <ArrowsRightLeftIcon className="w-4 h-4" />
            </button>

            <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-[#aaa] shadow-[inset_0_0_1px_rgba(0,0,0,0.3)]"></div>
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#aaa] shadow-[inset_0_0_1px_rgba(0,0,0,0.3)]"></div>
            <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-[#aaa] shadow-[inset_0_0_1px_rgba(0,0,0,0.3)]"></div>
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-[#aaa] shadow-[inset_0_0_1px_rgba(0,0,0,0.3)]"></div>

            <div className="flex-1 flex gap-3 px-1 items-center justify-center relative min-h-0">
                
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 opacity-40 pointer-events-none animate-bounce">
                    <ChevronUpIcon className="w-4 h-4 text-neutral-600" />
                </div>
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 opacity-40 pointer-events-none animate-bounce">
                    <ChevronDownIcon className="w-4 h-4 text-neutral-600" />
                </div>

                <div className="flex flex-col items-center h-full w-full justify-center">
                    <div 
                        ref={pitchRef}
                        onPointerDown={handlePitchDown}
                        className="relative w-full h-[85%] bg-[#b0b0b0] rounded-sm overflow-hidden border-x border-white/50 shadow-[inset_0_0_6px_rgba(0,0,0,0.2)] cursor-ns-resize touch-none group ring-1 ring-black/5"
                    >
                         <div 
                            className="absolute -left-[10%] right-[10%] top-[-20%] bottom-[-20%] w-[120%] bg-[#e0e0e0] rounded-lg shadow-[inset_0_0_15px_rgba(0,0,0,0.1)]"
                            style={{
                                transform: `perspective(100px) rotateX(${pitchValue * -40}deg)`,
                                backgroundImage: `linear-gradient(to bottom, 
                                    rgba(180,180,180,0.1) 0%, 
                                    rgba(255,255,255,0.9) 2%, 
                                    rgba(200,200,200,0.3) 4%,
                                    rgba(245,245,245,1) 50%,
                                    rgba(200,200,200,0.3) 96%, 
                                    rgba(255,255,255,0.9) 98%, 
                                    rgba(180,180,180,0.1) 100%
                                )`,
                                backgroundSize: '100% 20px', 
                                backgroundPosition: `0px ${pitchValue * 100}px`, 
                                transition: 'transform 0.05s linear' 
                            }}
                         >
                             <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-orange-400 shadow-[0_0_2px_rgba(251,146,60,0.8)] opacity-90"></div>
                         </div>

                         <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1.5 h-[1px] bg-neutral-500/50 z-20"></div>
                         <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1.5 h-[1px] bg-neutral-500/50 z-20"></div>
                    </div>
                    <span className="text-[9px] font-black text-neutral-500 mt-2 tracking-widest bg-[#dcdcdc] px-1 relative z-10">PITCH</span>
                </div>
            </div>
        </div>
    );
};
