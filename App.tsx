
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioSynth } from './services/audioSynth';
import { Track, InstrumentType, ChannelEffects, PatternData } from './types';
import { Pad, PadHandle } from './components/Pad';
import { LCDDisplay } from './components/LCDDisplay';
import { PitchModWheels } from './components/PitchModWheels';
import { StepSequencer } from './components/StepSequencer';
import { Mixer, MixerHandle } from './components/Mixer';
import { getGenrePatterns, LEGENDARY_PATTERNS } from './services/patternLibrary';
import { PlayIcon, StopIcon, TrashIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, LockClosedIcon, LockOpenIcon, MicrophoneIcon, BoltIcon, ArrowUturnLeftIcon, CubeIcon, Squares2X2Icon, AdjustmentsVerticalIcon } from '@heroicons/react/24/solid';

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
    red: 'bg-red-600', orange: 'bg-orange-500', amber: 'bg-amber-500', yellow: 'bg-yellow-400',
    lime: 'bg-lime-500', green: 'bg-green-600', emerald: 'bg-emerald-500', teal: 'bg-teal-500',
    cyan: 'bg-cyan-500', sky: 'bg-sky-500', blue: 'bg-blue-600', indigo: 'bg-indigo-500',
    violet: 'bg-violet-500', purple: 'bg-purple-600', fuchsia: 'bg-fuchsia-500', pink: 'bg-pink-500',
    rose: 'bg-rose-500', white: 'bg-white',
};

const SCENE_COLORS = [
    'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-400', 
    'bg-lime-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-blue-600', 'bg-violet-500'
];

const GENRES = ['TR-909', 'TR-808', 'TR-707', 'LINN-DRUM', 'JUNGLE', 'MEMPHIS', 'GOA', 'ETHNIC-WORLD', 'GABBER', 'ACID', 'UK-GARAGE', 'EURO-DANCE', 'HARDSTYLE', 'DUBSTEP'];

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
        steps: Array(16).fill(false), variation, pitch, pan, automation: {}
    }));
};

const createTrack = (
    id: number, name: string, type: InstrumentType, color: string, 
    vol: number, pan: number, pitch: number, variation: number
): Track => ({
    id, name, type, color, patterns: createPatterns(variation, pitch, pan),
    activePatternIdx: 0, volume: vol, pan, pitch, variation, muted: false, effects: getEffects()
});

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

const KEY_MAP: { [key: string]: number } = {
  'q': 0, 'w': 1, 'e': 2, 'r': 3, 't': 4,
  'a': 5, 's': 6, 'd': 7, 'f': 8, 'g': 9,
  'z': 10, 'x': 11, 'c': 12, 'v': 13, 'b': 14
};

const INITIAL_SCENES: number[][] = Array.from({ length: SCENE_COUNT }, (_, sceneIdx) => Array(16).fill(sceneIdx % PATTERN_COUNT));

const cloneTracks = (tracks: Track[]): Track[] => tracks.map(track => ({
    ...track,
    patterns: JSON.parse(JSON.stringify(track.patterns)),
    effects: JSON.parse(JSON.stringify(track.effects)),
    sample: track.sample ? { ...track.sample } : undefined
}));

// --- KNOB COMPONENT ---
const TempoKnob = ({ bpm, onChange }: { bpm: number, onChange: (bpm: number) => void }) => {
  const tapTimes = useRef<number[]>([]);
  const lastTapTime = useRef<number>(0);

  const handleTap = () => {
      const now = Date.now();
      if (now - lastTapTime.current > 2000) tapTimes.current = [];
      lastTapTime.current = now;
      tapTimes.current.push(now);
      if (tapTimes.current.length > 4) tapTimes.current.shift();
      
      if (tapTimes.current.length > 1) {
          const intervals = [];
          for(let i=0; i<tapTimes.current.length-1; i++) intervals.push(tapTimes.current[i+1] - tapTimes.current[i]);
          const avgMs = intervals.reduce((a,b) => a+b, 0) / intervals.length;
          const newBpm = Math.round(60000 / avgMs);
          if (newBpm >= 40 && newBpm <= 300) onChange(newBpm);
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
          const change = Math.round(delta * 0.5);
          const newBpm = Math.min(240, Math.max(60, startBpm + change));
          if (newBpm !== bpm) onChange(newBpm);
      };
      
      const onUp = (ev: PointerEvent) => {
          const duration = Date.now() - startTime;
          if (!hasMoved && duration < 250) handleTap();
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
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#e0e0e0] border-2 border-[#bbb] shadow-[0_4px_6px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.5)] relative cursor-ns-resize touch-none flex items-center justify-center active:scale-95 transition-transform">
               <div className="absolute inset-0 w-full h-full" style={{ transform: `rotate(${rotation}deg)` }}>
                   <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-3 sm:h-4 bg-orange-500 rounded-full shadow-sm"></div>
               </div>
               <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#ccc] shadow-inner border border-[#aaa] flex items-center justify-center">
                    <span className="text-[6px] sm:text-[7px] font-bold text-neutral-400 opacity-50">TAP</span>
               </div>
          </div>
          <span className="text-[9px] sm:text-xs font-black text-neutral-500 mt-1 tracking-widest">TEMPO</span>
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
  const [isSampling, setIsSampling] = useState(false);
  const [recordingAnalyser, setRecordingAnalyser] = useState<AnalyserNode | null>(null);
  const [previewBuffer, setPreviewBuffer] = useState<AudioBuffer | null>(null);
  const [mobileView, setMobileView] = useState<'PADS' | 'MIXER'>('PADS');

  const lockSnapshotRef = useRef<{ tracks: Track[], scenes: number[][], bpm: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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

  // Sync Refs
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { scenesRef.current = scenes; }, [scenes]);
  useEffect(() => { activeSceneRef.current = activeScene; }, [activeScene]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { metronomeEnabledRef.current = metronomeEnabled; }, [metronomeEnabled]);
  useEffect(() => { bpmRef.current = bpm; audioSynth.current?.updateBpm(bpm); }, [bpm]);

  // Unlock Audio on Interaction
  useEffect(() => {
      const unlock = () => { if (audioSynth.current) audioSynth.current.resume().catch(() => {}); };
      ['mousedown', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, unlock, { once: true }));
      return () => ['mousedown', 'keydown', 'touchstart'].forEach(e => window.removeEventListener(e, unlock));
  }, []);

  const initAudio = () => {
    if (!audioSynth.current) {
      audioSynth.current = new AudioSynth();
      tracks.forEach(t => audioSynth.current?.updateTrackParameters(t));
    }
  };

  // Render preview for LCD when track changes
  useEffect(() => {
      const track = tracks.find(t => t.id === selectedTrackId);
      if (track && audioSynth.current) {
          // Debounce slighty
          const tId = setTimeout(async () => {
              try {
                  const buf = await audioSynth.current!.renderPreview(track);
                  setPreviewBuffer(buf);
              } catch(e) {}
          }, 50);
          return () => clearTimeout(tId);
      }
  }, [selectedTrackId, tracks, selectedGenre]); 

  const addToHistory = useCallback(() => {
      historyRef.current.push({ tracks: cloneTracks(tracksRef.current), scenes: JSON.parse(JSON.stringify(scenesRef.current)), bpm: bpmRef.current });
      if (historyRef.current.length > 50) historyRef.current.shift();
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
          lockSnapshotRef.current = { tracks: cloneTracks(tracksRef.current), scenes: JSON.parse(JSON.stringify(scenesRef.current)), bpm: bpmRef.current };
          setIsLocked(true);
          setStatusMessage("STATE LOCKED");
      }
  }, [isLocked]);

  const adjustBpm = useCallback((amount: number) => {
    setBpm(prev => Math.min(234, Math.max(1, prev + amount)));
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
                  if (!newAutomation[key]) newAutomation[key] = Array(16).fill(null);
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

    if (metronomeEnabledRef.current && stepNumber % 4 === 0) audioSynth.current?.playClick(time, stepNumber === 0);

    tracksRef.current.forEach(track => {
        const pattern = track.patterns[track.activePatternIdx];
        const isActive = pattern.steps[stepNumber];
        let automatedTrack = track;

        if (pattern.automation) {
            const autoKeys = Object.keys(pattern.automation);
            const hasChanges = autoKeys.some(k => pattern.automation[k][stepNumber] !== null);
            if (hasChanges) {
                 automatedTrack = { ...track, effects: { ...track.effects }, pitch: track.pitch, volume: track.volume, pan: track.pan };
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
                                 automatedTrack.effects[type] = { ...automatedTrack.effects[type], [field]: field === 'active' ? !!val : val };
                             }
                         }
                     }
                 });
                 audioSynth.current?.updateTrackParameters(automatedTrack, time);
            }
        }

        if (isActive && !track.muted) audioSynth.current?.trigger(automatedTrack, time);
    });

    setTimeout(() => {
       setCurrentStep(drawStep);
       playbackStepRef.current = drawStep; 
       tracksRef.current.filter(t => t.patterns[t.activePatternIdx].steps[stepNumber]).forEach(t => visualTrigger(t.id, t.variation));
    }, delayMs);
  };

  const scheduler = () => {
    if (!audioSynth.current) return;
    const scheduleAheadTime = 0.1;
    while (nextNoteTime.current < audioSynth.current.getContext().currentTime + scheduleAheadTime) {
      scheduleNote(currentStepRef.current, nextNoteTime.current);
      const secondsPerStep = (60.0 / bpmRef.current) / 4; 
      nextNoteTime.current += secondsPerStep;
      currentStepRef.current = (currentStepRef.current + 1) % STEPS;
    }
    if (isPlayingRef.current) timerID.current = requestAnimationFrame(scheduler);
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
    if (track) visualTrigger(id, track.variation);
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
    setTracks(prev => prev.map(t => {
        if (t.id === id) {
            const activePIdx = t.activePatternIdx;
            const newPatterns = [...t.patterns];
            newPatterns[activePIdx] = { ...newPatterns[activePIdx], variation: variation };
            return { ...t, variation: variation, patterns: newPatterns };
        }
        return t;
    }));
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
    setTracks(prev => prev.map(t => t.id === id ? { ...t, volume: val } : t));
  }, [recordAutomation]);

  const handleEffectChange = useCallback((id: number, effectType: keyof ChannelEffects, param: 'active' | 'value', val: number | boolean) => {
     recordAutomation(id, `effects.${effectType}.${param}`, typeof val === 'boolean' ? (val ? 1 : 0) : val);
     setTracks(prev => prev.map(t => {
         if (t.id === id) {
             return { ...t, effects: { ...t.effects, [effectType]: { ...t.effects[effectType], [param]: val } } };
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
            mr.ondataavailable = (e) => chunksRef.current.push(e.data);
            mr.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/ogg; codecs=opus' });
                const arrayBuffer = await blob.arrayBuffer();
                if (audioSynth.current) {
                    const ctx = audioSynth.current.getContext();
                    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                    addToHistory();
                    setTracks(prev => prev.map(t => t.id === selectedTrackId ? { ...t, sample: { buffer: audioBuffer, start: 0, end: 1, isCustom: true } } : t));
                    setStatusMessage("SAMPLE RECORDED");
                }
                stream.getTracks().forEach(t => t.stop());
                setRecordingAnalyser(null); 
            };
            mr.start();
            setIsSampling(true);
        } catch (err) {
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
       setTracks(prev => prev.map(t => t.id === selectedTrackId && t.sample ? { ...t, sample: { ...t.sample, start: newStart, end: newEnd } } : t));
  }, [selectedTrackId]);

  const handlePitchWheel = useCallback((val: number) => {
     const effectivePitch = val * 3; 
     if (isPlayingRef.current && isRecordingRef.current) recordAutomation(selectedTrackId, 'pitch', effectivePitch);
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
               if (isPlayingRef.current && isRecordingRef.current) recordAutomation(selectedTrackId, 'volume', newVol);
               return { ...t, volume: newVol };
          }
          return t;
      }));
      setStatusMessage(`MOD VOL: ${(val * 100).toFixed(0)}%`);
  }, [selectedTrackId, recordAutomation]);

  const handleSampleClear = () => {
      addToHistory();
      setTracks(prev => prev.map(t => t.id === selectedTrackId ? { ...t, sample: undefined } : t));
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
          const newPatterns = [...t.patterns];
          const activePIdx = t.activePatternIdx;
          newPatterns[activePIdx] = {
              ...newPatterns[activePIdx],
              steps: patternStr ? parseSteps(patternStr) : Array(16).fill(false),
              automation: {} 
          };
          return { ...t, patterns: newPatterns };
      }));
      setLegendaryPatternIdx(index);
      setStatusMessage(`LEGEND: ${pattern.name}`); 
  }, [addToHistory]);

  const handleNextPattern = () => loadLegendaryPattern(((legendaryPatternIdx ?? -1) + 1) % LEGENDARY_PATTERNS.length);
  const handlePrevPattern = () => loadLegendaryPattern(((legendaryPatternIdx ?? 0) - 1 + LEGENDARY_PATTERNS.length) % LEGENDARY_PATTERNS.length);

  const loadGenre = (genre: string) => {
      addToHistory();
      setSelectedGenre(genre);
      setStatusMessage(`PACK LOADED: ${genre}`);
      initAudio();
      setLegendaryPatternIdx(null); 
      if (audioSynth.current) audioSynth.current.setGenre(genre);
      const newGenrePatterns = getGenrePatterns(genre);

      setTracks(prev => prev.map(t => {
          let newEffects = getEffects();
          let newPitch = 0;
          let newVol = t.volume;
          let newName = (GENRE_KIT_MAP[genre] && GENRE_KIT_MAP[genre][t.id]) || DEFAULT_TRACKS.find(dt => dt.id === t.id)?.name || t.name;
          
          if (genre === 'TR-909' && t.type === InstrumentType.KICK) newVol = 1.0;
          if (genre === 'GABBER' && t.type === InstrumentType.KICK) { newVol = 1.0; newEffects.bitcrush = { active: true, value: 0.6 }; }
          if (genre === 'ACID' && t.type === InstrumentType.BASS) newEffects.delay = { active: true, value: 0.4 };

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
          return { ...t, name: newName, pitch: newPitch, volume: newVol, effects: newEffects, patterns: trackPatterns };
      }));
  };

  const handlePatternSelect = (patternIndex: number) => {
      addToHistory();
      const currentSceneIdx = activeSceneRef.current;
      setTracks(prev => prev.map(t => t.id === selectedTrackId ? { 
          ...t, activePatternIdx: patternIndex, variation: t.patterns[patternIndex].variation,
          pitch: t.patterns[patternIndex].pitch, pan: t.patterns[patternIndex].pan
      } : t));
      setScenes(prev => {
          const newScenes = [...prev];
          newScenes[currentSceneIdx] = [...newScenes[currentSceneIdx]];
          newScenes[currentSceneIdx][selectedTrackId] = patternIndex;
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
         return { ...t, activePatternIdx: targetPatternIdx, variation: targetPattern.variation, pitch: targetPattern.pitch, pan: targetPattern.pan };
      }));
      setStatusMessage(`SCENE ${sceneIndex + 1} LOADED`);
  }, [addToHistory]);

  const handleRandomize = useCallback(() => {
      loadLegendaryPattern(Math.floor(Math.random() * LEGENDARY_PATTERNS.length));
  }, [loadLegendaryPattern]);

  const startRandomizing = () => {
    handleRandomize();
    if (randomIntervalRef.current) clearInterval(randomIntervalRef.current);
    randomIntervalRef.current = window.setInterval(handleRandomize, 180);
  };

  const stopRandomizing = () => {
    if (randomIntervalRef.current) { clearInterval(randomIntervalRef.current); randomIntervalRef.current = null; }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.repeat && !['=', '+', '-', '_', 'arrowup', 'arrowdown'].includes(key)) return;
      if (key === 'tab') { e.preventDefault(); setIsRecording(prev => !prev); return; }
      if (key === 'delete' || key === 'backspace') { if (key === 'backspace') e.preventDefault(); handleClearTrack(); return; }
      if ((e.metaKey || e.ctrlKey) && key === 'z') { e.preventDefault(); handleUndo(); return; }
      if (!e.repeat && key >= '1' && key <= '9') { e.preventDefault(); handleSceneSelect(parseInt(key) - 1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setTracks(prev => prev.map(t => t.id === selectedTrackId ? { ...t, volume: Math.min(1.0, t.volume + 0.1) } : t)); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setTracks(prev => prev.map(t => t.id === selectedTrackId ? { ...t, volume: Math.max(0.0, t.volume - 0.1) } : t)); }
      if (key === '=' || key === '+') adjustBpm(1);
      if (key === '-' || key === '_') adjustBpm(-1);
      if (key === 'm') handleMuteToggle(selectedTrackId);
      if (!e.repeat && KEY_MAP[key] !== undefined) { const id = KEY_MAP[key]; if (tracksRef.current.find(t => t.id === id)) { handlePadTrigger(id); setSelectedTrackId(id); } }
      if (!e.repeat && e.code === 'Space') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrackId, handlePadTrigger, handleVariationSelect, togglePlay, handleMuteToggle, adjustBpm, handleUndo, handleSceneSelect]); 

  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || tracks[0];
  const currentPattern = selectedTrack.patterns[selectedTrack.activePatternIdx];
  const hasSample = selectedTrack.sample?.isCustom && selectedTrack.sample.buffer;
  const lcdPatternName = legendaryPatternIdx !== null ? `HIST: ${LEGENDARY_PATTERNS[legendaryPatternIdx].name}` : `SCN:${activeScene + 1} / PTN:${selectedTrack.activePatternIdx + 1}`;
  const legendaryCountDisplay = legendaryPatternIdx !== null ? `${(legendaryPatternIdx + 1).toString().padStart(2, '0')}/${LEGENDARY_PATTERNS.length}` : "FREE"; 

  return (
    <div className="min-h-screen w-full bg-[#121212] flex items-start justify-center lg:p-4 p-0 overflow-hidden">
      <div className="w-full h-full flex flex-col items-center lg:h-auto" style={{ '--bpm-duration': `${60/bpm}s` } as React.CSSProperties}>
        
        <div className="w-full max-w-[1400px] bg-[#dcdcdc] lg:rounded-lg shadow-2xl border-x border-b border-[#888] relative flex flex-col h-full lg:h-auto overflow-hidden">
                
                {/* Header */}
                <div className="h-8 bg-[#1a1a1a] border-b border-white/10 w-full flex items-center justify-between px-4 flex-shrink-0 z-50">
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 ${isPlaying ? 'animate-pulse' : ''}`}></div>
                        <span className="text-[10px] sm:text-xs font-black tracking-[0.2em] text-neutral-400 font-mono">
                            RAVE SUPERBLASTER 3000
                        </span>
                    </div>
                    {/* Mobile View Switcher */}
                    <div className="flex lg:hidden bg-[#333] rounded-sm p-0.5 gap-0.5">
                         <button onClick={() => setMobileView('PADS')} className={`px-3 py-0.5 text-[9px] font-black rounded-sm ${mobileView === 'PADS' ? 'bg-orange-500 text-white' : 'text-neutral-400'}`}>PADS</button>
                         <button onClick={() => setMobileView('MIXER')} className={`px-3 py-0.5 text-[9px] font-black rounded-sm ${mobileView === 'MIXER' ? 'bg-blue-500 text-white' : 'text-neutral-400'}`}>MIXER</button>
                    </div>
                </div>

                <div className="flex-1 p-1 sm:p-3 flex flex-col gap-2 overflow-y-auto overflow-x-hidden bg-[#dcdcdc]">
                    
                    {/* Top Row: Wheels, LCD, Transport */}
                    <div className="flex flex-col lg:flex-row gap-2 shrink-0">
                        <div className="flex gap-2 flex-1">
                            {/* Wheels - Hidden on very small phones in vertical mode to save space, or made horizontal */}
                            <div className="hidden sm:block shrink-0">
                                <PitchModWheels onPitchChange={handlePitchWheel} onModChange={handleModWheel} pitchValue={selectedTrack.pitch / 3} modValue={modValue} />
                            </div>

                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <LCDDisplay 
                                    bpm={bpm} patternName={lcdPatternName} isPlaying={isPlaying} isRecording={isRecording} statusMessage={statusMessage}
                                    metronomeEnabled={metronomeEnabled} sampleBuffer={selectedTrack.sample?.buffer} previewBuffer={previewBuffer}
                                    sampleStart={selectedTrack.sample?.start} sampleEnd={selectedTrack.sample?.end} isSampling={isSampling}
                                    onSampleUpdate={handleSampleRegionUpdate} recordingAnalyser={recordingAnalyser}
                                />
                                
                                <div className="flex gap-1 h-10 sm:h-12 items-center">
                                    <button onClick={() => setIsRecording(!isRecording)} className={`w-12 sm:w-16 h-full flex items-center justify-center rounded-sm font-bold shadow-sm border border-black/10 ${isRecording ? 'bg-red-600 text-white' : 'bg-[#e0e0e0] text-red-600'}`}>
                                        <span className="text-[9px] sm:text-xs">REC</span>
                                    </button>

                                    <div className="flex items-center justify-center gap-1 bg-[#d4d4d4] border border-white/50 px-1 h-full rounded-sm shadow-inner flex-1">
                                        <button 
                                            onPointerDown={startSampling} onPointerUp={stopSampling} onPointerLeave={stopSampling}
                                            onTouchStart={(e) => { e.preventDefault(); startSampling(); }} onTouchEnd={(e) => { e.preventDefault(); stopSampling(); }}
                                            className={`w-10 sm:w-12 h-8 sm:h-10 rounded-sm border-b-2 active:border-b-0 active:translate-y-[2px] transition-all flex items-center justify-center ${isSampling ? 'bg-red-500 text-white border-red-700' : 'bg-[#e0e0e0] text-neutral-600 border-neutral-400'}`}
                                        >
                                            <MicrophoneIcon className="w-4 h-4" />
                                        </button>
                                        {hasSample && (
                                            <button onClick={handleSampleClear} className="w-6 h-6 bg-neutral-300 text-neutral-500 hover:text-red-500 rounded-full flex items-center justify-center active:scale-90">
                                                <TrashIcon className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    
                                    <button onClick={togglePlay} className={`flex-1 h-full rounded-sm font-bold flex items-center justify-center gap-2 transition-all border ${isPlaying ? 'bg-green-600 text-white translate-y-[2px]' : 'bg-[#e0e0e0] text-neutral-800 border-black/10 shadow-sm active:translate-y-[2px]'}`}>
                                        {isPlaying ? <StopIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                                    </button>

                                    <div className="flex flex-col items-center gap-0.5 h-full justify-between py-0.5">
                                        <div className="bg-[#222] text-[#5eead4] font-['VT323'] text-base leading-none px-2 rounded-sm w-full text-center tracking-widest flex-1 flex items-center justify-center">
                                            {legendaryCountDisplay}
                                        </div>
                                        <div className="flex items-center bg-[#aaa] rounded-sm p-0.5 gap-0.5 shadow-sm h-5 w-full justify-center">
                                            <button onClick={handlePrevPattern} className="w-6 h-full rounded-sm bg-[#ccc] active:bg-neutral-400 flex items-center justify-center"><ChevronLeftIcon className="w-3 h-3 text-neutral-700"/></button>
                                            <button onMouseDown={startRandomizing} onMouseUp={stopRandomizing} onMouseLeave={stopRandomizing} onTouchStart={(e) => { e.preventDefault(); startRandomizing(); }} onTouchEnd={(e) => { e.preventDefault(); stopRandomizing(); }} className="flex-1 h-full bg-orange-500 text-white flex items-center justify-center rounded-sm relative">
                                                <BoltIcon className="w-3 h-3" />
                                            </button>
                                            <button onClick={handleNextPattern} className="w-6 h-full rounded-sm bg-[#ccc] active:bg-neutral-400 flex items-center justify-center"><ChevronRightIcon className="w-3 h-3 text-neutral-700"/></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tempo & Utility - Hidden on small mobile to save space? No, compacted. */}
                        <div className="bg-[#ccc] rounded-sm p-2 border border-white/50 shadow-inner flex items-center justify-around lg:w-64">
                            <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
                                <div className="flex items-center justify-center gap-3">
                                     <TempoKnob bpm={bpm} onChange={setBpm} />
                                     <div className="flex flex-col items-start">
                                         <span className="text-3xl sm:text-4xl font-black text-neutral-700 font-['VT323'] leading-none">{bpm}</span>
                                         <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider">BPM</span>
                                     </div>
                                </div>
                                <div className="flex gap-1 w-full px-1">
                                    <button onClick={handleUndo} className="flex-1 h-8 rounded bg-[#e0e0e0] border-b-2 border-[#bbb] active:border-b-0 active:translate-y-[1px] flex items-center justify-center"><ArrowUturnLeftIcon className="w-3 h-3 text-neutral-600" /></button>
                                    <button onClick={() => setMetronomeEnabled(!metronomeEnabled)} className={`flex-1 h-8 rounded border-b-2 active:border-b-0 active:translate-y-[1px] flex items-center justify-center ${metronomeEnabled ? 'bg-[#333] text-white border-black' : 'bg-[#e0e0e0] text-neutral-600 border-[#bbb]'}`}><ClockIcon className="w-3 h-3" /></button>
                                    <button onClick={handleClearAll} className="flex-1 h-8 rounded bg-[#e0e0e0] border-b-2 border-[#bbb] active:border-b-0 active:translate-y-[1px] flex items-center justify-center hover:text-red-500"><TrashIcon className="w-3 h-3" /></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Global Scenes Strip - Scrollable on Mobile */}
                    <div className="w-full flex flex-col items-center py-1.5 bg-[#d4d4d4] rounded-sm border border-white/50 shadow-sm"> 
                        <div className="flex gap-1 overflow-x-auto px-2 w-full scrollbar-hide justify-start sm:justify-center">
                            {Array.from({length: SCENE_COUNT}).map((_, i) => (
                                <button key={i} onClick={() => handleSceneSelect(i)} className={`min-w-[2.5rem] h-8 sm:h-10 flex flex-col items-center justify-center rounded-sm border-b-[3px] shadow-sm ${activeScene === i ? 'bg-white text-black translate-y-[1px] border-transparent' : `${SCENE_COLORS[i]} text-white border-black/20 active:translate-y-[3px] opacity-90`}`}>
                                    <span className="text-xs sm:text-sm font-black leading-none">{i + 1}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Middle Section: Track Controls & Quick Fills */}
                    <div className="bg-[#e0e0e0] p-1.5 rounded-sm border border-white shadow-sm flex flex-col gap-2">
                        {/* Quick Fills - Horizontal Scroll */}
                        <div className="bg-[#ccc] rounded-sm p-1 border border-white/20 shadow-inner w-full overflow-hidden">
                            <div className="flex gap-[2px] overflow-x-auto scrollbar-hide pb-1">
                                {FILL_BUTTONS.map((fill, idx) => (
                                    <button key={idx} onClick={() => handleQuickFill(fill.label)} className={`px-2 h-6 rounded-[1px] border-b border-black/10 active:border-b-0 active:translate-y-[1px] text-[9px] font-black whitespace-nowrap ${fill.cat === 'func' ? 'bg-neutral-300' : fill.cat === 'genre' ? 'bg-blue-100' : fill.cat === 'rand' ? 'bg-orange-100' : fill.cat === 'eucl' ? 'bg-emerald-100' : fill.cat === 'tuple' ? 'bg-purple-100' : 'bg-[#e0e0e0]'}`}>
                                        {fill.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {/* Step Sequencer & Pattern Select */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex gap-1 h-12 flex-1">
                                <div className="w-16 bg-neutral-800 rounded-sm flex flex-col items-center justify-center border-b-2 border-black shrink-0">
                                    <div className={`w-2 h-2 rounded-full ${TRACK_COLORS[selectedTrack.color]} mb-0.5`}></div>
                                    <span className="text-[8px] font-black text-white uppercase truncate w-full text-center px-1">{selectedTrack.name}</span>
                                </div>
                                <div className="flex-1 bg-[#2a2a2a] rounded-sm p-0.5 shadow-inner border-b border-white/10">
                                    <StepSequencer steps={currentPattern.steps} currentStep={currentStep} onToggleStep={handleToggleStep} trackColor={selectedTrack.color} />
                                </div>
                                <button onClick={handleClearTrack} className="w-8 bg-[#d0d0d0] rounded-sm border-b-2 border-[#aaa] active:translate-y-[2px] flex items-center justify-center shrink-0">
                                    <span className="text-[8px] font-black text-neutral-500 -rotate-90">CLR</span>
                                </button>
                            </div>
                            <div className="flex gap-0.5 sm:w-64 h-12 sm:h-auto">
                                {Array.from({length: PATTERN_COUNT}).map((_, i) => (
                                    <button key={i} onClick={() => handlePatternSelect(i)} className={`flex-1 text-[10px] font-black rounded-sm transition-all ${selectedTrack.activePatternIdx === i ? `${TRACK_COLORS[selectedTrack.color]} text-white` : 'bg-[#dcdcdc] text-[#888] border-b-2 border-[#bbb]'}`}>
                                        {i + 1}
                                    </button>
                                ))}
                                <button onClick={handleToggleLock} className={`w-12 rounded-sm flex items-center justify-center border ${isLocked ? 'bg-neutral-900 text-white animate-pulse' : 'bg-[#d0d0d0] border-[#bbb]'}`}>
                                    {isLocked ? <LockClosedIcon className="w-3 h-3"/> : <LockOpenIcon className="w-3 h-3"/>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section: Mobile Switcher Logic */}
                    <div className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0 relative">
                        
                        {/* PADS VIEW (Desktop: Always visible, Mobile: Conditional) */}
                        <div className={`flex-col gap-1 flex-grow lg:flex-[2] ${mobileView === 'MIXER' ? 'hidden lg:flex' : 'flex'}`}>
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-neutral-400 mb-1">
                                {GENRES.map(g => (
                                    <button key={g} onClick={() => loadGenre(g)} className={`px-2 py-1 text-[9px] sm:text-xs font-bold rounded-sm whitespace-nowrap ${selectedGenre === g ? 'bg-neutral-800 text-white' : 'bg-neutral-300 text-neutral-600'}`}>{g}</button>
                                ))}
                            </div>
                            <div className="w-full bg-[#b0b0b0] p-1.5 rounded-sm shadow-inner border-t border-white/50 flex-1 overflow-y-auto">
                                <div className="grid grid-cols-5 gap-1 sm:gap-2 lg:gap-3 h-full lg:h-auto content-start">
                                    {tracks.map((track, i) => {
                                        const key = Object.keys(KEY_MAP).find(k => KEY_MAP[k] === i) || '';
                                        return <Pad key={track.id} ref={el => { padRefs.current[track.id] = el }} track={track} isSelected={selectedTrackId === track.id} onSelect={setSelectedTrackId} onSelectVariation={handleVariationSelect} onToggleMute={handleMuteToggle} shortcutKey={key} />;
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* MIXER VIEW (Desktop: Always visible, Mobile: Conditional) */}
                        <div className={`flex-col gap-1 flex-grow lg:flex-[1] ${mobileView === 'PADS' ? 'hidden lg:flex' : 'flex'}`}>
                            <div className="flex justify-between items-end px-1 border-b border-neutral-400 pb-1">
                                <span className="font-black text-neutral-600 text-xs tracking-widest">MIXER</span>
                                <span className="font-mono text-[9px] text-neutral-500">15 CH</span>
                            </div>
                            <div className="bg-[#ccc] p-1 rounded-sm shadow-inner border border-neutral-400 flex-1 overflow-y-auto">
                                <Mixer ref={mixerRef} tracks={tracks} onUpdateVolume={handleVolumeChange} onUpdateEffect={handleEffectChange} onToggleMute={handleMuteToggle} activeTrackId={selectedTrackId} currentStep={currentStep} isPlaying={isPlaying} activeScene={activeScene} />
                            </div>
                        </div>

                    </div>
                </div>
        </div>
      </div>
    </div>
  );
}

export default App;
