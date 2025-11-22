import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/solid';

interface SoundSelectorProps {
  selectedTrackName: string;
  currentVariation: number;
  onSelectVariation: (index: number) => void;
  color: string;
}

export const SoundSelector: React.FC<SoundSelectorProps> = ({ selectedTrackName, currentVariation, onSelectVariation }) => {
  const variations = ['A', 'B', 'C', 'D'];

  const handleNext = () => {
    onSelectVariation((currentVariation + 1) % variations.length);
  };

  return (
    <div className="bg-[#d4d4d4] p-3 rounded-lg border border-neutral-400 shadow-inner flex flex-col gap-2 h-full">
        <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">SOUND // {selectedTrackName}</span>
            {/* Indicator dots */}
            <div className="flex gap-1">
                 {variations.map((_, i) => (
                     <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentVariation ? 'bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.8)]' : 'bg-neutral-400'}`}></div>
                 ))}
            </div>
        </div>
        
        {/* Single Cycle Button */}
        <button
            onClick={handleNext}
            className="flex-1 bg-[#f0f0f0] rounded-md border-b-4 border-neutral-300 active:border-b-0 active:translate-y-[4px] active:shadow-inner shadow-sm flex items-center justify-between px-6 hover:bg-white transition-all group"
        >
            <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-neutral-400 group-hover:text-neutral-500">VARIATION</span>
                <span className="text-4xl font-black text-neutral-800 tracking-tighter">
                    {variations[currentVariation]}
                </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center group-hover:bg-orange-100 text-neutral-400 group-hover:text-orange-500 transition-colors">
                <ArrowPathIcon className="w-6 h-6" />
            </div>
        </button>
    </div>
  );
};