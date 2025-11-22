
import React, { memo, useRef, useEffect, useState } from 'react';

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
  onSampleUpdate?: (start: number, end: number) => void;
  recordingAnalyser?: AnalyserNode | null;
}

export const LCDDisplay = memo(({ 
  bpm, patternName, isPlaying, isRecording, statusMessage, metronomeEnabled, 
  sampleBuffer, previewBuffer, sampleStart = 0, sampleEnd = 1, isSampling, onSampleUpdate,
  recordingAnalyser
}: LCDDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);
  const beatDuration = `${60 / bpm}s`;
  
  // Interaction State
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

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
        ctx.lineWidth = 1;
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

            ctx.lineWidth = 2;
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
            // STATIC WAVEFORM (Sample or Synth Preview)
            const bufferToDraw = sampleBuffer || previewBuffer;
            
            if (bufferToDraw) {
                const data = bufferToDraw.getChannelData(0);
                // Downsample for display performance
                const step = Math.ceil(data.length / cw);
                const amp = ch / 2;

                ctx.beginPath();
                ctx.strokeStyle = '#263829';
                ctx.lineWidth = 1.5;

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

                // Draw Trim Markers (Only for custom samples)
                if (sampleBuffer) {
                    const startX = sampleStart * cw;
                    const endX = sampleEnd * cw;

                    ctx.fillStyle = 'rgba(38, 56, 41, 0.4)';
                    ctx.fillRect(0, 0, startX, ch);
                    ctx.fillRect(endX, 0, cw - endX, ch);

                    ctx.fillStyle = '#263829';
                    ctx.fillRect(startX - 1, 0, 2, ch); 
                    ctx.fillRect(endX - 1, 0, 2, ch); 
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
  }, [sampleBuffer, previewBuffer, sampleStart, sampleEnd, isSampling, recordingAnalyser]);

  // Handle Interaction for Waveform (Left Panel)
  const handleWaveformDown = (e: React.PointerEvent) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const cw = rect.width;
      const pX = x / cw;

      // Check for Trim Handles (only if custom sample)
      if (sampleBuffer && onSampleUpdate) {
          const threshold = 0.15; 
          const distStart = Math.abs(pX - sampleStart);
          const distEnd = Math.abs(pX - sampleEnd);

          if (distStart < threshold && distStart <= distEnd) {
              setDragging('start');
          } else if (distEnd < threshold) {
              setDragging('end');
          }
          e.currentTarget.setPointerCapture(e.pointerId);
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
  
  return (
    <div 
      className={`
        bg-[#98b09a] border-4 border-[#6f8270] rounded-sm p-1 font-['VT323'] 
        shadow-[inset_0_0_20px_rgba(0,0,0,0.15)] relative overflow-hidden 
        h-56 w-full select-none transition-colors duration-100 flex flex-col
        ${isPlaying ? 'animate-lcd-pulse' : ''}
      `}
      style={{ '--beat': beatDuration } as React.CSSProperties}
    >
      <style>{`
        @keyframes lcdPulse {
          0%, 100% { background-color: #98b09a; }
          50% { background-color: #a0b8a2; }
        }
        .animate-lcd-pulse { animation: lcdPulse 0.1s infinite; }

        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .animate-blink { animation: blink 0.5s step-end infinite; }

        @keyframes violentShake {
          0% { transform: translate(0, 0); }
          25% { transform: translate(1px, 1px); }
          50% { transform: translate(-1px, -1px); }
          75% { transform: translate(1px, -1px); }
          100% { transform: translate(0, 0); }
        }
        .animate-violent-shake { animation: violentShake 0.1s linear infinite; }

        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spinSlow 4s linear infinite; }

        @keyframes brickTumble {
           0% { transform: rotate(0deg) translate(0px, 0px); }
           20% { transform: rotate(70deg) translate(13px, 0px); }
           50% { transform: rotate(180deg) translate(13px, 0px); }
           75% { transform: rotate(270deg) translate(13px, 0px); }
           100% { transform: rotate(360deg) translate(0px, 0px); }
        }
        .animate-brick-tumble { animation: brickTumble 0.6s linear infinite; }

        @keyframes bounceBody { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .animate-bounce-body { animation: bounceBody 0.4s ease-in-out infinite; }

        @keyframes waveArms { 0%, 100% { stroke-width: 3; } 50% { stroke-width: 5; d: path("M 20 50 Q 50 80 80 50"); } }
        .animate-wave-arms { animation: waveArms 0.4s ease-in-out infinite; }

        @keyframes spinRave { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-rave { animation: spinRave 2s linear infinite; }
      `}</style>

      {/* LCD Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pixel-weave.png')] opacity-20 pointer-events-none mix-blend-multiply z-0"></div>
      
      {/* HEADER ROW */}
      <div className="relative z-10 flex justify-between items-start px-2 pt-1 border-b border-[#263829]/10 pb-1">
           <div className="flex flex-col leading-none">
               <span className="text-lg font-bold opacity-70">PTN: {patternName}</span>
               <div className="flex gap-2 mt-1 text-sm">
                   <span className={isRecording ? "animate-blink bg-[#263829] text-[#98b09a] px-1" : "opacity-30"}>REC</span>
                   <span className={isPlaying ? "bg-[#263829] text-[#98b09a] px-1" : "opacity-30"}>PLAY</span>
                   {metronomeEnabled && <span className="border border-[#263829] px-1">CLICK</span>}
               </div>
           </div>
           <div className="flex flex-col items-end leading-none">
               <span className="text-[10px] uppercase tracking-widest opacity-60">TEMPO</span>
               <span className="text-4xl font-bold tracking-tighter -mt-1">{bpm}</span>
           </div>
      </div>

      {/* MAIN SPLIT DISPLAY - SIMPLIFIED */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
           
           {/* LEFT: WAVEFORM EDITOR (Expanded) */}
           <div 
                className="flex-[3] h-full relative flex flex-col bg-[#263829]/5 border-r border-[#263829]/10"
                onPointerDown={handleWaveformDown}
                onPointerMove={handleWaveformMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
           >
                <div className="absolute top-0 left-0 bg-[#263829] text-[#98b09a] text-[8px] px-1.5 py-0.5 z-20 pointer-events-none font-bold tracking-widest">
                    {sampleBuffer ? 'SAMPLE EDITOR' : 'SYNTH PREVIEW'}
                </div>
                
                <canvas ref={canvasRef} width={400} height={140} className="w-full h-full cursor-crosshair touch-none" />
                
                {/* Floating Info for Sample Handles */}
                {sampleBuffer && !isSampling && (
                     <div className="absolute bottom-0 w-full flex justify-between px-1 pointer-events-none">
                         <span className="text-[8px] font-bold bg-[#263829]/80 text-[#98b09a] px-1 rounded-tl-sm">S: {Math.round(sampleStart * 100)}</span>
                         <span className="text-[8px] font-bold bg-[#263829]/80 text-[#98b09a] px-1 rounded-tr-sm">E: {Math.round(sampleEnd * 100)}</span>
                     </div>
                )}
           </div>

           {/* RIGHT: ANIMATIONS */}
           <div className="flex-[2] h-full flex items-center justify-center gap-2 sm:gap-4 px-2 overflow-hidden bg-[#263829]/5">
               
                {/* ANIMATION 1: THE VINTAGE WASHING MACHINE */}
                <div className={`relative flex-shrink-0 w-10 h-14 border-2 border-[#263829] rounded-sm flex flex-col items-center justify-start bg-[#98b09a] ${isPlaying ? 'animate-violent-shake' : ''} hidden sm:flex`}>
                    <div className="w-full h-3 border-b-2 border-[#263829] flex items-center justify-between px-1 bg-[#263829]/10">
                        <div className="flex gap-0.5">
                            <div className="w-0.5 h-0.5 bg-[#263829] rounded-full"></div>
                        </div>
                        <div className={`w-1.5 h-1.5 rounded-full border border-[#263829] relative ${isPlaying ? 'animate-spin-slow' : ''}`}>
                             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-0.5 bg-[#263829]"></div>
                        </div>
                    </div>
                    <div className="flex-1 w-full flex items-center justify-center relative">
                        <div className="w-6 h-6 rounded-full border-2 border-[#263829] flex items-center justify-center overflow-hidden bg-[#263829]/5">
                             <div className={`w-2 h-1.5 bg-[#263829] absolute ${isPlaying ? 'animate-brick-tumble' : ''}`}></div>
                        </div>
                    </div>
                </div>

                {/* ANIMATION 2: RAVE STICKMAN */}
                <div className="relative flex-shrink-0 w-12 h-16 flex items-end justify-center -mb-2">
                    <svg viewBox="0 0 100 150" className="h-full w-full overflow-visible drop-shadow-sm">
                        <g className={isPlaying ? "animate-bounce-body" : ""}>
                            <circle cx="50" cy="30" r="10" fill="none" stroke="#263829" strokeWidth="4" />
                            <line x1="50" y1="40" x2="50" y2="90" stroke="#263829" strokeWidth="4" />
                            <path d="M 20 60 Q 50 50 80 60" fill="none" stroke="#263829" strokeWidth="4" className={isPlaying ? "animate-wave-arms" : ""} />
                            <line x1="50" y1="90" x2="30" y2="130" stroke="#263829" strokeWidth="4" />
                            <line x1="50" y1="90" x2="70" y2="130" stroke="#263829" strokeWidth="4" />
                        </g>
                    </svg>
                </div>

                {/* ANIMATION 3: ACID SMILEY */}
                <div className={`relative flex-shrink-0 w-8 h-8 ${isPlaying ? 'animate-spin-rave' : ''}`}>
                     <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-sm">
                         <circle cx="50" cy="50" r="45" fill="none" stroke="#263829" strokeWidth="8" />
                         <ellipse cx="32" cy="40" rx="7" ry="11" fill="#263829" />
                         <ellipse cx="68" cy="40" rx="7" ry="11" fill="#263829" />
                         <path d="M20 65 Q 50 95 80 65" fill="none" stroke="#263829" strokeWidth="10" strokeLinecap="round" />
                     </svg>
                </div>

           </div>
      </div>

      {/* FOOTER: MARQUEE */}
      <div className="border-t border-[#263829]/20 pt-0.5 px-1 bg-[#263829]/5">
            <div className="text-xs font-mono whitespace-nowrap overflow-hidden flex">
                <span className={isPlaying ? "animate-marquee" : ""}>
                   {statusMessage} --- {statusMessage} --- {statusMessage} ---
                </span>
            </div>
      </div>
    </div>
  );
});
