
import React, { useEffect, useState, useRef } from 'react';
import { LibraryItem, LibraryCategory } from '../services/soundLibrary';
import { XMarkIcon, TrashIcon, PencilSquareIcon, PlusIcon, FolderOpenIcon, SpeakerWaveIcon, MicrophoneIcon, StopIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { UserSample } from '../types';

interface SoundLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: LibraryItem | UserSample, isUserSample: boolean) => void;
  currentTrackName: string;
  userSamples: UserSample[];
  library: LibraryCategory[]; // Passed dynamically from App
  onAddSample: (file: File | Blob, name: string) => void;
  onDeleteSample: (id: string) => void;
  onRenameSample: (id: string, newName: string) => void;
  onPreview: (item: LibraryItem | UserSample) => void;
  onMoveToPresets: (sample: UserSample) => void;
}

export const SoundLibraryModal: React.FC<SoundLibraryModalProps> = ({ 
    isOpen, onClose, onSelect, currentTrackName, 
    userSamples, library, onAddSample, onDeleteSample, onRenameSample,
    onPreview, onMoveToPresets
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'user'>('presets');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopRecording(); // cleanup on close
    };
  }, [isOpen, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          onAddSample(e.target.files[0], e.target.files[0].name.replace(/\.[^/.]+$/, ""));
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileUpload = () => {
      fileInputRef.current?.click();
  };
  
  const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/ogg; codecs=opus' });
                const name = `REC_${new Date().toLocaleTimeString().replace(/:/g,'-')}`;
                onAddSample(blob, name);
                
                // Stop tracks
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic error:", err);
            alert("Microphone access denied.");
        }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleRenameClick = (e: React.MouseEvent, sample: UserSample) => {
      e.stopPropagation();
      const newName = prompt("Rename sample:", sample.name);
      if (newName && newName.trim() !== "") {
          onRenameSample(sample.id, newName.trim());
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(confirm("Delete this sample?")) {
          onDeleteSample(id);
      }
  };
  
  const handlePreviewClick = (e: React.MouseEvent, item: LibraryItem | UserSample) => {
      e.stopPropagation();
      onPreview(item);
  };

  const handleMoveClick = (e: React.MouseEvent, sample: UserSample) => {
      e.stopPropagation();
      if(confirm("Move this sample to the main Preset library?")) {
          onMoveToPresets(sample);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
        
        <div className="bg-[#222] w-full max-w-4xl h-[80vh] rounded-lg border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col relative z-10 overflow-hidden">
            
            {/* Header */}
            <div className="bg-[#333] px-3 pt-3 pb-0 border-b border-white/10 flex flex-col shadow-md">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                        <span className="text-neutral-400 text-xs font-mono tracking-widest uppercase">Sound Library</span>
                        <span className="text-white font-bold text-lg">TARGET: <span className="text-orange-400">{currentTrackName}</span></span>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1">
                    <button 
                        onClick={() => setActiveTab('presets')}
                        className={`px-4 py-2 text-sm font-bold rounded-t-md transition-colors ${activeTab === 'presets' ? 'bg-[#2a2a2a] text-white border-t border-x border-white/10' : 'bg-transparent text-neutral-500 hover:text-neutral-300'}`}
                    >
                        PRESETS
                    </button>
                    <button 
                        onClick={() => setActiveTab('user')}
                        className={`px-4 py-2 text-sm font-bold rounded-t-md transition-colors flex items-center gap-2 ${activeTab === 'user' ? 'bg-[#2a2a2a] text-white border-t border-x border-white/10' : 'bg-transparent text-neutral-500 hover:text-neutral-300'}`}
                    >
                        USER SAMPLES
                        <span className="bg-orange-500 text-black text-[9px] px-1.5 rounded-full">{userSamples.length}</span>
                    </button>
                </div>
            </div>

            {/* Library Content */}
            <div className="flex-1 bg-[#2a2a2a] overflow-hidden flex flex-col">
                
                {activeTab === 'presets' && (
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {library.map(category => (
                                <div key={category.id} className="bg-[#1f1f1f] rounded-md border border-white/5 overflow-hidden flex flex-col">
                                    <div className="bg-[#3a3a3a] px-3 py-2 border-b border-white/5">
                                        <span className="font-bold text-white text-sm tracking-wider">{category.label}</span>
                                    </div>
                                    <div className="p-1 grid grid-cols-1 gap-1">
                                        {category.items.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-1 group/item"
                                            >
                                                <button 
                                                    onClick={(e) => handlePreviewClick(e, item)}
                                                    className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-sm"
                                                    title="Preview"
                                                >
                                                    <SpeakerWaveIcon className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => onSelect(item, false)}
                                                    className="flex-1 text-left px-2 py-2 text-xs font-mono text-neutral-300 hover:bg-orange-500 hover:text-white rounded-sm transition-colors flex items-center gap-2 truncate"
                                                >
                                                    <div className="w-1.5 h-1.5 shrink-0 rounded-full bg-neutral-500 group-hover/item:bg-white"></div>
                                                    <span className="truncate">{item.name}</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'user' && (
                    <div className="flex-1 flex flex-col">
                        <div className="p-4 border-b border-white/5 bg-[#252525] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                             <div className="flex flex-col">
                                 <h3 className="text-white font-bold text-sm">MY RECORDINGS & UPLOADS</h3>
                                 <span className="text-[10px] text-neutral-500">Supports .wav, .mp3, .ogg</span>
                             </div>
                             <div className="flex items-center gap-3">
                                 {/* RECORD BUTTON */}
                                 <div className="flex items-center gap-2 border-r border-white/10 pr-3 mr-1">
                                     <button
                                        onPointerDown={startRecording}
                                        onPointerUp={stopRecording}
                                        onPointerLeave={stopRecording}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-bold transition-all shadow-sm active:translate-y-[1px] ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-[#444] text-neutral-300 hover:bg-[#555] hover:text-white'}`}
                                     >
                                         {isRecording ? <StopIcon className="w-4 h-4" /> : <MicrophoneIcon className="w-4 h-4" />}
                                         {isRecording ? "RECORDING..." : "HOLD TO REC"}
                                     </button>
                                 </div>

                                 <input 
                                     type="file" 
                                     ref={fileInputRef} 
                                     className="hidden" 
                                     accept="audio/*" 
                                     onChange={handleFileChange}
                                 />
                                 <button 
                                     onClick={triggerFileUpload}
                                     className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white px-3 py-1.5 rounded-sm text-xs font-bold transition-colors shadow-sm active:translate-y-[1px]"
                                 >
                                     <PlusIcon className="w-4 h-4" />
                                     UPLOAD
                                 </button>
                             </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {userSamples.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-2 opacity-50">
                                    <FolderOpenIcon className="w-12 h-12" />
                                    <span>No user samples yet.</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {userSamples.map((sample) => (
                                        <div 
                                            key={sample.id}
                                            className="bg-[#1f1f1f] border border-white/5 rounded-sm p-2 flex items-center justify-between group hover:bg-[#333] transition-colors relative"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer" onClick={() => onSelect(sample, true)}>
                                                <button 
                                                    onClick={(e) => handlePreviewClick(e, sample)}
                                                    className="w-8 h-8 shrink-0 bg-neutral-800 rounded-sm flex items-center justify-center text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
                                                >
                                                    <SpeakerWaveIcon className="w-4 h-4" />
                                                </button>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-sm font-bold text-white truncate group-hover:text-orange-400">{sample.name}</span>
                                                    <span className="text-[10px] text-neutral-500 font-mono">{sample.buffer.duration.toFixed(2)}s</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2 bg-[#333] rounded-l-md">
                                                <button 
                                                    onClick={(e) => handleMoveClick(e, sample)}
                                                    className="p-1.5 hover:bg-blue-600 rounded-sm text-neutral-400 hover:text-white"
                                                    title="Move to Presets"
                                                >
                                                    <ArrowLeftIcon className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleRenameClick(e, sample)}
                                                    className="p-1.5 hover:bg-white/10 rounded-sm text-neutral-400 hover:text-white"
                                                    title="Rename"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDeleteClick(e, sample.id)}
                                                    className="p-1.5 hover:bg-red-900/50 rounded-sm text-neutral-400 hover:text-red-500"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="bg-[#1a1a1a] p-2 border-t border-white/10 text-center text-[10px] text-neutral-500 font-mono">
                {activeTab === 'presets' ? 'BROWSE INTERNAL SYNTH ENGINE PRESETS' : 'MANAGE CUSTOM SAMPLES AND RECORDINGS'}
            </div>
        </div>
    </div>
  );
};
