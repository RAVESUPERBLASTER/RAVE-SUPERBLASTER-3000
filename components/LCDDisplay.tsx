
import React, { memo, useRef, useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface LCDDisplayProps {
  bpm: number;
  patternName: string;
  isPlaying: boolean;
  isRecording: boolean;
  statusMessage: string;
  metronomeEnabled: boolean;
  sampleBuffer?: AudioBuffer | null;
  previewBuffer?: AudioBuffer | null; // Synth or Sample Preview
  sampleStart?: number;
  sampleEnd?: number;
  isSampling?: boolean;
  isStretch?: boolean;
  onSampleUpdate?: (start: number, end: number) => void;
  onClearSample?: () => void;
  recordingAnalyser?: AnalyserNode | null;
  isTrackEmpty?: boolean;
}

export const LCDDisplay = memo(({ 
  bpm, patternName, isPlaying, isRecording, statusMessage, metronomeEnabled, 
  sampleBuffer, previewBuffer, sampleStart = 0, sampleEnd = 1, isSampling, isStretch, onSampleUpdate, onClearSample,
  recordingAnalyser, isTrackEmpty
}: LCDDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);
  const beatDuration = `${60 / bpm}s`;
  
  // Interaction State
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  
  // Independent Dance Move States
  const [danceMoves, setDanceMoves] = useState({ body: 0, arms: 0, legs: 0 });

  // Randomize dance moves when play starts
  useEffect(() => {
    if (isPlaying) {
      setDanceMoves({
          body: Math.floor(Math.random() * 3),
          arms: Math.floor(Math.random() * 3),
          legs: Math.floor(Math.random() * 3)
      });
    } else {
      setDanceMoves({ body: 0, arms: 0, legs: 0 });
    }
  }, [isPlaying]);

  // Waveform Drawer Loop
  useEffect(() => {
    const render = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear Canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // GRID BACKGROUND
        ctx.strokeStyle = 'rgba(38, 56, 41, 0.1)';
        ctx.lineWidth = 0.5; // Thinner grid
        ctx.beginPath();
        const cw = canvas.width;
        const ch = canvas.height;
        for(let x=0; x<=cw; x+=20) { ctx.moveTo(x,0); ctx.lineTo(x,ch); }
        for(let y=0; y<=ch; y+=20) { ctx.moveTo(0,y); ctx.lineTo(cw,y); }
        ctx.stroke();

        if (isSampling && recordingAnalyser) {
            // REAL-TIME RECORDING VISUALIZATION
            const bufferLength = recordingAnalyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            recordingAnalyser.getByteTimeDomainData(dataArray);

            ctx.lineWidth = 1; // Thinner line
            ctx.strokeStyle = '#263829';
            ctx.beginPath();

            const sliceWidth = cw * 1.0 / bufferLength;
            let x = 0;

            for(let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * ch/2;

                if(i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);

                x += sliceWidth;
            }
            ctx.lineTo(canvas.width, canvas.height/2);
            ctx.stroke();
            
            ctx.fillStyle = '#263829';
            ctx.font = '20px "VT323"';
            ctx.textAlign = 'center';
            ctx.fillText("RECORDING...", cw/2, 30);

        } else {
            // STATIC WAVEFORM (Sample OR Synth Preview)
            // Use previewBuffer as the visual source regardless of whether it's a custom sample or not
            const bufferToDraw = sampleBuffer || previewBuffer;
            
            if (bufferToDraw && !isTrackEmpty) {
                const data = bufferToDraw.getChannelData(0);
                // Downsample for display performance
                const step = Math.ceil(data.length / cw);
                const amp = ch / 2;

                ctx.beginPath();
                ctx.strokeStyle = '#263829';
                ctx.lineWidth = 0.8; // Thinner line for detail

                for (let i = 0; i < cw; i++) {
                    let min = 1.0;
                    let max = -1.0;
                    for (let j = 0; j < step; j++) {
                        const idx = (i * step) + j;
                        if (idx < data.length) {
                            const datum = data[idx];
                            if (datum < min) min = datum;
                            if (datum > max) max = datum;
                        }
                    }
                    // If silence, draw flat
                    if (min > max) { min = 0; max = 0; }
                    
                    ctx.moveTo(i, (1 + min) * amp);
                    ctx.lineTo(i, (1 + max) * amp);
                }
                ctx.stroke();

                // Draw Trim Markers (Only if custom sample)
                if (sampleBuffer) {
                    const startX = sampleStart * cw;
                    const endX = sampleEnd * cw;

                    // Dim out the trimmed areas
                    ctx.fillStyle = 'rgba(38, 56, 41, 0.4)';
                    ctx.fillRect(0, 0, startX, ch);
                    ctx.fillRect(endX, 0, cw - endX, ch);

                    // Vertical Lines - Thinner (1px)
                    ctx.fillStyle = '#263829';
                    ctx.fillRect(startX, 0, 1, ch); 
                    ctx.fillRect(endX, 0, 1, ch); 
                    
                    // Draw Handles (Triangles at bottom)
                    ctx.beginPath();
                    // Start Handle (Right pointing)
                    ctx.moveTo(startX, ch);
                    ctx.lineTo(startX, ch - 15);
                    ctx.lineTo(startX + 12, ch);
                    ctx.fill();

                    // End Handle (Left pointing)
                    ctx.beginPath();
                    ctx.moveTo(endX, ch);
                    ctx.lineTo(endX, ch - 15);
                    ctx.lineTo(endX - 12, ch);
                    ctx.fill();

                    // Handle Labels
                    ctx.font = '10px "VT323"';
                    ctx.fillStyle = '#263829';
                    ctx.textAlign = 'left';
                    ctx.fillText("START", startX + 4, ch - 18);
                    ctx.textAlign = 'right';
                    ctx.fillText("END", endX - 4, ch - 18);
                }
                
            } else {
                 // EMPTY STATE
                 ctx.fillStyle = 'rgba(38, 56, 41, 0.3)';
                 ctx.font = '20px "VT323"';
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 ctx.fillText("EMPTY", cw/2, ch/2);
            }
        }
        
        if (isSampling) {
            animationRef.current = requestAnimationFrame(render);
        }
    };

    render();
    
    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [sampleBuffer, previewBuffer, sampleStart, sampleEnd, isSampling, recordingAnalyser, isTrackEmpty]);

  // Handle Interaction for Waveform (Left Panel)
  const handleWaveformDown = (e: React.PointerEvent) => {
      // Prevent dragging if clicking the delete button (handled by stopPropagation, but safety check here)
      if ((e.target as HTMLElement).closest('button')) return;

      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const cw = rect.width;
      
      // Always allow editing if onSampleUpdate is provided
      if (onSampleUpdate && sampleBuffer) {
          const startX = sampleStart * cw;
          const endX = sampleEnd * cw;
          
          // Pixel distance threshold for grabbing handles
          const HIT_THRESHOLD = 30;
          
          const distStart = Math.abs(x - startX);
          const distEnd = Math.abs(x - endX);

          if (distStart < HIT_THRESHOLD && distStart <= distEnd) {
              setDragging('start');
              e.currentTarget.setPointerCapture(e.pointerId);
          } else if (distEnd < HIT_THRESHOLD) {
              setDragging('end');
              e.currentTarget.setPointerCapture(e.pointerId);
          }
      }
  };

  const handleWaveformMove = (e: React.PointerEvent) => {
      if (!dragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const cw = rect.width;
      
      if (onSampleUpdate) {
          const x = e.clientX - rect.left;
          const p = Math.max(0, Math.min(1, x / cw));
          if (dragging === 'start') {
              const newStart = Math.min(p, sampleEnd - 0.02); 
              onSampleUpdate(newStart, sampleEnd);
          } else if (dragging === 'end') {
              const newEnd = Math.max(p, sampleStart + 0.02);
              onSampleUpdate(sampleStart, newEnd);
          }
      }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      setDragging(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
  };
  
  // Show delete if not sampling and track is not empty
  const showDelete = onClearSample && !isSampling && !isTrackEmpty;

  return (
    <div 
      className={`
        bg-[#98b09a] border-4 border-[#6f8270] rounded-sm p-1 font-['VT323'] 
        shadow-[inset_0_0_20px_rgba(0,0,0,0.15)] relative overflow-hidden 
        h-full w-full select-none transition-colors duration-100 flex flex-col
        ${isPlaying ? 'animate-lcd-pulse' : ''}
      `}
      style={{ '--beat': beatDuration } as React.CSSProperties}
    >
      <style>{`
        @keyframes lcdPulse {
          0%, 100% { background-color: #98b09a; }
          50% { background-color: #a0b8a2; }
        }
        .animate-lcd-pulse { animation: lcdPulse var(--beat) infinite; }

        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .animate-blink { animation: blink 0.5s step-end infinite; }

        /* VINTAGE WASHING MACHINE SHAKE */
        @keyframes violentShake {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(2px, 2px) rotate(1deg); }
          50% { transform: translate(-2px, -2px) rotate(-1deg); }
          75% { transform: translate(2px, -2px) rotate(0deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        .animate-violent-shake { animation: violentShake calc(var(--beat) / 4) linear infinite; }

        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spinSlow calc(var(--beat) * 4) linear infinite; }

        @keyframes brickViolent {
           0% { transform: rotate(0deg) translate(0px, 14px); } 
           25% { transform: rotate(90deg) translate(-10px, 0px); }
           50% { transform: rotate(180deg) translate(0px, -10px); }
           75% { transform: rotate(270deg) translate(10px, 0px); }
           100% { transform: rotate(360deg) translate(0px, 14px); }
        }
        .animate-brick-violent { animation: brickViolent calc(var(--beat) * 2) linear infinite; }

        /* --- BODY MOVES --- */
        @keyframes bodyBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
        .animate-body-0 { animation: bodyBob var(--beat) ease-in-out infinite; }
        
        @keyframes bodySway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        .animate-body-1 { transform-origin: 50px 90px; animation: bodySway calc(var(--beat) * 2) ease-in-out infinite; }
        
        @keyframes bodyPump { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.95) translateY(5px); } }
        .animate-body-2 { transform-origin: 50px 130px; animation: bodyPump var(--beat) ease-in-out infinite; }

        /* --- ARM MOVES --- */
        @keyframes armWave { 
            0%, 100% { d: path("M -30 10 Q 0 -5 30 10"); } 
            50% { d: path("M -30 -10 Q 0 15 30 -10"); } 
        }
        .animate-arm-wave { animation: armWave var(--beat) ease-in-out infinite; }

        @keyframes armFlap { 
            0%, 100% { transform: rotate(0deg); } 
            50% { transform: rotate(20deg); } 
        }
        .animate-arm-flap { transform-origin: 0 0; animation: armFlap calc(var(--beat) / 2) ease-in-out infinite; }

        @keyframes armPumpL { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-30deg); } }
        .animate-arm-pump-l { transform-origin: 0 0; animation: armPumpL var(--beat) ease-in-out infinite; }
        @keyframes armPumpR { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(30deg); } }
        .animate-arm-pump-r { transform-origin: 0 0; animation: armPumpR var(--beat) ease-in-out infinite; }

        /* --- LEG MOVES --- */
        @keyframes legBounce { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.85); } }
        .animate-legs-bounce { transform-origin: 0 0; animation: legBounce var(--beat) ease-in-out infinite; }

        @keyframes legRunL { 0%, 100% { transform: rotate(15deg); } 50% { transform: rotate(-15deg); } }
        .animate-leg-run-l { transform-origin: 0 0; animation: legRunL var(--beat) linear infinite; }
        @keyframes legRunR { 0%, 100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }
        .animate-leg-run-r { transform-origin: 0 0; animation: legRunR var(--beat) linear infinite; }
        
        @keyframes legCross { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(-0.5); } }
        .animate-legs-cross { transform-origin: 0 0; animation: legCross calc(var(--beat) * 2) ease-in-out infinite; }

        /* HEAD BOB - ATTACHED - Simple vertical bob to ensure attachment */
        @keyframes headBob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(2px); }
        }
        .animate-head-bob { 
            animation: headBob var(--beat) ease-in-out infinite; 
        }
        
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee calc(var(--beat) * 8) linear infinite; }

        /* LITTLE DANCE FOR X BUTTON */
        @keyframes wiggle {
          0%, 100% { transform: rotate(-5deg) scale(1); }
          50% { transform: rotate(5deg) scale(1.1); }
        }
        .animate-wiggle { animation: wiggle var(--beat) ease-in-out infinite; }

      `}</style>

      {/* LCD Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pixel-weave.png')] opacity-20 pointer-events-none mix-blend-multiply z-0"></div>
      
      {/* HEADER ROW */}
      <div className="relative z-10 flex justify-between items-start px-2 pt-1 border-b border-[#263829]/10 pb-1 h-10 shrink-0">
           <div className="flex flex-col leading-none">
               <span className="text-lg font-bold opacity-70">PTN: {patternName}</span>
               <div className="flex gap-2 mt-1 text-sm">
                   <span className={isRecording ? "animate-blink bg-[#263829] text-[#98b09a] px-1" : "opacity-30"}>REC</span>
                   <span className={isPlaying ? "bg-[#263829] text-[#98b09a] px-1" : "opacity-30"}>PLAY</span>
                   {metronomeEnabled && <span className="border border-[#263829] px-1">CLICK</span>}
                   {isStretch && <span className="bg-[#263829] text-[#98b09a] px-1 animate-pulse">STRETCH</span>}
               </div>
           </div>
           <div className="flex flex-col items-end leading-none">
               <span className="text-[10px] uppercase tracking-widest opacity-60">TEMPO</span>
               <span className="text-4xl font-bold tracking-tighter -mt-1">{bpm}</span>
           </div>
      </div>

      {/* MAIN SPLIT DISPLAY */}
      <div className="relative z-10 flex-1 flex overflow-hidden h-full min-h-0">
           
           {/* LEFT: WAVEFORM EDITOR (Expanded) */}
           <div 
                className="flex-[3] h-full relative flex flex-col bg-[#263829]/5 border-r border-[#263829]/10"
                onPointerDown={handleWaveformDown}
                onPointerMove={handleWaveformMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
           >
                <div className="absolute top-0 left-0 bg-[#263829] text-[#98b09a] text-[8px] px-1.5 py-0.5 z-20 pointer-events-none font-bold tracking-widest">
                    {sampleBuffer ? (isStretch ? 'SAMPLE [GRANULAR MODE]' : 'SAMPLE EDITOR') : 'SYNTH TRIM'}
                </div>
                
                {/* DELETE BUTTON FOR SAMPLE OR INSTRUMENT */}
                {showDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); if (onClearSample) onClearSample(); }}
                        className={`
                            absolute top-1 right-1 z-30 w-5 h-5 flex items-center justify-center rounded-[2px]
                            bg-[#263829] text-[#98b09a] border border-[#98b09a]/20 hover:bg-red-900 hover:text-white transition-colors
                            ${isPlaying ? 'animate-wiggle' : ''}
                        `}
                        title="Delete/Clear Sound"
                    >
                        <XMarkIcon className="w-3 h-3" />
                    </button>
                )}

                <canvas ref={canvasRef} width={400} height={140} className="w-full h-full cursor-col-resize touch-none" />
                
                {/* Floating Info for Sample Handles - ALWAYS VISIBLE if active */}
                {!isSampling && sampleBuffer && (
                     <div className="absolute bottom-0 w-full flex justify-between px-1 pointer-events-none opacity-50">
                         <span className="text-[8px] font-bold text-[#263829]">{Math.round(sampleStart * 100)}%</span>
                         <span className="text-[8px] font-bold text-[#263829]">{Math.round(sampleEnd * 100)}%</span>
                     </div>
                )}
           </div>

           {/* RIGHT: ANIMATIONS */}
           <div className="flex-[2] h-full flex items-end justify-center gap-0.5 px-2 overflow-hidden bg-[#263829]/5 pb-1">
               
                {/* ANIMATION 1: THE VINTAGE WASHING MACHINE - SCALED DOWN */}
                <div className={`
                    relative flex-shrink-0 w-16 h-20 mb-3
                    border-2 border-[#263829] rounded-[2px] 
                    flex flex-col items-center justify-start bg-[#98b09a] 
                    ${isPlaying ? 'animate-violent-shake' : ''} 
                    hidden sm:flex
                `}>
                    <div className="w-full h-4 border-b-2 border-[#263829] flex items-center justify-between px-1 bg-[#263829]/10">
                        <div className="flex gap-0.5">
                            <div className="w-1 h-1 bg-[#263829] rounded-full"></div>
                            <div className="w-1 h-1 bg-[#263829] rounded-full"></div>
                        </div>
                        <div className={`w-2.5 h-2.5 rounded-full border border-[#263829] relative ${isPlaying ? 'animate-spin-slow' : ''}`}>
                             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-1.5 bg-[#263829]"></div>
                        </div>
                    </div>
                    <div className="flex-1 w-full flex items-center justify-center relative">
                        <div className="w-12 h-12 rounded-full border-2 border-[#263829] flex items-center justify-center overflow-hidden bg-[#263829]/5 relative">
                             {/* THE BRICK */}
                             <div className={`
                                 w-6 h-4 bg-[#263829] absolute rounded-[1px]
                                 ${isPlaying ? 'animate-brick-violent' : 'translate-y-[14px] rotate-6'}
                             `}></div>
                        </div>
                    </div>
                </div>

                {/* ANIMATION 2: RAVE STICKMAN WITH ACID SMILEY (UPDATED) */}
                <div className="relative flex-shrink-0 h-full flex items-end justify-center pb-2">
                    <svg viewBox="0 0 100 150" className="h-full w-auto max-w-full overflow-visible drop-shadow-sm">
                        {/* MAIN BODY CONTAINER - Random Move 0, 1, 2 */}
                        <g className={isPlaying ? `animate-body-${danceMoves.body}` : ""}>
                            
                            {/* ACID SMILEY HEAD - Attached at top of torso (50, 30) */}
                            {/* Simplified transform to just translation to avoid detaching */}
                            <g transform="translate(50, 30)">
                                <g className={isPlaying ? "animate-head-bob" : ""}>
                                    <circle cx="0" cy="0" r="14" fill="none" stroke="#263829" strokeWidth="2.5" />
                                    <ellipse cx="-5" cy="-3" rx="2" ry="3.5" fill="#263829" />
                                    <ellipse cx="5" cy="-3" rx="2" ry="3.5" fill="#263829" />
                                    <path d="M -7 5 Q 0 10 7 5" fill="none" stroke="#263829" strokeWidth="2" strokeLinecap="round" />
                                </g>
                            </g>

                            {/* TORSO */}
                            <line x1="50" y1="44" x2="50" y2="90" stroke="#263829" strokeWidth="3" />
                            
                            {/* ARMS - Attached at Shoulders (50, 55) */}
                            <g transform="translate(50, 55)">
                                {danceMoves.arms === 0 && (
                                     // Wave (Path Morph)
                                     <path d="M -30 10 Q 0 -5 30 10" fill="none" stroke="#263829" strokeWidth="3" className={isPlaying ? "animate-arm-wave" : ""} />
                                )}
                                {danceMoves.arms === 1 && (
                                     // Flap (Rotation Group)
                                     <g className={isPlaying ? "animate-arm-flap" : ""}>
                                         <line x1="0" y1="0" x2="-30" y2="-10" stroke="#263829" strokeWidth="3" />
                                         <line x1="0" y1="0" x2="30" y2="-10" stroke="#263829" strokeWidth="3" />
                                     </g>
                                )}
                                {danceMoves.arms === 2 && (
                                     // Alternating Pump
                                     <g>
                                         <line x1="0" y1="0" x2="-25" y2="10" stroke="#263829" strokeWidth="3" className={isPlaying ? "animate-arm-pump-l" : ""} />
                                         <line x1="0" y1="0" x2="25" y2="10" stroke="#263829" strokeWidth="3" className={isPlaying ? "animate-arm-pump-r" : ""} />
                                     </g>
                                )}
                            </g>
                            
                            {/* LEGS - Attached at Hips (50, 90) */}
                            <g transform="translate(50, 90)">
                                {danceMoves.legs === 0 && (
                                    // Bounce / Stand
                                    <g className={isPlaying ? "animate-legs-bounce" : ""}>
                                        <line x1="0" y1="0" x2="-20" y2="40" stroke="#263829" strokeWidth="3" />
                                        <line x1="0" y1="0" x2="20" y2="40" stroke="#263829" strokeWidth="3" />
                                    </g>
                                )}
                                {danceMoves.legs === 1 && (
                                    // Running Man
                                    <g>
                                        <line x1="0" y1="0" x2="-20" y2="40" stroke="#263829" strokeWidth="3" className={isPlaying ? "animate-leg-run-l" : ""} />
                                        <line x1="0" y1="0" x2="20" y2="40" stroke="#263829" strokeWidth="3" className={isPlaying ? "animate-leg-run-r" : ""} />
                                    </g>
                                )}
                                {danceMoves.legs === 2 && (
                                    // Cross / Wide
                                    <g className={isPlaying ? "animate-legs-cross" : ""}>
                                        <line x1="0" y1="0" x2="-20" y2="40" stroke="#263829" strokeWidth="3" />
                                        <line x1="0" y1="0" x2="20" y2="40" stroke="#263829" strokeWidth="3" />
                                    </g>
                                )}
                            </g>
                        </g>
                    </svg>
                </div>

           </div>
      </div>

      {/* FOOTER: MARQUEE */}
      <div className="border-t border-[#263829]/20 pt-0.5 px-1 bg-[#263829]/5 h-5 shrink-0">
            <div className="text-xs font-mono whitespace-nowrap overflow-hidden flex">
                <span className={isPlaying ? "animate-marquee" : ""}>
                   {statusMessage} --- {statusMessage} --- {statusMessage} ---
                </span>
            </div>
      </div>
    </div>
  );
});
