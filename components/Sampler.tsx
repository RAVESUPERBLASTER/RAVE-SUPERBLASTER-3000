
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Track, SampleConfig } from '../types';
import { MicrophoneIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

interface SamplerProps {
    track: Track;
    onRecord: (buffer: AudioBuffer) => void;
    onConfigChange: (config: Partial<SampleConfig>) => void;
    onClear: () => void;
    audioContext: AudioContext | undefined;
}

export const Sampler: React.FC<SamplerProps> = ({ track, onRecord, onConfigChange, onClear, audioContext }) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const hasSample = track.sample?.isCustom && track.sample.buffer;

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/ogg; codecs=opus' });
                const arrayBuffer = await blob.arrayBuffer();
                if (audioContext) {
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    onRecord(audioBuffer);
                }
                // Stop all tracks to release mic
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access denied or error:", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // Draw Waveform
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height/2);
        ctx.lineTo(canvas.width, canvas.height/2);
        ctx.stroke();

        if (!hasSample || !track.sample?.buffer) {
            // Draw "No Sample" text or static
            ctx.fillStyle = '#444';
            ctx.font = '10px monospace';
            ctx.fillText(isRecording ? "RECORDING..." : "NO SAMPLE", 10, 20);
            return;
        }

        const buffer = track.sample.buffer;
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / canvas.width);
        const amp = canvas.height / 2;

        ctx.strokeStyle = '#4ade80'; // Green waveform
        ctx.beginPath();
        
        for (let i = 0; i < canvas.width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.moveTo(i, (1 + min) * amp);
            ctx.lineTo(i, (1 + max) * amp);
        }
        ctx.stroke();

        // Draw Trim Regions
        const startX = track.sample.start * canvas.width;
        const endX = track.sample.end * canvas.width;

        // Shade trimmed areas
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, startX, canvas.height);
        ctx.fillRect(endX, 0, canvas.width - endX, canvas.height);

        // Draw Lines
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, canvas.height);
        ctx.stroke();

    }, [track.sample, hasSample, isRecording]);

    // Knob Logic (Simplified for internal component usage)
    const Knob = ({ value, onChange, label, color }: any) => {
        const handleDrag = useCallback((e: React.PointerEvent) => {
            const el = e.currentTarget;
            el.setPointerCapture(e.pointerId);
            const startY = e.clientY;
            const startVal = value;
            
            const onMove = (ev: PointerEvent) => {
                const delta = (startY - ev.clientY) / 200;
                const next = Math.min(1, Math.max(0, startVal + delta));
                onChange(next);
            };
            const onUp = (ev: PointerEvent) => {
                el.removeEventListener('pointermove', onMove as any);
                el.removeEventListener('pointerup', onUp as any);
                el.releasePointerCapture(ev.pointerId);
            };
            el.addEventListener('pointermove', onMove as any);
            el.addEventListener('pointerup', onUp as any);
        }, [value, onChange]);

        const deg = -135 + (value * 270);
        return (
            <div className="flex flex-col items-center gap-1">
                 <div onPointerDown={handleDrag} className="w-10 h-10 rounded-full bg-neutral-700 border-2 border-neutral-500 relative shadow-sm cursor-ns-resize touch-none">
                     <div className="absolute inset-0" style={{ transform: `rotate(${deg}deg)` }}>
                         <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 rounded-full ${color}`}></div>
                     </div>
                 </div>
                 <span className="text-[9px] font-bold text-neutral-400 uppercase">{label}</span>
            </div>
        );
    };

    return (
        <div className="bg-[#2a2a2a] rounded-sm p-2 border border-white/10 flex flex-col gap-2 shadow-inner h-full">
            
            {/* Display */}
            <div className="bg-black rounded-sm h-16 w-full relative overflow-hidden border border-white/20 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <canvas ref={canvasRef} width={300} height={64} className="w-full h-full" />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-1">
                {/* Start Knob */}
                <Knob 
                    value={track.sample?.start || 0} 
                    onChange={(v: number) => {
                        if (v < (track.sample?.end || 1)) onConfigChange({ start: v });
                    }}
                    label="START"
                    color="bg-green-400"
                />

                {/* Center Action */}
                <div className="flex flex-col items-center gap-1">
                    <button 
                        onPointerDown={startRecording}
                        onPointerUp={stopRecording}
                        onPointerLeave={stopRecording}
                        className={`
                            w-12 h-12 rounded-full border-4 transition-all active:scale-95 shadow-lg flex items-center justify-center
                            ${isRecording 
                                ? 'bg-red-600 border-red-800 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.8)]' 
                                : 'bg-[#cc2222] border-[#991111] hover:brightness-110'}
                        `}
                    >
                        <MicrophoneIcon className="w-6 h-6 text-white" />
                    </button>
                    <span className="text-[9px] font-black text-neutral-500 tracking-wider">HOLD REC</span>
                </div>

                {/* End Knob */}
                <Knob 
                    value={track.sample?.end || 1} 
                    onChange={(v: number) => {
                         if (v > (track.sample?.start || 0)) onConfigChange({ end: v });
                    }}
                    label="END"
                    color="bg-red-400"
                />
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between mt-1 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${hasSample ? 'bg-green-500' : 'bg-neutral-600'}`}></div>
                    <span className="text-[9px] text-neutral-400 font-mono">{hasSample ? 'SAMPLER ACTIVE' : 'SYNTH MODE'}</span>
                </div>

                {hasSample && (
                    <button onClick={onClear} className="flex items-center gap-1 text-[9px] text-neutral-400 hover:text-red-400 transition-colors">
                        <TrashIcon className="w-3 h-3" />
                        CLEAR
                    </button>
                )}
            </div>
        </div>
    );
}
