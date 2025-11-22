
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioSynth } from './services/audioSynth';
import { Track, InstrumentType, ChannelEffects, PatternData, SampleConfig } from './types';
import { Pad, PadHandle } from './components/Pad';
import { LCDDisplay } from './components/LCDDisplay';
import { PitchModWheels } from './components/PitchModWheels';
import { StepSequencer } from './components/StepSequencer';
import { Mixer, MixerHandle } from './components/Mixer';
import { getGenrePatterns, LEGENDARY_PATTERNS } from './services/patternLibrary';
import { PlayIcon, StopIcon, TrashIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, LockClosedIcon, LockOpenIcon, MicrophoneIcon, BoltIcon, ArrowsRightLeftIcon, ArrowPathIcon, ArrowUturnLeftIcon, CubeIcon } from '@heroicons/react/24/solid';

// --- Configuration ---
const INITIAL_BPM = 128;
const STEPS = 16;
const PATTERN_COUNT = 7; 
const SCENE_COUNT = 9; 

const DEFAULT_EFFECTS: ChannelEffects = {
    reverb: { active: false, value: 0.3 },
    delay: { active: false, value: 0.3 },
    filter: { active: false, value: 1.0 },
    bitcrush: { active: false, value: 0.5 },
    stutter: { active: false, value: 0.5 },
    glitch: { active: false, value: 0.5 }
};

const TRACK_COLORS: Record<string, string> = {
    red: 'bg-red-600',
    orange: 'bg-orange-500',
    amber: 'bg-amber-500',
    yellow: 'bg-yellow-400',
    lime: 'bg-lime-500',
    green: 'bg-green-600',
    emerald: 'bg-emerald-500',
    teal: 'bg-teal-500',
    cyan: 'bg-cyan-500',
    sky: 'bg-sky-500',
    blue: 'bg-blue-600',
    indigo: 'bg-indigo-500',
    violet: 'bg-violet-500',
    purple: 'bg-purple-600',
    fuchsia: 'bg-fuchsia-500',
    pink: 'bg-pink-500',
    rose: 'bg-rose-500',
    white: 'bg-white',
};

const SCENE_COLORS = [
    'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-400', 
    'bg-lime-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-blue-600',
    'bg-violet-500'
];

const GENRES = ['TR-909', 'TR-808', 'TR-707', 'LINN-DRUM', 'JUNGLE', 'MEMPHIS', 'GOA', 'ETHNIC-WORLD', 'GABBER', 'ACID', 'UK-GARAGE', 'EURO-DANCE', 'HARDSTYLE', 'DUBSTEP'];

// Updated for 15 Tracks (Indices 0-14)
const GENRE_KIT_MAP: Record<string, Record<number, string>> = {
    'TR-909': { 0: '909 BD', 1: '909 SD', 2: '909 CH', 3: '909 OH', 4: 'Rumble', 6: 'Sub Kick', 9: 'Cowbell', 12: '909 Crash' },
    'TR-707': { 0: '707 BD', 1: '707 SD', 2: '707 CH', 3: '707 OH', 4: 'House Bass', 9: '707 CB', 14: 'Rimshot', 13: 'Ride' },
    'TR-808': { 0: '808 BD', 1: '808 SD', 2: '808 CH', 3: '808 OH', 4: 'Sub Bass', 6: 'Conga', 9: '808 CB', 10: 'Clave' },
    'LINN-DRUM': { 0: 'Linn Kick', 1: 'Linn Snare', 2: 'Linn CH', 3: 'Linn OH', 4: 'Synth Bass', 5: 'Linn Clap', 9: 'Cowbell', 10: 'Cabasa' },
    'JUNGLE': { 0: 'Step BD', 1: 'Amen SD', 2: 'Amen CH', 3: 'Break OH', 4: 'Reese', 6: 'Sub Kick' },
    'MEMPHIS': { 0: 'Trap BD', 1: 'Trap SD', 2: 'Trap CH', 4: '808 Sub', 9: 'Phonk Bell', 10: 'Siren', 11: 'Gunshot' },
    'GOA': { 0: 'Zap BD', 1: 'Digital SD', 4: 'Psi Bass', 10: 'Alien FX', 11: 'Laser' },
    'ETHNIC-WORLD': { 0: 'Djembe Bass', 1: 'Wood Block', 2: 'Shaker', 3: 'Rainstick', 4: 'Taiko', 5: 'Slap', 6: 'Bongo Lo', 7: 'Bongo Hi', 8: 'Sitar', 10: 'Bird FX', 11: 'Whistle' },
    'GABBER': { 0: 'Rotterdam', 1: 'Dist SD', 2: 'Ticky Hat', 4: 'Hoover', 9: 'Dist Bell', 10: 'Screech', 12: 'Splash' },
    'ACID': { 0: '909 Punch', 1: '909 Snap', 4: '303 Bass', 8: '303 Sq', 10: '303 Saw', 11: 'Acid FX' },
    'UK-GARAGE': { 0: 'Skip Kick', 1: 'Rimshot', 2: 'Shaker', 3: 'Open Hat', 4: 'Organ Bass', 5: 'Finger Snap', 13: 'Vox Chop' },
    'EURO-DANCE': { 0: 'Euro Kick', 1: 'Gate Snare', 2: 'HiHat', 3: 'Open Hat', 4: 'Donk Bass', 8: 'SuperSaw', 10: 'Orch Hit' },
    'HARDSTYLE': { 0: 'Gong Kick', 1: 'Tok Punch', 2: 'Ride', 3: 'Open Hat', 4: 'Rev Bass', 8: 'Screech', 9: 'Dist FX' },
    'DUBSTEP': { 0: 'Stomp Kick', 1: 'Snare 200', 2: 'Hat 1', 3: 'Hat 2', 4: 'Wobble', 6: 'Growl', 8: 'Yoi Bass' }
};

const FILL_BUTTONS = [
    { label: '1/1', cat: 'basic' }, { label: '1/2', cat: 'basic' }, { label: '1/4', cat: 'basic' }, { label: '1/8', cat: 'basic' },
    { label: '1/16', cat: 'basic' }, { label: '1/4^', cat: 'basic' }, { label: '1/8^', cat: 'basic' }, { label: 'INV', cat: 'func' },
    { label: 'TRIP', cat: 'tuple' }, { label: 'TRI+', cat: 'tuple' }, { label: 'EUC3', cat: 'eucl' }, { label: 'EUC5', cat: 'eucl' },
    { label: 'EUC7', cat: 'eucl' }, { label: 'EUC11', cat: 'eucl' }, { label: 'SH<', cat: 'func' }, { label: 'SH>', cat: 'func' },
    { label: 'K-RCK', cat: 'genre' }, { label: 'K-UKG', cat: 'genre' }, { label: 'K-HSE', cat: 'genre' }, { label: 'AMEN', cat: 'genre' },
    { label: 'S-BAK', cat: 'genre' }, { label: 'H-CLS', cat: 'genre' }, { label: 'H-OPN', cat: 'genre' }, { label: 'REV', cat: 'func' },
    { label: 'RND20', cat: 'rand' }, { label: 'RND50', cat: 'rand' }, { label: 'RND80', cat: 'rand' }, { label: 'CLR', cat: 'func' }
];

const getEffects = () => JSON.parse(JSON.stringify(DEFAULT_EFFECTS));

const createPatterns = (variation: number, pitch: number, pan: number): PatternData[] => {
    return Array.from({ length: PATTERN_COUNT }, () => ({
        steps: Array(16).fill(false),
        variation,
        pitch,
        pan,
        automation: {}
    }));
};

const createTrack = (
    id: number, name: string, type: InstrumentType, color: string, 
    vol: number, pan: number, pitch: number, variation: number
): Track => ({
    id, name, type, color,
    patterns: createPatterns(variation, pitch, pan),
    activePatternIdx: 0,
    volume: vol,
    pan, pitch, variation,
    muted: false,
    effects: getEffects()
});

// 15 Tracks for 3x5 Grid
const DEFAULT_TRACKS: Track[] = [
  createTrack(0, 'Kick', InstrumentType.KICK, 'red', 0.9, 0, 0, 0),
  createTrack(1, 'Snare', InstrumentType.SNARE, 'orange', 0.8, 0, 0, 0),
  createTrack(2, 'Cl Hat', InstrumentType.HIHAT_CLOSED, 'amber', 0.7, -0.2, 0, 0),
  createTrack(3, 'Op Hat', InstrumentType.HIHAT_OPEN, 'yellow', 0.7, 0.2, 0, 0),
  createTrack(4, 'Bass', InstrumentType.BASS, 'lime', 0.8, 0, 0, 0),
  createTrack(5, 'Clap', InstrumentType.CLAP, 'green', 0.8, 0, 0, 0),
  createTrack(6, 'Lo Tom', InstrumentType.TOM_LOW, 'emerald', 0.8, -0.4, 0, 0),
  createTrack(7, 'Hi Tom', InstrumentType.TOM_HI, 'teal', 0.8, 0.4, 0, 0),
  createTrack(8, 'Synth', InstrumentType.SYNTH_HIT, 'cyan', 0.7, 0, 0, 0),
  createTrack(9, 'Cowbell', InstrumentType.COWBELL, 'sky', 0.6, 0, 0, 0),
  createTrack(10, 'Laser', InstrumentType.LASER, 'blue', 0.5, 0, 0, 0),
  createTrack(11, 'FX', InstrumentType.FX, 'indigo', 0.6, 0, 0, 0),
  createTrack(12, 'Crash', InstrumentType.CRASH, 'violet', 0.7, 0, 0, 0),
  createTrack(13, 'Ride', InstrumentType.RIDE, 'purple', 0.6, 0.3, 0, 0),
  createTrack(14, 'Rim', InstrumentType.RIMSHOT, 'fuchsia', 0.7, -0.1, 0, 0)
];

// 3 Rows of 5 Columns
const KEY_MAP: { [key: string]: number } = {
  'q': 0, 'w': 1, 'e': 2, 'r': 3, 't': 4,
  'a': 5, 's': 6, 'd': 7, 'f': 8, 'g': 9,
  'z': 10, 'x': 11, 'c': 12, 'v': 13, 'b': 14
};

const INITIAL_SCENES: number[][] = Array.from({ length: SCENE_COUNT }, (_, sceneIdx) => 
    Array(16).fill(sceneIdx % PATTERN_COUNT)
);

const cloneTracks = (tracks: Track[]): Track[] => {
    return tracks.map(track => ({
        ...track,
        patterns: JSON.parse(JSON.stringify(track.patterns)),
        effects: JSON.parse(JSON.stringify(track.effects)),
        sample: track.sample ? { ...track.sample } : undefined
    }));
};

// --- KNOB COMPONENT ---
const TempoKnob = ({ bpm, onChange }: { bpm: number, onChange: (bpm: number) => void }) => {
  const tapTimes = useRef<number[]>([]);
  const lastTapTime = useRef<number>(0);

  const handleTap = () => {
      const now = Date.now();
      
      // Reset if too long since last tap (> 2s)
      if (now - lastTapTime.current > 2000) {
          tapTimes.current = [];
      }
      lastTapTime.current = now;
      tapTimes.current.push(now);
      
      // Keep last 4 taps
      if (tapTimes.current.length > 4) {
          tapTimes.current.shift();
      }
      
      if (tapTimes.current.length > 1) {
          const intervals = [];
          for(let i=0; i<tapTimes.current.length-1; i++) {
              intervals.push(tapTimes.current[i+1] - tapTimes.current[i]);
          }
          const avgMs = intervals.reduce((a,b) => a+b, 0) / intervals.length;
          const newBpm = Math.round(60000 / avgMs);
          if (newBpm >= 40 && newBpm <= 300) {
              onChange(newBpm);
          }
      }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
      e.preventDefault();
      const elm = e.currentTarget;
      elm.setPointerCapture(e.pointerId);
      const startY = e.clientY;
      const startBpm = bpm;
      const startTime = Date.now();
      let hasMoved = false;
      
      const onMove = (ev: PointerEvent) => {
          const delta = (startY - ev.clientY); 
          if (Math.abs(delta) > 5) hasMoved = true;
          
          // Sensitivity: 1px = 0.5 BPM
          const change = Math.round(delta * 0.5);
          const newBpm = Math.min(240, Math.max(60, startBpm + change));
          if (newBpm !== bpm) onChange(newBpm);
      };
      
      const onUp = (ev: PointerEvent) => {
          const duration = Date.now() - startTime;
          // If short click and no drag, assume TAP
          if (!hasMoved && duration < 250) {
              handleTap();
          }

          elm.removeEventListener('pointermove', onMove as any);
          elm.removeEventListener('pointerup', onUp as any);
          elm.releasePointerCapture(ev.pointerId);
      };
      
      elm.addEventListener('pointermove', onMove as any);
      elm.addEventListener('pointerup', onUp as any);
  };

  const percentage = (bpm - 60) / (240 - 60);
  const rotation = -135 + (percentage * 270);

  return (
      <div className="flex flex-col items-center gap-1" onPointerDown={handlePointerDown}>
          <div className="w-16 h-16 rounded-full bg-[#e0e0e0] border-2 border-[#bbb] shadow-[0_4px_6px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.5)] relative cursor-ns-resize touch-none flex items-center justify-center group active:scale-95 transition-transform">
               <div className="absolute inset-0 w-full h-full" style={{ transform: `rotate(${rotation}deg)` }}>
                   <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-4 bg-orange-500 rounded-full shadow-sm"></div>
               </div>
               <div className="w-8 h-8 rounded-full bg-[#ccc] shadow-inner border border-[#aaa] flex items-center justify-center">
                    <span className="text-[7px] font-bold text-neutral-400 opacity-50">TAP</span>
               </div>
          </div>
          <span className="text-xs font-black text-neutral-500 mt-1 tracking-widest">TEMPO</span>
      </div>
  );
};

const App: React.FC = () => {
  // -- State --
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);
  const [scenes, setScenes] = useState<number[][]>(INITIAL_SCENES);
  const [bpm, setBpm] = useState(INITIAL_BPM);
  
  const [activeScene, setActiveScene] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState<string>('TR-909');

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState(0);
  const [statusMessage, setStatusMessage] = useState("READY");
  const [legendaryPatternIdx, setLegendaryPatternIdx] = useState<number | null>(null);

  const [modValue, setModValue] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const lockSnapshotRef = useRef<{ tracks: Track[], scenes: number[][], bpm: number } | null>(null);

  const [isSampling, setIsSampling] = useState(false);
  const [recordingAnalyser, setRecordingAnalyser] = useState<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [previewBuffer, setPreviewBuffer] = useState<AudioBuffer | null>(null);

  const audioSynth = useRef<AudioSynth | null>(null);
  const nextNoteTime = useRef(0);
  const timerID = useRef<number | null>(null);
  const currentStepRef = useRef(0); 
  const playbackStepRef = useRef(0);
  const isPlayingRef = useRef(false);
  const tracksRef = useRef(tracks); 
  const padRefs = useRef<{ [id: number]: PadHandle | null }>({});
  const mixerRef = useRef<MixerHandle>(null);
  const isRecordingRef = useRef(false);
  const metronomeEnabledRef = useRef(false);
  const randomIntervalRef = useRef<number | null>(null);
  const activeSceneRef = useRef(activeScene);
  const scenesRef = useRef(scenes);
  
  const historyRef = useRef<{ tracks: Track[], scenes: number[][], bpm: number }[]>([]);
  
  const bpmRef = useRef(bpm);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
      scenesRef.current = scenes;
  }, [scenes]);
  
  useEffect(() => {
    activeSceneRef.current = activeScene;
  }, [activeScene]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    metronomeEnabledRef.current = metronomeEnabled;
  }, [metronomeEnabled]);

  useEffect(() => {
      bpmRef.current = bpm; 
      if(audioSynth.current) {
          audioSynth.current.updateBpm(bpm);
      }
  }, [bpm]);

  useEffect(() => {
      const unlock = () => {
          if (audioSynth.current) {
              audioSynth.current.resume().catch(() => {});
          }
      };
      window.addEventListener('mousedown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
      return () => {
          window.removeEventListener('mousedown', unlock);
          window.removeEventListener('keydown', unlock);
          window.removeEventListener('touchstart', unlock);
      };
  }, []);

  const initAudio = () => {
    if (!audioSynth.current) {
      audioSynth.current = new AudioSynth();
      tracks.forEach(t => audioSynth.current?.updateTrackParameters(t));
    }
  };

  useEffect(() => {
      const track = tracks.find(t => t.id === selectedTrackId);
      if (track && audioSynth.current) {
          const gen = async () => {
              const buf = await audioSynth.current!.renderPreview(track);
              setPreviewBuffer(buf);
          };
          gen();
      }
  }, [selectedTrackId, tracks, selectedGenre]); 

  const addToHistory = useCallback(() => {
      historyRef.current.push({
          tracks: cloneTracks(tracksRef.current),
          scenes: JSON.parse(JSON.stringify(scenesRef.current)),
          bpm: bpmRef.current
      });
      if (historyRef.current.length > 50) {
          historyRef.current.shift();
      }
  }, []);

  const handleUndo = useCallback(() => {
      const prev = historyRef.current.pop();
      if (prev) {
          setTracks(cloneTracks(prev.tracks));
          setScenes(JSON.parse(JSON.stringify(prev.scenes)));
          setBpm(prev.bpm);
          
          if (audioSynth.current) {
             audioSynth.current.updateBpm(prev.bpm);
             prev.tracks.forEach(t => audioSynth.current?.updateTrackParameters(t));
          }
          setStatusMessage("UNDO ACTION");
      } else {
          setStatusMessage("NOTHING TO UNDO");
      }
  }, []);

  const handleToggleLock = useCallback(() => {
      if (isLocked) {
          if (lockSnapshotRef.current) {
              const snapshot = lockSnapshotRef.current;
              setTracks(cloneTracks(snapshot.tracks));
              setScenes(JSON.parse(JSON.stringify(snapshot.scenes)));
              setBpm(snapshot.bpm);
              
              if (audioSynth.current) {
                  snapshot.tracks.forEach(t => audioSynth.current?.updateTrackParameters(t));
                  audioSynth.current.updateBpm(snapshot.bpm);
              }
              setStatusMessage("STATE RESTORED");
          }
          setIsLocked(false);
          lockSnapshotRef.current = null;
      } else {
          lockSnapshotRef.current = {
              tracks: cloneTracks(tracksRef.current),
              scenes: JSON.parse(JSON.stringify(scenesRef.current)),
              bpm: bpmRef.current
          };
          setIsLocked(true);
          setStatusMessage("STATE LOCKED");
      }
  }, [isLocked]);

  const adjustBpm = useCallback((amount: number) => {
    setBpm(prev => {
        const next = prev + amount;
        return Math.min(234, Math.max(1, next));
    });
  }, []);

  const togglePlay = async () => {
    initAudio();
    await audioSynth.current?.resume();
    setIsPlaying(prev => !prev);
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (isPlaying) {
      currentStepRef.current = 0;
      setCurrentStep(0);
      playbackStepRef.current = 0;
      nextNoteTime.current = audioSynth.current?.getContext().currentTime! + 0.05;
      scheduler();
    } else {
      if (timerID.current) window.cancelAnimationFrame(timerID.current);
    }
  }, [isPlaying]);

  const visualTrigger = (id: number, variation: number) => {
    padRefs.current[id]?.trigger(variation);
    mixerRef.current?.trigger(id);
  };

  const recordAutomation = useCallback((id: number, key: string, value: number) => {
      if (isPlayingRef.current && isRecordingRef.current) {
          const step = playbackStepRef.current;
          setTracks(prev => prev.map(t => {
              if (t.id === id) {
                  const activePIdx = t.activePatternIdx;
                  const newPatterns = [...t.patterns];
                  const currentPattern = newPatterns[activePIdx];
                  
                  const newAutomation = { ...currentPattern.automation };
                  if (!newAutomation[key]) {
                      newAutomation[key] = Array(16).fill(null);
                  }
                  
                  const newStepValues = [...newAutomation[key]];
                  newStepValues[step] = value;
                  newAutomation[key] = newStepValues;
                  
                  newPatterns[activePIdx] = { ...currentPattern, automation: newAutomation };
                  return { ...t, patterns: newPatterns };
              }
              return t;
          }));
      }
  }, []);

  const scheduleNote = (stepNumber: number, time: number) => {
    const drawStep = stepNumber;
    const ctx = audioSynth.current?.getContext();
    
    if (!ctx) return;

    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);

    if (metronomeEnabledRef.current && stepNumber % 4 === 0) {
        audioSynth.current?.playClick(time, stepNumber === 0);
    }

    tracksRef.current.forEach(track => {
        const pattern = track.patterns[track.activePatternIdx];
        const isActive = pattern.steps[stepNumber];
        let automatedTrack = track;

        if (pattern.automation) {
            const autoKeys = Object.keys(pattern.automation);
            const hasChanges = autoKeys.some(k => pattern.automation[k][stepNumber] !== null);
            
            if (hasChanges) {
                 automatedTrack = {
                     ...track,
                     effects: { ...track.effects },
                     pitch: track.pitch,
                     volume: track.volume,
                     pan: track.pan
                 };

                 autoKeys.forEach(key => {
                     const val = pattern.automation[key][stepNumber];
                     if (val !== null) {
                         if (key === 'volume') automatedTrack.volume = val;
                         else if (key === 'pitch') automatedTrack.pitch = val;
                         else if (key === 'pan') automatedTrack.pan = val;
                         else if (key.startsWith('effects.')) {
                             const parts = key.split('.');
                             if (parts.length === 3) {
                                 const type = parts[1] as keyof ChannelEffects;
                                 const field = parts[2] as 'active' | 'value';
                                 automatedTrack.effects[type] = {
                                     ...automatedTrack.effects[type],
                                     [field]: field === 'active' ? !!val : val
                                 };
                             }
                         }
                     }
                 });
                 
                 audioSynth.current?.updateTrackParameters(automatedTrack, time);
            }
        }

        if (isActive && !track.muted) {
            audioSynth.current?.trigger(automatedTrack, time);
        }
    });

    setTimeout(() => {
       setCurrentStep(drawStep);
       playbackStepRef.current = drawStep; 
       tracksRef.current.filter(t => t.patterns[t.activePatternIdx].steps[stepNumber]).forEach(t => {
            visualTrigger(t.id, t.variation);
       });
    }, delayMs);
  };

  const scheduler = () => {
    if (!audioSynth.current) return;
    const scheduleAheadTime = 0.1;

    while (nextNoteTime.current < audioSynth.current.getContext().currentTime + scheduleAheadTime) {
      scheduleNote(currentStepRef.current, nextNoteTime.current);
      nextNote();
    }
    
    if (isPlayingRef.current) {
      timerID.current = requestAnimationFrame(scheduler);
    }
  };

  const nextNote = () => {
    const secondsPerBeat = 60.0 / bpmRef.current; 
    const secondsPerStep = secondsPerBeat / 4; 
    nextNoteTime.current += secondsPerStep;
    currentStepRef.current = (currentStepRef.current + 1) % STEPS;
  };

  const recordNote = useCallback((id: number) => {
    if (isPlayingRef.current && isRecordingRef.current) {
        addToHistory(); 
        const currentS = playbackStepRef.current; 
        setTracks(prev => prev.map(t => {
            if (t.id === id) {
                const activePIdx = t.activePatternIdx;
                const newPatterns = [...t.patterns];
                const newPatternData = { ...newPatterns[activePIdx] };
                const newSteps = [...newPatternData.steps];
                newSteps[currentS] = true;
                newPatternData.steps = newSteps;
                newPatterns[activePIdx] = newPatternData;
                return { ...t, patterns: newPatterns };
            }
            return t;
        }));
    }
  }, [addToHistory]);

  const handlePadTrigger = useCallback((id: number) => {
    const track = tracksRef.current.find(t => t.id === id);
    if (track) {
        visualTrigger(id, track.variation);
    }

    initAudio();
    audioSynth.current?.resume().catch(() => {}); 

    if (track && !track.muted) {
      audioSynth.current?.trigger(track);
      recordNote(id);
    }
  }, [recordNote]);

  const handleToggleStep = useCallback((stepIndex: number) => {
    addToHistory(); 
    setTracks(prev => prev.map(t => {
      if (t.id === selectedTrackId) {
        const activePIdx = t.activePatternIdx;
        const newPatterns = [...t.patterns];
        const newPatternData = { ...newPatterns[activePIdx] };
        const newSteps = [...newPatternData.steps];
        newSteps[stepIndex] = !newSteps[stepIndex];
        newPatternData.steps = newSteps;
        newPatterns[activePIdx] = newPatternData;
        return { ...t, patterns: newPatterns };
      }
      return t;
    }));
  }, [selectedTrackId, addToHistory]);

  const handleVariationSelect = useCallback((id: number, variation: number) => {
    initAudio();
    audioSynth.current?.resume().catch(() => {});
    visualTrigger(id, variation);
    
    const currentTrack = tracksRef.current.find(t => t.id === id);
    if (currentTrack && !currentTrack.muted) {
        const tempTrack = { ...currentTrack, variation: variation };
        audioSynth.current?.trigger(tempTrack);
    }

    addToHistory(); 
    setTracks(prev => {
        const next = prev.map(t => {
            if (t.id === id) {
                const activePIdx = t.activePatternIdx;
                const newPatterns = [...t.patterns];
                newPatterns[activePIdx] = { ...newPatterns[activePIdx], variation: variation };
                return { ...t, variation: variation, patterns: newPatterns };
            }
            return t;
        });
        return next;
    });
    setSelectedTrackId(id);
    recordNote(id); 
  }, [recordNote, addToHistory]);

  const handleMuteToggle = useCallback((id: number) => {
     addToHistory();
     setTracks(prev => prev.map(t => {
         if (t.id === id) {
             const newMuted = !t.muted;
             setStatusMessage(newMuted ? `${t.name} MUTED` : `${t.name} ACTIVE`);
             return { ...t, muted: newMuted };
         }
         return t;
     }));
  }, [addToHistory]);

  const handleClearAll = () => {
    addToHistory();
    setTracks(prev => prev.map(t => {
        const newPatterns = [...t.patterns];
        const active = t.activePatternIdx;
        newPatterns[active] = { ...newPatterns[active], steps: Array(16).fill(false), automation: {} };
        return { ...t, patterns: newPatterns };
    }));
    setStatusMessage("PATTERN CLEARED");
    setLegendaryPatternIdx(null);
  };

  const handleClearTrack = () => {
    addToHistory();
    setTracks(prev => prev.map(t => {
        if (t.id === selectedTrackId) {
            const newPatterns = [...t.patterns];
            const active = t.activePatternIdx;
            newPatterns[active] = { ...newPatterns[active], steps: Array(16).fill(false), automation: {} };
            return { ...t, patterns: newPatterns };
        }
        return t;
    }));
    setStatusMessage("TRACK CLEARED");
  };

  const handleQuickFill = useCallback((type: string) => {
      addToHistory();
      setTracks(prev => prev.map(t => {
          if (t.id === selectedTrackId) {
              const activePIdx = t.activePatternIdx;
              const newPatterns = [...t.patterns];
              let newSteps = [...newPatterns[activePIdx].steps]; 
              const reset = () => newSteps.fill(false);
              
              switch(type) {
                  case 'CLR': reset(); break;
                  case '1/1': reset(); newSteps[0] = true; break;
                  case '1/2': reset(); [0, 8].forEach(i => newSteps[i] = true); break;
                  case '1/4': reset(); [0, 4, 8, 12].forEach(i => newSteps[i] = true); break;
                  case '1/4^': reset(); [4, 12].forEach(i => newSteps[i] = true); break;
                  case '1/8': reset(); for(let i=0; i<16; i+=2) newSteps[i] = true; break;
                  case '1/8^': reset(); for(let i=1; i<16; i+=2) newSteps[i] = true; break;
                  case '1/16': newSteps.fill(true); break;
                  case 'TRIP': reset(); [0, 3, 6, 9, 12, 15].forEach(i => newSteps[i] = true); break;
                  case 'TRI+': reset(); [1, 4, 7, 10, 13].forEach(i => newSteps[i] = true); break;
                  case 'EUC3': reset(); [0, 5, 11].forEach(i => newSteps[i] = true); break;
                  case 'EUC5': reset(); [0, 3, 6, 10, 13].forEach(i => newSteps[i] = true); break;
                  case 'EUC7': reset(); [0, 2, 5, 7, 9, 12, 14].forEach(i => newSteps[i] = true); break;
                  case 'EUC11': reset(); [0, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15].forEach(i => newSteps[i] = true); break;
                  case 'AMEN': reset(); [0, 2, 4, 7, 8, 10, 12, 15].forEach(i => newSteps[i] = true); break;
                  case 'K-RCK': reset(); [0, 2, 10].forEach(i => newSteps[i] = true); break;
                  case 'K-HSE': reset(); [0, 4, 8, 12].forEach(i => newSteps[i] = true); break;
                  case 'K-UKG': reset(); [0, 3, 8, 10].forEach(i => newSteps[i] = true); break;
                  case 'S-BAK': reset(); [4, 12].forEach(i => newSteps[i] = true); break;
                  case 'H-CLS': reset(); for(let i=0; i<16; i+=2) newSteps[i] = true; break;
                  case 'H-OPN': reset(); [2, 6, 10, 14].forEach(i => newSteps[i] = true); break;
                  case 'RND20': reset(); for(let i=0; i<16; i++) if(Math.random() < 0.2) newSteps[i] = true; break;
                  case 'RND50': reset(); for(let i=0; i<16; i++) if(Math.random() < 0.5) newSteps[i] = true; break;
                  case 'RND80': reset(); for(let i=0; i<16; i++) if(Math.random() < 0.8) newSteps[i] = true; break;
                  case 'INV': newSteps = newSteps.map(s => !s); break;
                  case 'REV': newSteps.reverse(); break;
                  case 'SH<': { const f = newSteps.shift(); if(f!==undefined) newSteps.push(f); break; }
                  case 'SH>': { const l = newSteps.pop(); if(l!==undefined) newSteps.unshift(l); break; }
              }

              newPatterns[activePIdx] = { ...newPatterns[activePIdx], steps: newSteps };
              return { ...t, patterns: newPatterns };
          }
          return t;
      }));
      setStatusMessage(`FILL: ${type}`);
  }, [selectedTrackId, addToHistory]);

  const handleVolumeChange = useCallback((id: number, val: number) => {
    recordAutomation(id, 'volume', val);

    setTracks(prev => prev.map(t => {
        if (t.id === id) return { ...t, volume: val };
        return t;
    }));
  }, [recordAutomation]);

  const handleEffectChange = useCallback((id: number, effectType: keyof ChannelEffects, param: 'active' | 'value', val: number | boolean) => {
     recordAutomation(id, `effects.${effectType}.${param}`, typeof val === 'boolean' ? (val ? 1 : 0) : val);
     
     setTracks(prev => prev.map(t => {
         if (t.id === id) {
             return {
                 ...t,
                 effects: {
                     ...t.effects,
                     [effectType]: {
                         ...t.effects[effectType],
                         [param]: val
                     }
                 }
             };
         }
         return t;
     }));
  }, [recordAutomation]);

  const startSampling = async () => {
        initAudio();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            if (audioSynth.current) {
                const ctx = audioSynth.current.getContext();
                const source = ctx.createMediaStreamSource(stream);
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 2048;
                source.connect(analyser);
                setRecordingAnalyser(analyser);
            }

            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr;
            chunksRef.current = [];

            mr.ondataavailable = (e) => {
                chunksRef.current.push(e.data);
            };

            mr.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/ogg; codecs=opus' });
                const arrayBuffer = await blob.arrayBuffer();
                if (audioSynth.current) {
                    const ctx = audioSynth.current.getContext();
                    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                    
                    addToHistory();
                    setTracks(prev => prev.map(t => {
                        if (t.id === selectedTrackId) {
                            return {
                                ...t,
                                sample: {
                                    buffer: audioBuffer,
                                    start: 0,
                                    end: 1,
                                    isCustom: true
                                }
                            };
                        }
                        return t;
                    }));
                    setStatusMessage("SAMPLE RECORDED");
                }
                stream.getTracks().forEach(t => t.stop());
                setRecordingAnalyser(null); 
            };

            mr.start();
            setIsSampling(true);
        } catch (err) {
            console.error("Mic error:", err);
            setStatusMessage("MIC ERROR");
        }
  };

  const stopSampling = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
          setIsSampling(false);
      }
  };

  const handleSampleRegionUpdate = useCallback((newStart: number, newEnd: number) => {
       setTracks(prev => prev.map(t => {
          if (t.id === selectedTrackId && t.sample) {
              return { ...t, sample: { ...t.sample, start: newStart, end: newEnd } };
          }
          return t;
      }));
  }, [selectedTrackId]);

  const handlePitchWheel = useCallback((val: number) => {
     const effectivePitch = val * 3; 
     if (isPlayingRef.current && isRecordingRef.current) {
         recordAutomation(selectedTrackId, 'pitch', effectivePitch);
     }
     setTracks(prev => prev.map(t => {
          if (t.id === selectedTrackId) {
             const activePIdx = t.activePatternIdx;
             const newPatterns = [...t.patterns];
             newPatterns[activePIdx] = { ...newPatterns[activePIdx], pitch: effectivePitch };
             return { ...t, pitch: effectivePitch, patterns: newPatterns };
          }
          return t;
     }));
     setStatusMessage(`PITCH: ${effectivePitch.toFixed(2)}`);
  }, [selectedTrackId, recordAutomation]);

  const handleModWheel = useCallback((val: number) => {
      setModValue(val);
      setTracks(prev => prev.map(t => {
          if (t.id === selectedTrackId) {
               const newVol = 0.5 + (val * 1.0); 
               if (isPlayingRef.current && isRecordingRef.current) {
                  recordAutomation(selectedTrackId, 'volume', newVol);
               }
               return { ...t, volume: newVol };
          }
          return t;
      }));
      setStatusMessage(`MOD VOL: ${(val * 100).toFixed(0)}%`);
  }, [selectedTrackId, recordAutomation]);

  const handleSampleClear = () => {
      addToHistory();
      setTracks(prev => prev.map(t => {
          if (t.id === selectedTrackId) {
              return { ...t, sample: undefined };
          }
          return t;
      }));
      setStatusMessage("SAMPLE CLEARED");
  };

  const loadLegendaryPattern = useCallback((index: number) => {
      if (index < 0 || index >= LEGENDARY_PATTERNS.length) return;
      addToHistory();
      const pattern = LEGENDARY_PATTERNS[index];
      
      const parseSteps = (str: string) => {
          const s = Array(16).fill(false);
          const clean = str.replace(/[\s|]/g, '');
          for (let i=0; i<16; i++) if(clean[i] && clean[i].toLowerCase() === 'x') s[i] = true;
          return s;
      };

      setTracks(prev => prev.map(t => {
          const patternStr = pattern.tracks[t.id];
          if (patternStr) {
              const newPatterns = [...t.patterns];
              const activePIdx = t.activePatternIdx;
              newPatterns[activePIdx] = {
                  ...newPatterns[activePIdx],
                  steps: parseSteps(patternStr),
                  automation: {} 
              };
              return { ...t, patterns: newPatterns };
          } else {
              const newPatterns = [...t.patterns];
              const activePIdx = t.activePatternIdx;
              newPatterns[activePIdx] = { ...newPatterns[activePIdx], steps: Array(16).fill(false), automation: {} };
              return { ...t, patterns: newPatterns };
          }
      }));
      
      setLegendaryPatternIdx(index);
      setStatusMessage(`LEGEND: ${pattern.name}`); 
  }, [addToHistory]);

  const handleNextPattern = () => {
      let next = (legendaryPatternIdx ?? -1) + 1;
      if (next >= LEGENDARY_PATTERNS.length) next = 0;
      loadLegendaryPattern(next);
  };

  const handlePrevPattern = () => {
      let prev = (legendaryPatternIdx ?? 0) - 1;
      if (prev < 0) prev = LEGENDARY_PATTERNS.length - 1;
      loadLegendaryPattern(prev);
  };

  const loadGenre = (genre: string) => {
      addToHistory();
      setSelectedGenre(genre);
      setStatusMessage(`PACK LOADED: ${genre}`);
      initAudio();
      setLegendaryPatternIdx(null); 
      
      if (audioSynth.current) {
          audioSynth.current.setGenre(genre);
      }

      const newGenrePatterns = getGenrePatterns(genre);

      setTracks(prev => prev.map(t => {
          let newEffects = getEffects();
          let newPitch = 0;
          let newVol = t.volume;
          let newName = t.name;

          if (GENRE_KIT_MAP[genre] && GENRE_KIT_MAP[genre][t.id]) {
              newName = GENRE_KIT_MAP[genre][t.id];
          } else {
              const def = DEFAULT_TRACKS.find(dt => dt.id === t.id);
              if (def) newName = def.name;
          }
          
          switch(genre) {
              case 'TR-909':
                  if (t.type === InstrumentType.KICK) { newVol = 1.0; }
                  if (t.type === InstrumentType.HIHAT_OPEN) { newEffects.reverb.active = true; newEffects.reverb.value = 0.2; }
                  break;
              case 'MEMPHIS':
                  if (t.type === InstrumentType.KICK) { newEffects.bitcrush.active = true; newEffects.bitcrush.value = 0.2; }
                  if (t.type === InstrumentType.COWBELL) { newEffects.reverb.active = true; newEffects.reverb.value = 0.4; }
                  break;
              case 'ETHNIC-WORLD':
                   if (t.type === InstrumentType.CHORD) { newEffects.reverb.active = true; newEffects.reverb.value = 0.6; } 
                   break;
              case 'GABBER':
                   if (t.type === InstrumentType.KICK) { newVol = 1.0; newEffects.bitcrush.active = true; newEffects.bitcrush.value = 0.6; }
                   break;
              case 'UK-GARAGE':
                   if (t.type === InstrumentType.SNARE) { newPitch = 0.2; }
                   if (t.type === InstrumentType.HIHAT_CLOSED) { newVol = 0.6; }
                   break;
              case 'ACID':
                   if (t.type === InstrumentType.BASS) { newEffects.delay.active = true; newEffects.delay.value = 0.4; }
                   break;
              case 'HARDSTYLE':
                   if (t.type === InstrumentType.KICK) { newVol = 1.0; }
                   break;
              case 'DUBSTEP':
                   if (t.type === InstrumentType.BASS) { newEffects.filter.active = true; newEffects.filter.value = 0.3; } 
                   break;
          }
          
          const trackPatterns = [...t.patterns];
          const newPatternData = newGenrePatterns[t.id] || [];
          
          for (let i=0; i<PATTERN_COUNT; i++) {
              if (newPatternData[i]) {
                  trackPatterns[i] = {
                      ...trackPatterns[i],
                      steps: newPatternData[i].steps || trackPatterns[i].steps,
                      variation: newPatternData[i].variation ?? trackPatterns[i].variation,
                      pitch: newPatternData[i].pitch ?? trackPatterns[i].pitch,
                      pan: newPatternData[i].pan ?? trackPatterns[i].pan,
                      automation: {}
                  };
              } else if (i >= newPatternData.length) {
                  trackPatterns[i] = { ...trackPatterns[i], steps: Array(16).fill(false), automation: {} };
              }
          }

          return {
              ...t,
              name: newName,
              pitch: newPitch,
              volume: newVol,
              effects: newEffects,
              patterns: trackPatterns
          };
      }));
  };

  const handlePatternSelect = (patternIndex: number) => {
      addToHistory();
      const currentSceneIdx = activeSceneRef.current;
      
      setTracks(prev => prev.map(t => {
          if (t.id === selectedTrackId) {
              const targetPattern = t.patterns[patternIndex];
              return { 
                  ...t, 
                  activePatternIdx: patternIndex,
                  variation: targetPattern.variation,
                  pitch: targetPattern.pitch,
                  pan: targetPattern.pan
              };
          }
          return t;
      }));

      setScenes(prev => {
          const newScenes = [...prev];
          const newScene = [...newScenes[currentSceneIdx]];
          newScene[selectedTrackId] = patternIndex;
          newScenes[currentSceneIdx] = newScene;
          return newScenes;
      });

      setStatusMessage(`TRK ${selectedTrackId + 1} -> PTN ${patternIndex + 1}`);
  };

  const handleSceneSelect = useCallback((sceneIndex: number) => {
      if (sceneIndex < 0 || sceneIndex >= SCENE_COUNT) return;
      addToHistory();
      setActiveScene(sceneIndex);
      const targetScene = scenesRef.current[sceneIndex];
      
      setTracks(prev => prev.map(t => {
         const targetPatternIdx = targetScene[t.id];
         const targetPattern = t.patterns[targetPatternIdx];
         return { 
             ...t, 
             activePatternIdx: targetPatternIdx,
             variation: targetPattern.variation,
             pitch: targetPattern.pitch,
             pan: targetPattern.pan
         };
      }));
      
      setStatusMessage(`SCENE ${sceneIndex + 1} LOADED`);
  }, [addToHistory]);

  const handleRandomize = useCallback(() => {
      const randomIndex = Math.floor(Math.random() * LEGENDARY_PATTERNS.length);
      loadLegendaryPattern(randomIndex);
  }, [loadLegendaryPattern]);

  const startRandomizing = () => {
    handleRandomize();
    if (randomIntervalRef.current) clearInterval(randomIntervalRef.current);
    randomIntervalRef.current = window.setInterval(handleRandomize, 180);
  };

  const stopRandomizing = () => {
    if (randomIntervalRef.current) {
        clearInterval(randomIntervalRef.current);
        randomIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isContinuous = ['=', '+', '-', '_', 'arrowup', 'arrowdown'].includes(key);
      if (e.repeat && !isContinuous) return;

      if (key === 'tab') { e.preventDefault(); setIsRecording(prev => !prev); return; }
      if (key === 'delete' || key === 'backspace') { if (key === 'backspace') e.preventDefault(); handleClearTrack(); return; }
      if ((e.metaKey || e.ctrlKey) && key === 'l') { e.preventDefault(); handleToggleLock(); return; }
      if ((e.metaKey || e.ctrlKey) && key === 'z') { e.preventDefault(); handleUndo(); return; }
      
      if (!e.repeat && key >= '1' && key <= '9') {
          e.preventDefault();
          const sceneIdx = parseInt(key) - 1;
          handleSceneSelect(sceneIdx);
          return;
      }

      if (e.key === 'ArrowUp') { e.preventDefault(); setTracks(prev => { const t = prev.find(tr => tr.id === selectedTrackId); if (!t) return prev; const newVol = Math.min(1.0, t.volume + 0.1); setStatusMessage(`VOL: ${Math.round(newVol * 100)}%`); return prev.map(tr => tr.id === selectedTrackId ? { ...tr, volume: newVol } : tr); }); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setTracks(prev => { const t = prev.find(tr => tr.id === selectedTrackId); if (!t) return prev; const newVol = Math.max(0.0, t.volume - 0.1); setStatusMessage(`VOL: ${Math.round(newVol * 100)}%`); return prev.map(tr => tr.id === selectedTrackId ? { ...tr, volume: newVol } : tr); }); }
      
      if (key === '=' || key === '+') { adjustBpm(1); }
      if (key === '-' || key === '_') { adjustBpm(-1); }

      if (key === 'm') { handleMuteToggle(selectedTrackId); }
      
      if (!e.repeat && KEY_MAP[key] !== undefined) { 
          const id = KEY_MAP[key]; 
          if (tracksRef.current.find(t => t.id === id)) { 
              handlePadTrigger(id); 
              setSelectedTrackId(id); 
          } 
      }
      
      if (!e.repeat && e.key === "'") { 
          const currentTrack = tracksRef.current.find(t => t.id === selectedTrackId); 
          if (currentTrack) { 
             let nextVar = 0;
             if (currentTrack.variation === 0) nextVar = 1;
             else if (currentTrack.variation === 1) nextVar = 3;
             else if (currentTrack.variation === 3) nextVar = 2;
             else if (currentTrack.variation === 2) nextVar = 0;
             handleVariationSelect(selectedTrackId, nextVar); 
          } 
      }

      if (!e.repeat && e.code === 'Space') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrackId, handlePadTrigger, handleVariationSelect, togglePlay, handleMuteToggle, adjustBpm, handleToggleLock, handleUndo, handleSceneSelect]); 

  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || tracks[0];
  const currentPattern = selectedTrack.patterns[selectedTrack.activePatternIdx];
  const hasSample = selectedTrack.sample?.isCustom && selectedTrack.sample.buffer;
  
  const lcdPatternName = legendaryPatternIdx !== null 
      ? `HIST: ${LEGENDARY_PATTERNS[legendaryPatternIdx].name}` 
      : `SCN:${activeScene + 1} / PTN:${selectedTrack.activePatternIdx + 1}`;

  const legendaryCountDisplay = legendaryPatternIdx !== null 
      ? `${(legendaryPatternIdx + 1).toString().padStart(2, '0')}/${LEGENDARY_PATTERNS.length}`
      : "FREE"; 

  return (
    <div className="min-h-screen w-full bg-[#222] flex items-start justify-center p-2 overflow-y-auto">
      <div className="w-full flex flex-col items-center" style={{ '--bpm-duration': `${60/bpm}s` } as React.CSSProperties}>

        <style>{`
            @keyframes chillPulse {
                0% { color: #a5b4fc; filter: brightness(1.1); }
                50% { color: #5eead4; filter: brightness(1.2); }
                100% { color: #a5b4fc; filter: brightness(1.1); }
            }
            .animate-chill-pulse { animation: chillPulse calc(var(--bpm-duration) * 4) infinite ease-in-out; }
            @keyframes breatheGlow {
                0%, 100% { box-shadow: 0 0 5px rgba(34,197,94,0.3), inset 0 0 10px rgba(255,255,255,0.1); border-color: #22c55e; }
                50% { box-shadow: 0 0 20px rgba(34,197,94,0.8), inset 0 0 20px rgba(255,255,255,0.2); border-color: #86efac; }
            }
            .animate-breathe-glow { animation: breatheGlow 1.5s ease-in-out infinite; }

            @keyframes rainbowBorder {
                0% { border-color: #ff0000; box-shadow: 0 0 8px #ff0000; }
                14% { border-color: #ff7f00; box-shadow: 0 0 8px #ff7f00; }
                28% { border-color: #ffff00; box-shadow: 0 0 8px #ffff00; }
                42% { border-color: #00ff00; box-shadow: 0 0 8px #00ff00; }
                57% { border-color: #0000ff; box-shadow: 0 0 8px #0000ff; }
                71% { border-color: #4b0082; box-shadow: 0 0 8px #4b0082; }
                85% { border-color: #9400d3; box-shadow: 0 0 8px #9400d3; }
                100% { border-color: #ff0000; box-shadow: 0 0 8px #ff0000; }
            }
            .animate-rgb-lock {
                 animation: rainbowBorder 2s linear infinite;
            }
        `}</style>

        <div className="w-full max-w-[1800px] bg-[#dcdcdc] rounded-sm shadow-[0_50px_100px_rgba(0,0,0,0.6)] border border-[#aaa] relative flex flex-col h-auto">
                
                <div className="h-8 bg-[#222] border-b border-white/10 w-full flex items-center justify-between px-4 flex-shrink-0 shadow-md">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 animate-pulse"></div>
                        <span className={`text-xs font-black tracking-[0.25em] font-mono transition-all ${isPlaying ? 'animate-chill-pulse' : 'text-neutral-400'}`}>
                            RAVE SUPERBLASTER 3000
                        </span>
                    </div>
                    <div className="text-[9px] text-neutral-500 font-mono tracking-widest hidden sm:block">UNIT 01 // LEGENDARY SERIES</div>
                </div>

                <div className="flex-1 p-3 flex flex-col gap-3">
                    
                    <div className="flex flex-col lg:flex-row gap-3 h-auto lg:h-auto shrink-0">
                        
                        <div className="flex gap-3 flex-1">
                            <PitchModWheels 
                                onPitchChange={handlePitchWheel} 
                                onModChange={handleModWheel}
                                pitchValue={selectedTrack.pitch / 3}
                                modValue={modValue}
                            />

                            <div className="flex flex-col gap-2 flex-1">
                                <LCDDisplay 
                                    bpm={bpm} 
                                    patternName={lcdPatternName}
                                    isPlaying={isPlaying}
                                    isRecording={isRecording}
                                    statusMessage={statusMessage}
                                    metronomeEnabled={metronomeEnabled}
                                    sampleBuffer={selectedTrack.sample?.buffer}
                                    previewBuffer={previewBuffer}
                                    sampleStart={selectedTrack.sample?.start}
                                    sampleEnd={selectedTrack.sample?.end}
                                    isSampling={isSampling}
                                    onSampleUpdate={handleSampleRegionUpdate}
                                    recordingAnalyser={recordingAnalyser}
                                />
                                
                                <div className="flex gap-2 h-12 items-center">
                                    <button onClick={() => setIsRecording(!isRecording)} className={`w-20 h-full flex items-center justify-center rounded-sm font-bold shadow-[0_3px_0_rgba(0,0,0,0.2)] transition-all active:shadow-none active:translate-y-[3px] border border-black/10 ${isRecording ? 'bg-red-600 text-white' : 'bg-[#e0e0e0] text-red-600'}`}>
                                        <span className="text-xs">REC</span>
                                    </button>

                                    <div className="flex items-center justify-center gap-2 bg-[#d4d4d4] border border-white/50 px-2 h-full rounded-sm shadow-inner flex-1 lg:flex-none">
                                        <button 
                                            onPointerDown={startSampling}
                                            onPointerUp={stopSampling}
                                            onPointerLeave={stopSampling}
                                            onTouchStart={(e) => { e.preventDefault(); startSampling(); }}
                                            onTouchEnd={(e) => { e.preventDefault(); stopSampling(); }}
                                            className={`
                                                w-12 h-10 rounded-sm border-b-2 active:border-b-0 active:translate-y-[2px] transition-all flex items-center justify-center
                                                ${isSampling 
                                                    ? 'bg-red-500 text-white border-red-700 shadow-[0_0_10px_rgba(239,68,68,0.8)]' 
                                                    : 'bg-[#e0e0e0] text-neutral-600 border-neutral-400 hover:bg-white'}
                                            `}
                                        >
                                            <MicrophoneIcon className="w-5 h-5" />
                                        </button>
                                        
                                        {hasSample && (
                                            <button 
                                                onClick={handleSampleClear}
                                                className="w-6 h-6 bg-neutral-300 hover:bg-red-200 text-neutral-500 hover:text-red-500 rounded-full flex items-center justify-center ml-2 active:scale-90 transition-transform"
                                                title="Restore Original Sound"
                                            >
                                                <TrashIcon className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={togglePlay} 
                                        className={`
                                            flex-1 h-full rounded-sm font-bold flex items-center justify-center gap-2 transition-all border 
                                            ${isPlaying 
                                                ? 'bg-green-600 text-white animate-breathe-glow translate-y-[3px]' 
                                                : 'bg-[#e0e0e0] text-neutral-800 border-black/10 shadow-[0_3px_0_rgba(0,0,0,0.2)] active:translate-y-[3px] active:shadow-none'
                                            }
                                        `}
                                    >
                                        {isPlaying ? <StopIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                                        <span className="text-sm font-black tracking-wider">{isPlaying ? "STOP" : "PLAY"}</span>
                                    </button>

                                    <div className="flex flex-col items-center gap-1 h-full justify-between py-0.5">
                                        <div className="bg-[#222] text-[#5eead4] font-['VT323'] text-lg leading-none px-2 pt-0.5 rounded-sm border border-white/10 shadow-[inset_0_0_4px_rgba(0,0,0,0.5)] w-full text-center tracking-widest min-w-[80px] flex-1 flex items-center justify-center">
                                            {legendaryCountDisplay}
                                        </div>

                                        <div className="flex items-center bg-[#aaa] rounded-sm p-0.5 gap-1 shadow-[0_3px_0_rgba(0,0,0,0.3)] border border-white/20 h-6">
                                            <button onClick={handlePrevPattern} className="w-8 h-full rounded-sm bg-[#ccc] hover:bg-white active:bg-neutral-400 flex items-center justify-center active:scale-95 transition-transform"><ChevronLeftIcon className="w-3 h-3 text-neutral-700"/></button>
                                            
                                            {/* --- BIGGER RANDOM BUTTON --- */}
                                            <button 
                                                onMouseDown={startRandomizing} 
                                                onMouseUp={stopRandomizing} 
                                                onMouseLeave={stopRandomizing} 
                                                onTouchStart={(e) => { e.preventDefault(); startRandomizing(); }} 
                                                onTouchEnd={(e) => { e.preventDefault(); stopRandomizing(); }} 
                                                className="w-16 h-full bg-orange-500 text-white hover:bg-orange-400 active:bg-orange-600 flex items-center justify-center transition-colors rounded-sm shadow-inner group relative"
                                            >
                                                <CubeIcon className="w-3 h-3 absolute left-1 top-1/2 -translate-y-1/2 opacity-70" />
                                                <BoltIcon className="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2" />
                                            </button>
                                            
                                            <button onClick={handleNextPattern} className="w-8 h-full rounded-sm bg-[#ccc] hover:bg-white active:bg-neutral-400 flex items-center justify-center active:scale-95 transition-transform"><ChevronRightIcon className="w-3 h-3 text-neutral-700"/></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#ccc] rounded-sm p-3 border border-white/50 shadow-inner flex items-center justify-around relative w-full lg:w-80">
                            <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
                                <div className="flex items-center justify-center gap-4">
                                     <TempoKnob bpm={bpm} onChange={setBpm} />
                                     <div className="flex flex-col items-start">
                                         <span className="text-4xl font-black text-neutral-700 font-['VT323'] leading-none">{bpm}</span>
                                         <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">BPM</span>
                                     </div>
                                </div>
                                <div className="flex gap-2 w-full px-2">
                                    <button onClick={handleUndo} className="flex-1 h-10 rounded-md bg-[#e0e0e0] text-[#666] border-b-[4px] border-[#bbb] hover:bg-white flex items-center justify-center gap-2 active:translate-y-[2px] active:border-b-0 shadow-sm group">
                                        <ArrowUturnLeftIcon className="w-4 h-4 group-active:-rotate-45 transition-transform" /> <span className="text-[9px]">UNDO</span>
                                    </button>
                                    <button onClick={() => setMetronomeEnabled(!metronomeEnabled)} className={`flex-1 h-10 rounded-md font-bold border-b-[4px] flex items-center justify-center gap-2 transition-all active:translate-y-[2px] active:border-b-0 active:shadow-none shadow-sm ${metronomeEnabled ? 'bg-[#333] text-white border-black' : 'bg-[#e0e0e0] text-neutral-600 border-[#bbb]'}`}>
                                        <ClockIcon className="w-4 h-4" /> <span className="text-[9px]">CLK</span>
                                    </button>
                                    <button onClick={handleClearAll} className="flex-1 h-10 rounded-md bg-[#e0e0e0] text-[#666] border-b-[4px] border-[#bbb] hover:bg-red-100 flex items-center justify-center gap-2 active:translate-y-[2px] active:border-b-0 shadow-sm">
                                        <TrashIcon className="w-4 h-4" /> <span className="text-[9px]">ALL</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full flex flex-col items-center justify-center py-2 bg-[#d4d4d4] rounded-sm border border-white/50 shadow-sm"> 
                        <div className="flex items-center gap-2 mb-1 opacity-60">
                            <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full"></div>
                            <span className="text-xs font-black text-neutral-500 tracking-[0.3em] uppercase">Global Scenes (KEYS 1-9)</span>
                            <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full"></div>
                        </div>
                        <div className="flex gap-1.5 justify-center w-full overflow-x-auto px-4 pb-1 scrollbar-hide">
                            {Array.from({length: SCENE_COUNT}).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSceneSelect(i)}
                                    className={`
                                        min-w-[2.5rem] h-10 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-100
                                        rounded-sm border-b-[3px] shadow-sm
                                        ${activeScene === i 
                                            ? 'bg-white text-black translate-y-[1px] shadow-none ring-2 ring-neutral-400 z-10 border-transparent' 
                                            : `${SCENE_COLORS[i % SCENE_COLORS.length]} text-white border-black/20 active:border-b-0 active:translate-y-[3px] hover:brightness-110 opacity-90 hover:opacity-100`}
                                    `}
                                >
                                    <span className="text-[7px] opacity-60 mb-0.5 font-bold">SCN</span>
                                    <span className="text-sm font-black leading-none">{i + 1}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#e0e0e0] p-2 rounded-sm border border-white shadow-sm shrink-0 flex flex-col gap-2">
                        
                        <div className="bg-[#ccc] rounded-sm p-1.5 border border-white/20 shadow-inner w-full">
                            <div className="flex justify-between items-center mb-1 opacity-60 px-1">
                                <div className="flex items-center gap-2">
                                    <BoltIcon className="w-3 h-3 text-neutral-600"/>
                                    <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">QUICK FILL</span>
                                </div>
                                <span className="text-[9px] font-mono text-neutral-500">28 PRESETS</span>
                            </div>
                            
                            {/* --- COMPACT HORIZONTAL LAYOUT (NO SCROLL) --- */}
                            <div className="flex flex-wrap gap-[2px] h-6 overflow-hidden content-start">
                                {FILL_BUTTONS.map((fill, idx) => {
                                    let bgClass = 'bg-[#e0e0e0] hover:bg-white text-neutral-700';
                                    if (fill.cat === 'func') bgClass = 'bg-neutral-300 hover:bg-neutral-200 text-neutral-800';
                                    if (fill.cat === 'genre') bgClass = 'bg-blue-100 hover:bg-blue-50 text-blue-800';
                                    if (fill.cat === 'rand') bgClass = 'bg-orange-100 hover:bg-orange-50 text-orange-800';
                                    if (fill.cat === 'eucl') bgClass = 'bg-emerald-100 hover:bg-emerald-50 text-emerald-800';
                                    if (fill.cat === 'tuple') bgClass = 'bg-purple-100 hover:bg-purple-50 text-purple-800';
                                    
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleQuickFill(fill.label)}
                                            className={`
                                                ${bgClass}
                                                flex-1 min-w-[24px] h-6 rounded-[1px] border-b border-black/10 active:border-b-0 active:translate-y-[1px] transition-all
                                                flex items-center justify-center shadow-sm group text-[8px] font-black tracking-tighter leading-none
                                            `}
                                            title={fill.label}
                                        >
                                            {fill.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="h-16 flex gap-2 mt-1">
                             <div className="w-20 bg-neutral-800 rounded-sm flex flex-col items-center justify-center border-b-4 border-black shadow-md shrink-0">
                                <div className={`w-3 h-3 rounded-full ${TRACK_COLORS[selectedTrack.color]} mb-1 shadow-[0_0_5px_currentColor]`}></div>
                                <span className="text-[8px] text-neutral-500 font-bold">TRACK</span>
                                <span className="text-sm font-black text-white uppercase leading-none truncate w-full text-center px-1">{selectedTrack.name}</span>
                             </div>

                            <div className="flex-1 relative bg-[#2a2a2a] rounded-sm p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] border-b border-white/10">
                                <StepSequencer 
                                    steps={currentPattern.steps}
                                    currentStep={currentStep}
                                    onToggleStep={handleToggleStep}
                                    trackColor={selectedTrack.color}
                                />
                            </div>
                            <button onClick={handleClearTrack} className="w-12 h-full bg-[#d0d0d0] rounded-sm border-b-4 border-[#aaa] active:border-b-0 active:translate-y-[4px] transition-all flex flex-col items-center justify-center hover:bg-red-100 group shadow-sm shrink-0">
                                <span className="text-[10px] font-black text-neutral-500 group-hover:text-red-500 -rotate-90 tracking-widest">CLR</span>
                            </button>
                        </div>

                        <div className="flex flex-col gap-1 items-start w-full mt-1">
                             <div className="flex items-center gap-2 px-1">
                                 <div className={`w-2 h-2 rounded-full ${TRACK_COLORS[selectedTrack.color]}`}></div>
                                 <span className="text-[10px] font-black text-[#888] tracking-widest uppercase">PATTERNS (7 BANKS)</span>
                             </div>
                             <div className="flex gap-1 w-full">
                                {Array.from({length: PATTERN_COUNT}).map((_, i) => {
                                    const isActive = selectedTrack.activePatternIdx === i;
                                    const activeClass = TRACK_COLORS[selectedTrack.color];
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handlePatternSelect(i)}
                                            className={`
                                                flex-1 h-8 text-xs font-black flex items-center justify-center transition-all
                                                ${isActive 
                                                    ? `${activeClass} text-white translate-y-[2px] shadow-none ring-2 ring-white/50 z-10`
                                                    : 'bg-[#dcdcdc] text-[#888] hover:bg-white border-b-[4px] border-[#bbb] active:border-b-0 active:translate-y-[4px] shadow-md'}
                                            `}
                                            style={{ borderRadius: '2px' }}
                                        >
                                            PTN {i + 1}
                                        </button>
                                    );
                                })}
                             </div>
                             <button 
                                onClick={handleToggleLock}
                                className={`
                                    w-full mt-1 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all border
                                    ${isLocked 
                                        ? 'animate-rgb-lock text-white shadow-[0_0_15px_rgba(255,255,255,0.5)] border-transparent bg-neutral-900' 
                                        : 'bg-[#d0d0d0] text-neutral-600 border-[#bbb] shadow-sm hover:bg-white active:translate-y-[1px]'}
                                `}
                             >
                                {isLocked ? <LockClosedIcon className="w-3 h-3" /> : <LockOpenIcon className="w-3 h-3" />}
                                {isLocked ? "LOCKED (PRESS TO RESTORE)" : "LOCK STATE"}
                             </button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 items-stretch">
                        <div className="flex flex-col gap-1 flex-grow lg:flex-[2]">
                            <div className="flex justify-end items-end px-2 border-b-2 border-neutral-400 pb-1 shrink-0">
                                <div className="flex gap-2 items-center overflow-x-auto pb-1 w-full scrollbar-hide">
                                    {GENRES.map((genre) => (
                                        <button 
                                            key={genre}
                                            onClick={() => loadGenre(genre)}
                                            className={`
                                                text-xs font-mono px-3 py-1.5 rounded-sm transition-all border-b-2 active:border-b-0 active:translate-y-[2px] font-bold whitespace-nowrap
                                                ${selectedGenre === genre 
                                                    ? 'bg-neutral-800 text-white border-neutral-950 shadow-lg scale-105' 
                                                    : 'bg-neutral-300 text-neutral-600 border-neutral-400 hover:bg-white'}
                                            `}
                                        >
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full relative bg-[#b0b0b0] p-2 rounded-sm shadow-inner border-t border-white/50 h-auto overflow-hidden">
                                <div className="relative z-10 grid grid-cols-5 gap-3">
                                    {tracks.map((track, i) => {
                                        const key = Object.keys(KEY_MAP).find(k => KEY_MAP[k] === i) || '';
                                        return (
                                            <Pad 
                                                key={track.id}
                                                ref={el => { padRefs.current[track.id] = el }}
                                                track={track}
                                                isSelected={selectedTrackId === track.id}
                                                onSelect={setSelectedTrackId}
                                                onSelectVariation={handleVariationSelect}
                                                onToggleMute={handleMuteToggle}
                                                shortcutKey={key}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 flex-grow lg:flex-[1]">
                            <div className="flex justify-between items-end px-2 border-b-2 border-neutral-400 pb-1 shrink-0">
                                <span className="font-black text-neutral-600 text-sm tracking-widest">MIXER & FX</span>
                                <span className="font-mono text-[10px] text-neutral-500">15 CH ACTIVE</span>
                            </div>
                            <div className="bg-[#ccc] p-2 rounded-sm shadow-inner border border-neutral-400 flex-1 relative overflow-visible">
                                <Mixer 
                                    ref={mixerRef}
                                    tracks={tracks} 
                                    onUpdateVolume={handleVolumeChange}
                                    onUpdateEffect={handleEffectChange}
                                    onToggleMute={handleMuteToggle}
                                    activeTrackId={selectedTrackId}
                                    currentStep={currentStep}
                                    isPlaying={isPlaying}
                                    activeScene={activeScene}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-[#222] h-6 flex items-center justify-center gap-8 text-[9px] font-mono text-[#666] tracking-widest uppercase flex-shrink-0">
                    <span>Designed in Tokyo</span>
                    <span>Model: SB-3000</span>
                    <span>Stereo Out</span>
                </div>
        </div>
      </div>
    </div>
  );
}

export default App;
