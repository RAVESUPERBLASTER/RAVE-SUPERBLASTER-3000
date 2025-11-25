
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioSynth } from './services/audioSynth';
import { Track, InstrumentType, ChannelEffects, PatternData, SampleConfig, MasterEffectType, UserSample, VariationState, SceneData, TrackStateSnapshot, SoundConfig } from './types';
import { PadMix, PadMixHandle } from './components/PadMix';
import { LCDDisplay } from './components/LCDDisplay';
import { PitchModWheels } from './components/PitchModWheels';
import { StepSequencer } from './components/StepSequencer';
import { SoundLibraryModal } from './components/SoundLibraryModal';
import { AutomationEditor } from './components/AutomationEditor'; 
import { LibraryItem, SOUND_LIBRARY } from './services/soundLibrary';
import { getGenrePatterns, LEGENDARY_PATTERNS } from './services/patternLibrary';
import { PlayIcon, StopIcon, TrashIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, LockClosedIcon, LockOpenIcon, MicrophoneIcon, BoltIcon, ArrowsRightLeftIcon, ArrowPathIcon, ArrowUturnLeftIcon, CubeIcon, SparklesIcon, Cog6ToothIcon, ChevronDownIcon, PlusIcon, Squares2X2Icon, XMarkIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

// --- Configuration ---
const INITIAL_BPM = 128;
const STEPS = 16;
const PATTERN_COUNT = 8; 
const SCENE_COUNT = 8; 

const DEFAULT_EFFECTS: ChannelEffects = {
    reverb: { active: false, value: 0.3 },
    delay: { active: false, value: 0.3 },
    filter: { active: false, value: 1.0 },
    bitcrush: { active: false, value: 0.5 },
    stutter: { active: false, value: 0.5 },
    glitch: { active: false, value: 0.5 }
};

const SCENE_COLORS = [
    'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-400', 
    'bg-lime-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-blue-600'
];

// Master FX Configuration Data
const FX_INFO: Record<MasterEffectType, { label: string, color: string }> = {
  [MasterEffectType.HALF_RATE]: { label: 'HALF', color: 'bg-indigo-600' },
  [MasterEffectType.DISTORTION]: { label: 'DIST', color: 'bg-red-600' },
  [MasterEffectType.SQUASH]: { label: 'SQSH', color: 'bg-orange-600' },
  [MasterEffectType.ECHO_FADE]: { label: 'ECHO', color: 'bg-cyan-600' },
  [MasterEffectType.PITCH_LFO]: { label: 'VIBE', color: 'bg-pink-600' },
  [MasterEffectType.EQ_SWEEP]: { label: 'SWEEP', color: 'bg-emerald-600' },
  [MasterEffectType.MEGA_MORPH]: { label: 'MORPH', color: 'bg-purple-600' },
  [MasterEffectType.PITCH_UP]: { label: 'RISE', color: 'bg-yellow-500' },
  [MasterEffectType.PUNCH]: { label: 'PNCH', color: 'bg-blue-600' },
  [MasterEffectType.QUANTISE_6_8]: { label: '6/8', color: 'bg-teal-600' },
  [MasterEffectType.BEAT_REPEAT]: { label: 'LOOP', color: 'bg-lime-600' },
  [MasterEffectType.BEAT_REPEAT_FAST]: { label: 'FAST', color: 'bg-green-600' },
  [MasterEffectType.FM]: { label: 'FM', color: 'bg-fuchsia-600' },
  [MasterEffectType.GRANULAR]: { label: 'GRAN', color: 'bg-rose-600' },
  [MasterEffectType.REVERSE]: { label: 'REV', color: 'bg-amber-600' },
  [MasterEffectType.BOUNCING]: { label: 'BNC', color: 'bg-sky-600' },
  [MasterEffectType.LOOP_16]: { label: 'LP16', color: 'bg-red-500' },
  [MasterEffectType.LOOP_12]: { label: 'LP12', color: 'bg-orange-500' },
  [MasterEffectType.LOOP_SHORT]: { label: 'SHRT', color: 'bg-yellow-500' },
  [MasterEffectType.LOOP_SHORTER]: { label: 'TINY', color: 'bg-lime-500' },
  [MasterEffectType.UNISON]: { label: 'UNI', color: 'bg-cyan-500' },
  [MasterEffectType.UNISON_LOW]: { label: 'ULO', color: 'bg-blue-600' },
  [MasterEffectType.OCTAVE_UP]: { label: 'OCT+', color: 'bg-indigo-500' },
  [MasterEffectType.OCTAVE_DOWN]: { label: 'OCT-', color: 'bg-violet-600' },
  [MasterEffectType.STUTTER_4]: { label: 'STU4', color: 'bg-fuchsia-500' },
  [MasterEffectType.STUTTER_3]: { label: 'STU3', color: 'bg-pink-500' },
  [MasterEffectType.SCRATCH]: { label: 'SCRT', color: 'bg-rose-500' },
  [MasterEffectType.SCRATCH_FAST]: { label: 'F.SCR', color: 'bg-red-700' },
  [MasterEffectType.RETRIGGER]: { label: 'RTRG', color: 'bg-teal-500' },
  [MasterEffectType.NO_EFFECT]: { label: 'OFF', color: 'bg-neutral-800' },
};

// Parameter Labels for each effect
const FX_PARAM_DEFS: Record<MasterEffectType, { a: string, b: string }> = {
  [MasterEffectType.HALF_RATE]: { a: 'FREQ', b: 'RES' },
  [MasterEffectType.DISTORTION]: { a: 'TONE', b: 'DRIVE' },
  [MasterEffectType.SQUASH]: { a: 'THRESH', b: 'MAKEUP' },
  [MasterEffectType.ECHO_FADE]: { a: 'TIME', b: 'FDBK' },
  [MasterEffectType.PITCH_LFO]: { a: 'RATE', b: 'DEPTH' },
  [MasterEffectType.EQ_SWEEP]: { a: 'SPEED', b: 'RES' },
  [MasterEffectType.MEGA_MORPH]: { a: 'RATE', b: 'Q' },
  [MasterEffectType.PITCH_UP]: { a: 'SPEED', b: 'FDBK' },
  [MasterEffectType.PUNCH]: { a: 'FREQ', b: 'BOOST' },
  [MasterEffectType.QUANTISE_6_8]: { a: 'FILT', b: 'RES' },
  [MasterEffectType.BEAT_REPEAT]: { a: 'FDBK', b: 'HPF' },
  [MasterEffectType.BEAT_REPEAT_FAST]: { a: 'FDBK', b: 'LPF' },
  [MasterEffectType.FM]: { a: 'MOD', b: 'FILT' },
  [MasterEffectType.GRANULAR]: { a: 'GRAIN', b: 'FDBK' },
  [MasterEffectType.REVERSE]: { a: 'CHOP', b: 'FILT' },
  [MasterEffectType.BOUNCING]: { a: 'SPEED', b: 'DECAY' },
  [MasterEffectType.LOOP_16]: { a: 'LPF', b: 'FDBK' },
  [MasterEffectType.LOOP_12]: { a: 'HPF', b: 'FDBK' },
  [MasterEffectType.LOOP_SHORT]: { a: 'BPF', b: 'FDBK' },
  [MasterEffectType.LOOP_SHORTER]: { a: 'PEAK', b: 'FDBK' },
  [MasterEffectType.UNISON]: { a: 'SPEED', b: 'DEPTH' },
  [MasterEffectType.UNISON_LOW]: { a: 'CUTOFF', b: 'DETUNE' },
  [MasterEffectType.OCTAVE_UP]: { a: 'HPF', b: '-' },
  [MasterEffectType.OCTAVE_DOWN]: { a: 'LPF', b: '-' },
  [MasterEffectType.STUTTER_4]: { a: 'FILT', b: 'RES' },
  [MasterEffectType.STUTTER_3]: { a: 'FILT', b: 'CRUSH' },
  [MasterEffectType.SCRATCH]: { a: 'SPEED', b: 'DEPTH' },
  [MasterEffectType.SCRATCH_FAST]: { a: 'SPEED', b: 'DEPTH' },
  [MasterEffectType.RETRIGGER]: { a: 'RATE', b: 'FDBK' },
  [MasterEffectType.NO_EFFECT]: { a: '-', b: '-' },
};

const DEFAULT_FX_SLOTS: MasterEffectType[] = [
    MasterEffectType.LOOP_16,
    MasterEffectType.STUTTER_4,
    MasterEffectType.PITCH_LFO,
    MasterEffectType.OCTAVE_DOWN,
    MasterEffectType.DISTORTION,
    MasterEffectType.EQ_SWEEP,
    MasterEffectType.REVERSE,
    MasterEffectType.PUNCH
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
        steps: Array(16).fill(false),
        variation,
        pitch,
        pan,
        automation: {}
    }));
};

const createVariationStates = (vol: number, pan: number, pitch: number): VariationState[] => {
    return Array.from({ length: 4 }, () => ({
        volume: vol,
        pan: pan,
        pitch: pitch,
        effects: getEffects()
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
    effects: getEffects(),
    variationStates: createVariationStates(vol, pan, pitch)
});

const DEFAULT_TRACKS: Track[] = [
  createTrack(0, 'Kick', InstrumentType.KICK, 'red', 0.9, 0, 0, 0),
  createTrack(1, 'Snare', InstrumentType.SNARE, 'orange', 0.8, 0, 0, 0),
  createTrack(2, 'Cl Hat', InstrumentType.HIHAT_CLOSED, 'amber', 0.7, -0.2, 0, 0),
  createTrack(3, 'Op Hat', InstrumentType.HIHAT_OPEN, 'yellow', 0.7, 0.2, 0, 0),
  createTrack(4, 'Bass', InstrumentType.BASS, 'lime', 0.8, 0, 0, 0),
  createTrack(5, 'Clap', InstrumentType.CLAP, 'green', 0.8, 0, 0, 0),
  createTrack(6, 'Lo Tom', InstrumentType.TOM_LOW, 'emerald', 0.8, -0.4, 0, 0),
  createTrack(7, 'Hi Tom', InstrumentType.TOM_HI, 'teal', 0.8, 0.4, 0, 0)
];

const KEY_MAP: { [key: string]: number } = {
  'q': 0, 'w': 1, 'e': 2, 'r': 3, 't': 4,
  'a': 5, 's': 6, 'd': 7, 'f': 8, 'g': 9,
  'z': 10, 'x': 11, 'c': 12, 'v': 13, 'b': 14
};

// Helper: Create default scene state
const createDefaultScene = (index: number, defaultTracks: Track[]): SceneData => {
  const trackStates: Record<number, TrackStateSnapshot> = {};
  defaultTracks.forEach(t => {
      trackStates[t.id] = {
          volume: t.volume,
          pan: t.pan,
          pitch: t.pitch,
          muted: t.muted,
          effects: JSON.parse(JSON.stringify(t.effects)),
          soundConfig: t.soundConfig,
          sample: t.sample,
          activePatternIdx: index % PATTERN_COUNT, // Default pattern assignment
          variation: t.variation,
          color: t.color
      };
  });
  return {
      genre: 'TR-909',
      bpm: 128,
      trackStates
  };
};

const cloneTracks = (tracks: Track[]): Track[] => {
    return tracks.map(track => ({
        ...track,
        patterns: JSON.parse(JSON.stringify(track.patterns)),
        effects: JSON.parse(JSON.stringify(track.effects)),
        variationStates: JSON.parse(JSON.stringify(track.variationStates)),
        sample: track.sample ? { ...track.sample } : undefined,
        soundConfig: track.soundConfig ? { ...track.soundConfig } : undefined
    }));
};

const TempoKnob = ({ bpm, onChange }: { bpm: number, onChange: (bpm: number) => void }) => {
  const tapTimes = useRef<number[]>([]);
  const lastTapTime = useRef<number>(0);

  const handleTap = () => {
      const now = Date.now();
      if (now - lastTapTime.current > 2000) {
          tapTimes.current = [];
      }
      lastTapTime.current = now;
      tapTimes.current.push(now);
      
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
          
          const change = Math.round(delta * 0.5);
          const newBpm = Math.min(240, Math.max(60, startBpm + change));
          if (newBpm !== bpm) onChange(newBpm);
      };
      
      const onUp = (ev: PointerEvent) => {
          const duration = Date.now() - startTime;
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
          <div className="w-14 h-14 rounded-full bg-[#e0e0e0] border-2 border-[#bbb] shadow-[0_4px_6px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.5)] relative cursor-ns-resize touch-none flex items-center justify-center group active:scale-95 transition-transform">
               <div className="absolute inset-0 w-full h-full" style={{ transform: `rotate(${rotation}deg)` }}>
                   <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-3.5 bg-orange-500 rounded-full shadow-sm"></div>
               </div>
               <div className="w-7 h-7 rounded-full bg-[#ccc] shadow-inner border border-[#aaa] flex items-center justify-center">
                    <span className="text-[6px] font-bold text-neutral-400 opacity-50">TAP</span>
               </div>
          </div>
          <span className="text-[10px] font-black text-neutral-500 mt-0.5 tracking-widest">TEMPO</span>
      </div>
  );
};

const MacroKnob = ({ label, value, onChange, color = 'bg-cyan-500' }: { label: string, value: number, onChange: (v: number) => void, color?: string }) => {
    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation();
        const elm = e.currentTarget; elm.setPointerCapture(e.pointerId);
        const startY = e.clientY; const startValue = value;
        const onMove = (ev: PointerEvent) => {
            const delta = (startY - ev.clientY) / 150;
            onChange(Math.min(1, Math.max(0, startValue + delta)));
        };
        const onUp = (ev: PointerEvent) => {
            elm.removeEventListener('pointermove', onMove as any);
            elm.removeEventListener('pointerup', onUp as any);
            elm.releasePointerCapture(ev.pointerId);
        };
        elm.addEventListener('pointermove', onMove as any);
        elm.addEventListener('pointerup', onUp as any);
    };

    return (
        <div className="flex flex-col items-center gap-1 w-full" onPointerDown={handlePointerDown}>
             <div className="w-12 h-12 rounded-full bg-[#333] border-2 border-[#555] shadow-lg relative cursor-ns-resize touch-none group">
                 <div className="absolute inset-0 w-full h-full" style={{ transform: `rotate(${-135 + (value * 270)}deg)` }}>
                     <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 rounded-full shadow-[0_0_8px_currentColor] ${color}`}></div>
                 </div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-[#222] rounded-full border border-black/50 shadow-inner"></div>
             </div>
             <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider text-center leading-none">{label}</span>
        </div>
    );
};

export const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);
  
  // New Scene State
  const [scenes, setScenes] = useState<SceneData[]>(() => {
    return Array.from({ length: SCENE_COUNT }, (_, i) => createDefaultScene(i, DEFAULT_TRACKS));
  });

  const [bpm, setBpm] = useState(INITIAL_BPM);
  
  const [activeScene, setActiveScene] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState<string>('TR-909');
  
  const [heldFxIndices, setHeldFxIndices] = useState<Set<number>>(new Set());
  const [latchedFxIndices, setLatchedFxIndices] = useState<Set<number>>(new Set());
  const [focusedFxIndex, setFocusedFxIndex] = useState<number>(0);
  
  // Param State now supports [Mix, A, B, Volume]
  const [fxParamState, setFxParamState] = useState<Record<string, [number, number, number, number]>>({});
  
  const heldFxRef = useRef<Set<number>>(new Set());
  const latchedFxRef = useRef<Set<number>>(new Set());
  
  const [fxSlots, setFxSlots] = useState<MasterEffectType[]>(DEFAULT_FX_SLOTS);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState(0);
  
  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || tracks[0];

  const [statusMessage, setStatusMessage] = useState("READY");
  const [legendaryPatternIdx, setLegendaryPatternIdx] = useState<number | null>(null);

  const [isLocked, setIsLocked] = useState(false);
  const lockSnapshotRef = useRef<{ tracks: Track[], scenes: SceneData[], bpm: number } | null>(null);

  const [isSampling, setIsSampling] = useState(false);
  const [recordingAnalyser, setRecordingAnalyser] = useState<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [previewBuffer, setPreviewBuffer] = useState<AudioBuffer | null>(null);

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryTargetTrackId, setLibraryTargetTrackId] = useState<number | null>(null);
  const [soundLibrary, setSoundLibrary] = useState(SOUND_LIBRARY);
  
  const [userSamples, setUserSamples] = useState<UserSample[]>([]);

  // Automation Editing State
  const [lastTouchedParam, setLastTouchedParam] = useState<{ trackId: number, param: string, label: string } | null>(null);

  const audioSynth = useRef<AudioSynth | null>(null);
  const nextNoteTime = useRef(0);
  const timerID = useRef<number | null>(null);
  const currentStepRef = useRef(0); 
  const playbackStepRef = useRef(0);
  const isPlayingRef = useRef(false);
  const tracksRef = useRef(tracks); 
  const padMixRefs = useRef<{ [id: number]: PadMixHandle | null }>({});
  const isRecordingRef = useRef(false);
  const metronomeEnabledRef = useRef(false);
  const randomIntervalRef = useRef<number | null>(null);
  const activeSceneRef = useRef(activeScene);
  const scenesRef = useRef(scenes);
  const previewDebounceRef = useRef<number | null>(null);
  const selectedTrackIdRef = useRef(selectedTrackId);
  
  const historyRef = useRef<{ tracks: Track[], scenes: SceneData[], bpm: number }[]>([]);
  
  const genreStatesRef = useRef<Record<string, Record<number, { pitch: number, volume: number, pan: number, effects: ChannelEffects }>>>({});

  const bpmRef = useRef(bpm);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { scenesRef.current = scenes; }, [scenes]);
  useEffect(() => { activeSceneRef.current = activeScene; }, [activeScene]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { metronomeEnabledRef.current = metronomeEnabled; }, [metronomeEnabled]);
  useEffect(() => { bpmRef.current = bpm; if(audioSynth.current) audioSynth.current.updateBpm(bpm); }, [bpm]);
  useEffect(() => { selectedTrackIdRef.current = selectedTrackId; }, [selectedTrackId]);

  useEffect(() => {
      const handleGlobalInput = (e: KeyboardEvent | MouseEvent) => {
          if (typeof e.getModifierState === 'function') {
             const capsState = e.getModifierState('CapsLock');
             setIsRecording(prev => {
                 if (prev !== capsState) {
                    // Start/Stop recording via CapsLock implies history change if starting
                    if (capsState) addToHistory();
                    return capsState;
                 }
                 return prev;
             });
          }
      };
      window.addEventListener('keydown', handleGlobalInput);
      window.addEventListener('keyup', handleGlobalInput);
      window.addEventListener('mousedown', handleGlobalInput);
      window.addEventListener('mouseup', handleGlobalInput);
      return () => {
          window.removeEventListener('keydown', handleGlobalInput);
          window.removeEventListener('keyup', handleGlobalInput);
          window.removeEventListener('mousedown', handleGlobalInput);
          window.removeEventListener('mouseup', handleGlobalInput);
      };
  }, []);

  const initAudio = () => {
    if (!audioSynth.current) {
      audioSynth.current = new AudioSynth();
      tracks.forEach(t => {
          audioSynth.current?.ensureChannel(t.id);
          audioSynth.current?.updateTrackParameters(t);
      });
      // Initialize FX Params
      const params: Record<string, [number, number, number, number]> = {};
      Object.values(MasterEffectType).forEach(type => {
         params[type] = audioSynth.current!.getMasterFxParams(type); 
      });
      setFxParamState(params);
    }
  };

  useEffect(() => {
      const unlock = () => {
          if (!audioSynth.current) initAudio();
          if (audioSynth.current) {
              audioSynth.current.resume().catch(() => {});
              audioSynth.current.playSilent();
          }
      };
      window.addEventListener('click', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      return () => {
          window.removeEventListener('click', unlock);
          window.removeEventListener('touchstart', unlock);
          window.removeEventListener('keydown', unlock);
      };
  }, []); 

  // OPTIMIZED: Track selection only updates if ID changed to prevent re-renders on repeated hits
  const handleSelectTrack = useCallback((id: number) => {
      if (selectedTrackIdRef.current !== id) {
          setSelectedTrackId(id);
      }
  }, []);

  const handleAddTrack = (targetId?: number) => {
      const newId = targetId !== undefined 
          ? targetId 
          : (tracks.length > 0 ? Math.max(...tracks.map(t => t.id)) + 1 : 0);
      
      if (tracks.some(t => t.id === newId)) return;

      const newTrack = createTrack(newId, 'EMPTY', InstrumentType.SYNTH_HIT, 'orange', 0.8, 0, 0, 0);
      addToHistory();
      setTracks(prev => [...prev, newTrack].sort((a, b) => a.id - b.id));
      if (audioSynth.current) {
          audioSynth.current.ensureChannel(newId);
          audioSynth.current.updateTrackParameters(newTrack);
      }
      handleSelectTrack(newId);
      setStatusMessage(`PADMIX ${newId + 1} ADDED`);
  };

  const handleDeleteTrack = (id: number) => {
      if (tracks.length <= 1) {
          setStatusMessage("CANNOT DELETE LAST TRACK");
          return;
      }
      addToHistory();
      if (audioSynth.current) audioSynth.current.removeChannel(id);
      const newTracks = tracks.filter(t => t.id !== id);
      setTracks(newTracks);
      if (selectedTrackId === id) handleSelectTrack(newTracks[0].id);
      setStatusMessage(`TRACK ${id + 1} DELETED`);
  };
  
  const handleColorChange = (id: number, color: string) => {
      setTracks(prev => prev.map(t => t.id === id ? { ...t, color } : t));
  };

  useEffect(() => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
      previewDebounceRef.current = window.setTimeout(() => {
          const track = tracks.find(t => t.id === selectedTrackId);
          if (track && audioSynth.current) {
              const gen = async () => {
                  try {
                      const buf = await audioSynth.current!.renderPreview(track);
                      setPreviewBuffer(buf);
                  } catch(e) { /* ignore */ }
              };
              gen();
          }
      }, 300);
      return () => { if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current); }
  }, [selectedTrackId, tracks, selectedGenre]); 

  const addToHistory = useCallback(() => {
      // NOTE: This is expensive. Do NOT call during rapid recording.
      historyRef.current.push({
          tracks: cloneTracks(tracksRef.current),
          scenes: JSON.parse(JSON.stringify(scenesRef.current)),
          bpm: bpmRef.current
      });
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
  
  const toggleRecording = () => {
      if (!isRecording) addToHistory(); // Snapshot before recording starts
      setIsRecording(prev => !prev);
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
    padMixRefs.current[id]?.trigger(variation);
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

  // Update Automation directly from the Editor Grid
  const handleAutomationGridUpdate = useCallback((step: number, value: number | null) => {
      if (!lastTouchedParam) return;
      
      const { trackId, param } = lastTouchedParam;
      setTracks(prev => prev.map(t => {
          if (t.id === trackId) {
             const activePIdx = t.activePatternIdx;
             const newPatterns = [...t.patterns];
             const currentPattern = newPatterns[activePIdx];
             const newAutomation = { ...currentPattern.automation };
             if (!newAutomation[param]) newAutomation[param] = Array(16).fill(null);
             const newStepValues = [...newAutomation[param]];
             newStepValues[step] = value;
             newAutomation[param] = newStepValues;
             newPatterns[activePIdx] = { ...currentPattern, automation: newAutomation };
             return { ...t, patterns: newPatterns }; 
          }
          return t;
      }));
  }, [lastTouchedParam]);

  const handleClearAutomation = useCallback(() => {
      if (!lastTouchedParam) return;
      const { trackId, param } = lastTouchedParam;
      setTracks(prev => prev.map(t => {
          if (t.id === trackId) {
             const activePIdx = t.activePatternIdx;
             const newPatterns = [...t.patterns];
             const currentPattern = newPatterns[activePIdx];
             const newAutomation = { ...currentPattern.automation };
             newAutomation[param] = Array(16).fill(null);
             newPatterns[activePIdx] = { ...currentPattern, automation: newAutomation };
             return { ...t, patterns: newPatterns }; 
          }
          return t;
      }));
  }, [lastTouchedParam]);

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
    if (isPlayingRef.current) timerID.current = requestAnimationFrame(scheduler);
  };

  const nextNote = () => {
    const secondsPerBeat = 60.0 / bpmRef.current; 
    const secondsPerStep = secondsPerBeat / 4; 
    nextNoteTime.current += secondsPerStep;
    currentStepRef.current = (currentStepRef.current + 1) % STEPS;
  };

  // OPTIMIZED: Track recording logic to fix latency and quantization accuracy
  const recordNote = useCallback((id: number) => {
    if (!isPlayingRef.current || !isRecordingRef.current || !audioSynth.current) return;

    const ctx = audioSynth.current.getContext();
    const now = ctx.currentTime;
    
    // Calculate precise quantization based on audio time, NOT visual step
    const nextTime = nextNoteTime.current;
    const nextStepIndex = currentStepRef.current;
    
    // Calculate step duration
    const secondsPerBeat = 60.0 / bpmRef.current;
    const stepDuration = secondsPerBeat / 4;
    
    // diff is how far we are from the START of the NEXT scheduled step.
    const diff = nextTime - now;
    
    // Determine closest grid point
    const stepsAway = Math.round(diff / stepDuration);
    
    // If stepsAway is 0, we are closest to nextStepIndex.
    // If stepsAway is 1, we are closest to nextStepIndex - 1.
    const targetStep = (nextStepIndex - stepsAway + STEPS) % STEPS;

    // Defer heavy state update to next frame to allow audio triggers to remain instant
    requestAnimationFrame(() => {
        setTracks(prev => prev.map(t => {
            if (t.id === id) {
                const activePIdx = t.activePatternIdx;
                const newPatterns = [...t.patterns];
                const newPatternData = { ...newPatterns[activePIdx] };
                const newSteps = [...newPatternData.steps];
                newSteps[targetStep] = true;
                newPatternData.steps = newSteps;
                newPatterns[activePIdx] = newPatternData;
                return { ...t, patterns: newPatterns };
            }
            return t;
        }));
    });
  }, []);

  const handlePadTrigger = useCallback((id: number) => {
    // AUDIO & VISUAL FIRST - Priority 1
    const track = tracksRef.current.find(t => t.id === id);
    if (track) visualTrigger(id, track.variation);
    
    initAudio();
    audioSynth.current?.resume().catch(() => {}); 
    
    if (track && !track.muted) {
      audioSynth.current?.trigger(track);
      
      // STATE UPDATE LAST - Priority 2
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
    // AUDIO FIRST
    initAudio();
    audioSynth.current?.resume().catch(() => {});
    visualTrigger(id, variation);
    
    const currentTrack = tracksRef.current.find(t => t.id === id);
    let targetState = currentTrack?.variationStates[variation];
    if (!targetState && currentTrack) {
         targetState = {
            volume: currentTrack.volume,
            pan: currentTrack.pan,
            pitch: currentTrack.pitch,
            effects: currentTrack.effects
        };
    }

    if (currentTrack && !currentTrack.muted && targetState) {
        const tempTrack = { 
            ...currentTrack, 
            variation: variation, 
            volume: targetState.volume,
            pan: targetState.pan,
            pitch: targetState.pitch,
            effects: targetState.effects
        };
        audioSynth.current?.trigger(tempTrack);
    }

    // STATE UPDATE LATER
    // We can debounce history if needed, but variation select is less frequent than drumming
    addToHistory(); 
    
    setTracks(prev => {
        const next = prev.map(t => {
            if (t.id === id) {
                const activePIdx = t.activePatternIdx;
                const newPatterns = [...t.patterns];
                newPatterns[activePIdx] = { ...newPatterns[activePIdx], variation: variation };
                const targetState = t.variationStates[variation] || {
                    volume: t.volume, pan: t.pan, pitch: t.pitch, effects: t.effects
                };
                const updated = { 
                    ...t, 
                    variation: variation, 
                    patterns: newPatterns,
                    volume: targetState.volume,
                    pan: targetState.pan,
                    pitch: targetState.pitch,
                    effects: targetState.effects
                };
                audioSynth.current?.updateTrackParameters(updated);
                return updated;
            }
            return t;
        });
        return next;
    });
    
    handleSelectTrack(id);
    recordNote(id); 
  }, [recordNote, addToHistory, handleSelectTrack]);

  const handleMuteToggle = useCallback((id: number) => {
     addToHistory();
     setTracks(prev => prev.map(t => {
         if (t.id === id) {
             const newMuted = !t.muted;
             setStatusMessage(newMuted ? `${t.name} MUTED` : `${t.name} ACTIVE`);
             const updated = { ...t, muted: newMuted };
             audioSynth.current?.updateTrackParameters(updated);
             return updated;
         }
         return t;
     }));
  }, [addToHistory]);

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
  
  const handleClearPattern = () => handleClearTrack();

  const handleClearSample = useCallback((val: number) => {
      addToHistory();
      setTracks(prev => prev.map(t => {
          if (t.id === selectedTrackId) {
             if (t.sample?.isCustom) {
                 setStatusMessage("SAMPLE CLEARED");
                 return { ...t, sample: undefined };
             }
             if (t.name !== 'EMPTY') {
                 setStatusMessage("TRACK EMPTY");
                 return {
                     ...t,
                     name: 'EMPTY',
                     sample: undefined,
                     soundConfig: { genre: 'NONE', type: t.type, name: 'EMPTY' }
                 };
             }
             return t;
          }
          return t;
      }));
  }, [selectedTrackId, addToHistory, selectedTrack]);

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

  const updateVariationState = (track: Track, newVol: number, newPan: number, newPitch: number, newEffects: ChannelEffects) => {
      const newVarStates = [...track.variationStates];
      newVarStates[track.variation] = { volume: newVol, pan: newPan, pitch: newPitch, effects: newEffects };
      return newVarStates;
  };

  const handleVolumeChange = useCallback((id: number, val: number) => {
    recordAutomation(id, 'volume', val);
    setLastTouchedParam({ trackId: id, param: 'volume', label: 'VOLUME' });
    setTracks(prev => prev.map(t => {
        if (t.id === id) {
            const newVarStates = updateVariationState(t, val, t.pan, t.pitch, t.effects);
            const updated = { ...t, volume: val, variationStates: newVarStates };
            audioSynth.current?.updateTrackParameters(updated);
            return updated;
        }
        return t;
    }));
  }, [recordAutomation]);

  const handleTrackPitchChange = useCallback((id: number, val: number) => {
     if (isPlayingRef.current && isRecordingRef.current) recordAutomation(id, 'pitch', val);
     setLastTouchedParam({ trackId: id, param: 'pitch', label: 'PITCH' });
     setTracks(prev => prev.map(t => {
          if (t.id === id) {
             const activePIdx = t.activePatternIdx;
             const newPatterns = [...t.patterns];
             newPatterns[activePIdx] = { ...newPatterns[activePIdx], pitch: val };
             const newVarStates = updateVariationState(t, t.volume, t.pan, val, t.effects);
             const updated = { ...t, pitch: val, patterns: newPatterns, variationStates: newVarStates };
             audioSynth.current?.updateTrackParameters(updated);
             return updated;
          }
          return t;
     }));
     const sign = val > 0 ? '+' : '';
     setStatusMessage(`PITCH: ${sign}${val.toFixed(2)}`);
  }, [recordAutomation]);

  const handleEffectChange = useCallback((id: number, effectType: keyof ChannelEffects, param: 'active' | 'value', val: number | boolean) => {
     const paramKey = `effects.${effectType}.${param}`;
     recordAutomation(id, paramKey, typeof val === 'boolean' ? (val ? 1 : 0) : val);
     if (param === 'value') {
         setLastTouchedParam({ trackId: id, param: paramKey, label: `${effectType.toUpperCase()} ${param.toUpperCase()}` });
     }
     
     setTracks(prev => prev.map(t => {
         if (t.id === id) {
             const newEffects = { ...t.effects, [effectType]: { ...t.effects[effectType], [param]: val } };
             const newVarStates = updateVariationState(t, t.volume, t.pan, t.pitch, newEffects);
             const updated = { ...t, effects: newEffects, variationStates: newVarStates };
             audioSynth.current?.updateTrackParameters(updated);
             return updated;
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
                    setTracks(prev => prev.map(t => {
                        if (t.id === selectedTrackId) {
                            return { ...t, sample: { buffer: audioBuffer, start: 0, end: 1, isCustom: true, stretch: false } };
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
          if (t.id === selectedTrackId) {
              const currentSample = t.sample || { buffer: null, isCustom: false, start: 0, end: 1, stretch: false };
              return { ...t, sample: { ...currentSample, start: newStart, end: newEnd } };
          }
          return t;
      }));
  }, [selectedTrackId]);

  const handleToggleStretch = useCallback(() => {
      setTracks(prev => prev.map(t => {
          if (t.id === selectedTrackId) {
              const currentSample = t.sample || { buffer: null, isCustom: false, start: 0, end: 1, stretch: false };
              const newStretch = !currentSample.stretch;
              setStatusMessage(newStretch ? "STRETCH: ON (LOCK LENGTH)" : "STRETCH: OFF");
              return { ...t, sample: { ...currentSample, stretch: newStretch } };
          }
          return t;
      }));
  }, [selectedTrackId]);

  const handlePitchWheel = useCallback((val: number) => {
     const effectivePitch = val * 3; 
     if (isPlayingRef.current && isRecordingRef.current) recordAutomation(selectedTrackId, 'pitch', effectivePitch);
     setTracks(prev => prev.map(t => {
          if (t.id === selectedTrackId) {
             const activePIdx = t.activePatternIdx;
             const newPatterns = [...t.patterns];
             newPatterns[activePIdx] = { ...newPatterns[activePIdx], pitch: effectivePitch };
             const newVarStates = updateVariationState(t, t.volume, t.pan, effectivePitch, t.effects);
             const updated = { ...t, pitch: effectivePitch, patterns: newPatterns, variationStates: newVarStates };
             audioSynth.current?.updateTrackParameters(updated);
             return updated;
          }
          return t;
     }));
     setStatusMessage(`PITCH: ${effectivePitch.toFixed(2)}`);
  }, [selectedTrackId, recordAutomation]);

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
              newPatterns[activePIdx] = { ...newPatterns[activePIdx], steps: parseSteps(patternStr), automation: {} };
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
      const currentGenreState: Record<number, any> = {};
      tracksRef.current.forEach(t => {
          currentGenreState[t.id] = { pitch: t.pitch, volume: t.volume, pan: t.pan, effects: t.effects };
      });
      genreStatesRef.current[selectedGenre] = currentGenreState;

      setSelectedGenre(genre);
      setStatusMessage(`PACK LOADED: ${genre}`);
      initAudio();
      setLegendaryPatternIdx(null); 
      if (audioSynth.current) audioSynth.current.setGenre(genre);

      const savedState = genreStatesRef.current[genre];

      const newTracks = tracksRef.current.map(t => {
          let newEffects = getEffects();
          let newPitch = 0; 
          let newVol = t.volume; 
          let newPan = 0;
          let newName = t.name;

          if (GENRE_KIT_MAP[genre] && GENRE_KIT_MAP[genre][t.id]) {
              newName = GENRE_KIT_MAP[genre][t.id];
          } else {
              const def = DEFAULT_TRACKS.find(dt => dt.id === t.id);
              if (def) newName = def.name;
          }
          
          if (savedState && savedState[t.id]) {
              newPitch = savedState[t.id].pitch;
              newVol = savedState[t.id].volume;
              newPan = savedState[t.id].pan;
              newEffects = savedState[t.id].effects;
          } else {
              switch(genre) {
                  case 'TR-909': if (t.type === InstrumentType.KICK) newVol = 1.0; if (t.type === InstrumentType.HIHAT_OPEN) { newEffects.reverb.active = true; newEffects.reverb.value = 0.2; } break;
                  case 'MEMPHIS': if (t.type === InstrumentType.KICK) { newEffects.bitcrush.active = true; newEffects.bitcrush.value = 0.2; } if (t.type === InstrumentType.COWBELL) { newEffects.reverb.active = true; newEffects.reverb.value = 0.4; } break;
                  case 'ETHNIC-WORLD': if (t.type === InstrumentType.CHORD) { newEffects.reverb.active = true; newEffects.reverb.value = 0.6; } break;
                  case 'GABBER': if (t.type === InstrumentType.KICK) { newVol = 1.0; newEffects.bitcrush.active = true; newEffects.bitcrush.value = 0.6; } break;
                  case 'UK-GARAGE': if (t.type === InstrumentType.HIHAT_CLOSED) newVol = 0.6; break;
                  case 'ACID': if (t.type === InstrumentType.BASS) { newEffects.delay.active = true; newEffects.delay.value = 0.4; } break;
                  case 'HARDSTYLE': if (t.type === InstrumentType.KICK) newVol = 1.0; break;
                  case 'DUBSTEP': if (t.type === InstrumentType.BASS) { newEffects.filter.active = true; newEffects.filter.value = 0.3; } break;
              }
          }
          
          const trackPatterns = t.patterns.map(p => ({
              ...p,
              pitch: newPitch,
              pan: newPan,
              // Keep steps and automation, reset variation to default for sound consistency
              variation: 0
          }));
          
          const newVarStates = createVariationStates(newVol, newPan, newPitch);

          return { ...t, name: newName, pitch: newPitch, volume: newVol, pan: newPan, effects: newEffects, patterns: trackPatterns, soundConfig: undefined, variationStates: newVarStates, variation: 0 };
      });
      setTracks(newTracks);
      newTracks.forEach(t => audioSynth.current?.updateTrackParameters(t));
  };

  const handlePatternSelect = (patternIndex: number) => {
      addToHistory();
      const currentSceneIdx = activeSceneRef.current;
      setTracks(prev => prev.map(t => {
          if (t.id === selectedTrackId) {
              const targetPattern = t.patterns[patternIndex];
              return { ...t, activePatternIdx: patternIndex, variation: targetPattern.variation, pitch: targetPattern.pitch, pan: targetPattern.pan };
          }
          return t;
      }));
      setScenes(prev => {
          const newScenes = [...prev];
          const newScene = { ...newScenes[currentSceneIdx] };
          if (newScene.trackStates[selectedTrackId]) {
             newScene.trackStates[selectedTrackId].activePatternIdx = patternIndex;
          }
          newScenes[currentSceneIdx] = newScene;
          return newScenes;
      });
      setStatusMessage(`TRK ${selectedTrackId + 1} -> PTN ${patternIndex + 1}`);
  };

  const handleMatrixPatternSelect = useCallback((trackId: number, patternIndex: number) => {
      addToHistory();
      const currentSceneIdx = activeSceneRef.current;
      setTracks(prev => prev.map(t => {
          if (t.id === trackId) {
              const targetPattern = t.patterns[patternIndex];
              return { ...t, activePatternIdx: patternIndex, variation: targetPattern.variation, pitch: targetPattern.pitch, pan: targetPattern.pan };
          }
          return t;
      }));
      setScenes(prev => {
          const newScenes = [...prev];
          // Update the saved state of the ACTIVE scene to match UI interaction
          // Because we only 'Snapshot on Exit', we need to keep the scene storage in sync for visual matrix feedback
          if (newScenes[currentSceneIdx]) {
              const newScene = { ...newScenes[currentSceneIdx] };
              if (!newScene.trackStates[trackId]) {
                  // Fallback if track not in snapshot yet
                  newScene.trackStates[trackId] = { activePatternIdx: patternIndex } as any; 
              } else {
                  newScene.trackStates[trackId].activePatternIdx = patternIndex;
              }
              newScenes[currentSceneIdx] = newScene;
          }
          return newScenes;
      });
      handleSelectTrack(trackId);
  }, [addToHistory, handleSelectTrack]);

  const handleSceneSelect = useCallback((sceneIndex: number) => {
      if (sceneIndex < 0 || sceneIndex >= SCENE_COUNT) return;
      addToHistory();
      
      const prevSceneIdx = activeSceneRef.current;
      
      // 1. Snapshot Current State to Previous Scene
      const snapshot: SceneData = {
          genre: selectedGenre,
          bpm: bpm,
          trackStates: {}
      };
      tracksRef.current.forEach(t => {
          snapshot.trackStates[t.id] = {
              volume: t.volume,
              pan: t.pan,
              pitch: t.pitch,
              muted: t.muted,
              effects: JSON.parse(JSON.stringify(t.effects)),
              soundConfig: t.soundConfig,
              sample: t.sample,
              activePatternIdx: t.activePatternIdx,
              variation: t.variation,
              color: t.color
          };
      });

      // 2. Load Target Scene Data
      const targetScene = scenesRef.current[sceneIndex];
      
      // Update Scenes Storage
      const newScenes = [...scenesRef.current];
      newScenes[prevSceneIdx] = snapshot;
      setScenes(newScenes);
      setActiveScene(sceneIndex);

      // 3. Apply Target Scene to Live Tracks
      if (targetScene) {
          setSelectedGenre(targetScene.genre);
          setBpm(targetScene.bpm);
          if (audioSynth.current) {
              audioSynth.current.setGenre(targetScene.genre);
              audioSynth.current.updateBpm(targetScene.bpm);
          }

          setTracks(prev => prev.map(t => {
             const savedState = targetScene.trackStates[t.id];
             if (savedState) {
                 const updatedTrack = {
                     ...t,
                     volume: savedState.volume,
                     pan: savedState.pan,
                     pitch: savedState.pitch,
                     muted: savedState.muted,
                     effects: JSON.parse(JSON.stringify(savedState.effects)),
                     soundConfig: savedState.soundConfig,
                     sample: savedState.sample,
                     activePatternIdx: savedState.activePatternIdx,
                     variation: savedState.variation,
                     color: savedState.color || t.color
                 };
                 // Sync with synth
                 if (audioSynth.current) audioSynth.current.updateTrackParameters(updatedTrack);
                 return updatedTrack;
             }
             // Fallback for new tracks not in old scene: Keep them as is, or reset? Keep as is generally better UX
             return t;
          }));
      }

      setStatusMessage(`SCENE ${sceneIndex + 1} LOADED`);
  }, [addToHistory, selectedGenre, bpm]);

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

  const getEffectiveEffects = (held: Set<number>, latched: Set<number>, slots: MasterEffectType[]) => {
      const activeIndices = new Set([...held, ...latched]);
      return Array.from(activeIndices).map(idx => slots[idx]);
  };

  const updateHeldFx = (indices: Set<number>) => {
      heldFxRef.current = indices;
      setHeldFxIndices(new Set<number>(indices)); 
  };

  const updateLatchedFx = (indices: Set<number>) => {
      latchedFxRef.current = indices;
      setLatchedFxIndices(new Set<number>(indices)); 
  };

  const handleFxPadDown = (index: number) => {
      setFocusedFxIndex(index);
      if (latchedFxRef.current.has(index)) {
          const newLatched = new Set<number>(latchedFxRef.current);
          newLatched.delete(index);
          updateLatchedFx(newLatched);
          setStatusMessage("FX UNLATCHED");
          
          const newHeld = new Set<number>(heldFxRef.current);
          newHeld.add(index);
          updateHeldFx(newHeld);
          const effects = getEffectiveEffects(newHeld, newLatched, fxSlots);
          audioSynth.current?.applyMasterEffects(effects);
      } else {
          const newHeld = new Set<number>(heldFxRef.current);
          newHeld.add(index);
          updateHeldFx(newHeld);
          const effects = getEffectiveEffects(newHeld, latchedFxRef.current, fxSlots);
          audioSynth.current?.applyMasterEffects(effects);
      }
  };

  const handleFxPadUp = (index: number) => {
      const newHeld = new Set<number>(heldFxRef.current);
      if (newHeld.has(index)) {
          newHeld.delete(index);
          updateHeldFx(newHeld);
          const effects = getEffectiveEffects(newHeld, latchedFxRef.current, fxSlots);
          audioSynth.current?.applyMasterEffects(effects);
      }
  };

  const toggleLatch = (index: number, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation(); e.preventDefault();
      
      // NEW: Focus the FX when latched
      setFocusedFxIndex(index);
      
      const newLatched = new Set<number>(latchedFxRef.current);
      if (newLatched.has(index)) {
          newLatched.delete(index);
          setStatusMessage("FX UNLATCHED");
      } else {
          newLatched.add(index);
          setStatusMessage(`FX LATCHED`);
      }
      updateLatchedFx(newLatched);
      const effects = getEffectiveEffects(heldFxRef.current, newLatched, fxSlots);
      audioSynth.current?.applyMasterEffects(effects);
  };
  
  const handleFxSlotChange = (slotIndex: number, typeStr: string) => {
      const type = typeStr as MasterEffectType;
      const newSlots = [...fxSlots];
      newSlots[slotIndex] = type;
      setFxSlots(newSlots);
      if (!fxParamState[type]) {
          const defaults = audioSynth.current?.getMasterFxParams(type) || [0.8, 0.5, 0.5, 0.8];
          setFxParamState(prev => ({ ...prev, [type]: defaults }));
      }
      if (heldFxRef.current.has(slotIndex) || latchedFxRef.current.has(slotIndex)) {
          const effects = getEffectiveEffects(heldFxRef.current, latchedFxRef.current, newSlots);
          audioSynth.current?.applyMasterEffects(effects);
      }
  };
  
  const handleFxParamChange = (paramIdx: 0 | 1 | 2 | 3, value: number) => {
      const activeType = fxSlots[focusedFxIndex];
      if (!activeType || !audioSynth.current) return;
      setFxParamState(prev => {
          const currentParams = prev[activeType] || [0.8, 0.5, 0.5, 0.8];
          const newParams = [...currentParams] as [number, number, number, number];
          newParams[paramIdx] = value;
          return { ...prev, [activeType]: newParams };
      });
      audioSynth.current.setMasterFxParam(activeType, paramIdx, value);
      if (heldFxIndices.has(focusedFxIndex) || latchedFxIndices.has(focusedFxIndex)) {
          const effects = getEffectiveEffects(heldFxRef.current, latchedFxRef.current, fxSlots);
          audioSynth.current.applyMasterEffects(effects);
      }
  };

  const openLibrary = (trackId: number) => {
      setLibraryTargetTrackId(trackId);
      setIsLibraryOpen(true);
  };

  const closeLibrary = () => {
      setIsLibraryOpen(false);
      setLibraryTargetTrackId(null);
  };

  const handleAddSample = async (fileOrBlob: File | Blob, name: string) => {
    if (!audioSynth.current) return;
    try {
        const arrayBuffer = await fileOrBlob.arrayBuffer();
        const audioBuffer = await audioSynth.current.getContext().decodeAudioData(arrayBuffer);
        const newSample: UserSample = { id: Date.now().toString(), name: name, buffer: audioBuffer, date: Date.now() };
        setUserSamples(prev => [...prev, newSample]);
        setStatusMessage("SAMPLE IMPORTED");
    } catch (e) {
        console.error("Error importing sample", e);
        setStatusMessage("IMPORT ERROR");
    }
  };

  const handleDeleteSample = (id: string) => setUserSamples(prev => prev.filter(s => s.id !== id));
  const handleRenameSample = (id: string, newName: string) => setUserSamples(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));

  const handleSoundSelect = (item: LibraryItem | UserSample, isUserSample: boolean) => {
      if (libraryTargetTrackId === null) return;
      
      const libItem = item as LibraryItem;
      const movedSample = !isUserSample && libItem.isCustom && libItem.buffer;
      
      addToHistory();
      setTracks(prev => prev.map(t => {
          if (t.id === libraryTargetTrackId) {
              if (isUserSample || movedSample) {
                  const buf = isUserSample ? (item as UserSample).buffer : libItem.buffer!;
                  return {
                      ...t,
                      name: item.name,
                      sample: { buffer: buf, start: 0, end: 1, isCustom: true, stretch: false },
                      soundConfig: undefined 
                  };
              } else {
                  return {
                      ...t,
                      name: item.name,
                      soundConfig: { genre: libItem.genre, type: libItem.type, name: libItem.name },
                      sample: t.sample ? { ...t.sample, isCustom: false, start: 0, end: 1 } : undefined
                  };
              }
          }
          return t;
      }));
      setStatusMessage(`ASSIGNED: ${item.name}`);
      closeLibrary();
  };
  
  const handlePreviewSound = (item: LibraryItem | UserSample) => {
      if (!audioSynth.current) return;
      
      const libItem = item as LibraryItem;
      const isCustom = (item as any).buffer !== undefined || libItem.isCustom;
      
      if (isCustom) {
           const buf = (item as any).buffer || libItem.buffer;
           audioSynth.current.previewSound({ type: InstrumentType.KICK, genre: 'USER', sample: buf });
      } else {
           audioSynth.current.previewSound({ type: libItem.type, genre: libItem.genre });
      }
  };

  const handleMoveToPresets = (sample: UserSample) => {
      setSoundLibrary(prev => {
          const newLib = [...prev];
          let userCatIndex = newLib.findIndex(c => c.id === 'USER_IMPORTED');
          
          const newItem: LibraryItem = {
              name: sample.name,
              genre: 'USER',
              type: InstrumentType.KICK, // Default fallback
              buffer: sample.buffer,
              isCustom: true
          };

          if (userCatIndex === -1) {
              newLib.unshift({
                  id: 'USER_IMPORTED',
                  label: 'IMPORTED SAMPLES',
                  items: [newItem]
              });
          } else {
              // Avoid dupes
              if (!newLib[userCatIndex].items.some(i => i.name === newItem.name)) {
                   newLib[userCatIndex] = {
                       ...newLib[userCatIndex],
                       items: [...newLib[userCatIndex].items, newItem]
                   };
              }
          }
          return newLib;
      });
      setStatusMessage("MOVED TO PRESETS");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isContinuous = ['=', '+', '-', '_', 'arrowup', 'arrowdown'].includes(key);
      if (e.repeat && !isContinuous) return;

      if (key === 'delete' || key === 'backspace') { if (key === 'backspace') e.preventDefault(); handleClearTrack(); return; }
      if ((e.metaKey || e.ctrlKey) && key === 'l') { e.preventDefault(); handleToggleLock(); return; }
      if ((e.metaKey || e.ctrlKey) && key === 'z') { e.preventDefault(); handleUndo(); return; }
      if (!e.repeat && key >= '1' && key <= '8') { e.preventDefault(); handleSceneSelect(parseInt(key) - 1); return; }

      if (e.key === 'ArrowUp') { e.preventDefault(); setTracks(prev => { const t = prev.find(tr => tr.id === selectedTrackId); if (!t) return prev; const newVol = Math.min(1.0, t.volume + 0.1); setStatusMessage(`VOL: ${Math.round(newVol * 100)}%`); const updated = { ...t, volume: newVol }; audioSynth.current?.updateTrackParameters(updated); return prev.map(tr => tr.id === selectedTrackId ? updated : tr); }); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setTracks(prev => { const t = prev.find(tr => tr.id === selectedTrackId); if (!t) return prev; const newVol = Math.max(0.0, t.volume - 0.1); setStatusMessage(`VOL: ${Math.round(newVol * 100)}%`); const updated = { ...t, volume: newVol }; audioSynth.current?.updateTrackParameters(updated); return prev.map(tr => tr.id === selectedTrackId ? updated : tr); }); }
      
      if (key === '=' || key === '+') { adjustBpm(1); }
      if (key === '-' || key === '_') { adjustBpm(-1); }
      if (key === 'm') { handleMuteToggle(selectedTrackId); }
      if (!e.repeat && KEY_MAP[key] !== undefined) { 
          const id = KEY_MAP[key]; 
          if (tracksRef.current.find(t => t.id === id)) { 
              handlePadTrigger(id); 
              // Optimization: Only select if different to avoid potential re-render triggers
              if (selectedTrackIdRef.current !== id) {
                  handleSelectTrack(id); 
              }
          } 
      }
      if (!e.repeat && e.key === "'") { const currentTrack = tracksRef.current.find(t => t.id === selectedTrackId); if (currentTrack) { let nextVar = (currentTrack.variation === 0 ? 1 : (currentTrack.variation === 1 ? 3 : (currentTrack.variation === 3 ? 2 : 0))); handleVariationSelect(selectedTrackId, nextVar); } }
      if (!e.repeat && e.code === 'Space') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrackId, handlePadTrigger, handleVariationSelect, togglePlay, handleMuteToggle, adjustBpm, handleToggleLock, handleUndo, handleSceneSelect, handleSelectTrack]); 

  const currentPattern = selectedTrack.patterns[selectedTrack.activePatternIdx];
  const lcdPatternName = legendaryPatternIdx !== null ? `HIST: ${LEGENDARY_PATTERNS[legendaryPatternIdx].name}` : `SCN:${activeScene + 1} / PTN:${selectedTrack.activePatternIdx + 1}`;
  const legendaryCountDisplay = legendaryPatternIdx !== null ? `${(legendaryPatternIdx + 1).toString().padStart(2, '0')}/${LEGENDARY_PATTERNS.length}` : "FREE"; 
  const isPitchLengthLocked = selectedTrack.sample?.stretch || false;
  const trackColorClass = (colorName: string) => {
      const map: Record<string, string> = { red: 'bg-red-500', orange: 'bg-orange-500', amber: 'bg-amber-500', yellow: 'bg-yellow-400', lime: 'bg-lime-500', green: 'bg-green-600', emerald: 'bg-emerald-500', teal: 'bg-teal-500', cyan: 'bg-cyan-500', sky: 'bg-sky-500', blue: 'bg-blue-600', indigo: 'bg-indigo-500', violet: 'bg-violet-500', purple: 'bg-purple-600', fuchsia: 'bg-fuchsia-500', pink: 'bg-pink-500', rose: 'bg-rose-500', white: 'bg-white' };
      return map[colorName] || 'bg-gray-500';
  };
  const renderPads = () => {
    return (
        <div className="grid grid-cols-5 gap-1 content-start">
            {Array.from({length: 15}).map((_, id) => {
                const track = tracks.find(t => t.id === id);
                const shortcut = Object.keys(KEY_MAP).find(k => KEY_MAP[k] === id) || '';
                
                if (track) {
                    return ( 
                        <PadMix 
                            key={track.id} 
                            ref={(el) => { padMixRefs.current[track.id] = el }} 
                            track={track} 
                            isSelected={selectedTrackId === track.id} 
                            onSelect={handleSelectTrack} 
                            onSelectVariation={handleVariationSelect} 
                            onTrigger={handlePadTrigger} 
                            onToggleMute={handleMuteToggle} 
                            onOpenLibrary={openLibrary} 
                            onUpdateVolume={handleVolumeChange} 
                            onUpdatePitch={handleTrackPitchChange} 
                            onUpdateEffect={handleEffectChange} 
                            onDelete={handleDeleteTrack} 
                            onColorChange={handleColorChange} 
                            shortcutKey={shortcut} 
                            currentStep={currentStep} 
                            isPlaying={isPlaying} 
                        /> 
                    );
                } else {
                    return ( 
                        <button 
                            key={id} 
                            onClick={() => handleAddTrack(id)} 
                            className="w-full aspect-square bg-[#2a2a2a] rounded-sm border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1 hover:bg-[#333] hover:border-white/30 transition-all group text-neutral-600 hover:text-white relative"
                        >
                            <div className="absolute top-1 left-1 text-[8px] font-mono font-bold text-neutral-500 opacity-60">{shortcut.toUpperCase()}</div>
                            <PlusIcon className="w-6 h-6 opacity-30 group-hover:opacity-100 transition-transform" />
                            <span className="text-[7px] font-bold tracking-widest uppercase opacity-50 group-hover:opacity-100">ADD</span>
                        </button> 
                    );
                }
            })}
        </div>
    );
  }
  
  const currentFxType = fxSlots[focusedFxIndex];
  // Default is [mix, A, B, Volume=0.8]
  const currentFxParams = fxParamState[currentFxType] || [0.8, 0.5, 0.5, 0.8];
  const focusedFxInfo = FX_INFO[currentFxType];
  const focusedFxLabels = FX_PARAM_DEFS[currentFxType];

  return (
    <div className="min-h-screen w-full bg-[#222] flex items-start justify-center p-2 overflow-y-auto">
      <SoundLibraryModal 
         isOpen={isLibraryOpen}
         onClose={closeLibrary}
         onSelect={handleSoundSelect}
         currentTrackName={libraryTargetTrackId !== null ? tracks.find(t => t.id === libraryTargetTrackId)?.name || '' : ''}
         userSamples={userSamples}
         library={soundLibrary}
         onAddSample={handleAddSample}
         onDeleteSample={handleDeleteSample}
         onRenameSample={handleRenameSample}
         onPreview={handlePreviewSound}
         onMoveToPresets={handleMoveToPresets}
      />
      <div className="w-full flex flex-col items-center" style={{ '--bpm-duration': `${60/bpm}s` } as React.CSSProperties}>
        <div className="w-full max-w-[1800px] bg-[#dcdcdc] rounded-sm shadow-[0_50px_100px_rgba(0,0,0,0.6)] border border-[#aaa] relative flex flex-col h-auto min-h-0">
                
                <div className="h-8 bg-[#222] border-b border-white/10 w-full flex items-center justify-between px-4 flex-shrink-0 shadow-md">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 animate-pulse"></div>
                        <span className={`text-xs font-black tracking-[0.25em] font-mono transition-all ${isPlaying ? 'animate-chill-pulse' : 'text-neutral-400'}`}>
                            RAVE SUPERBLASTER 3000
                        </span>
                    </div>
                    <div className="text-[9px] text-neutral-500 font-mono tracking-widest hidden sm:block">UNIT 01 // LEGENDARY SERIES</div>
                </div>

                <div className="flex-1 p-3 flex flex-col gap-3 min-h-0">
                    
                    <div className="flex flex-col xl:flex-row gap-3 h-auto shrink-0">
                        
                        <div className="bg-[#ccc] rounded-sm p-2 border border-white/50 shadow-inner flex items-center justify-center relative w-full xl:w-80 h-auto sm:h-56 shrink-0">
                            <div className="grid grid-cols-4 gap-2 w-full h-full">
                                <div className="col-span-2 row-span-2 bg-[#e0e0e0] rounded-sm border border-white/50 shadow-sm flex flex-col items-center justify-center gap-1 p-1">
                                     <TempoKnob bpm={bpm} onChange={setBpm} />
                                     <div className="flex flex-col items-center leading-none">
                                         <span className="text-3xl font-black text-neutral-700 font-['VT323']">{bpm}</span>
                                         <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">BPM</span>
                                     </div>
                                </div>
                                <button onClick={togglePlay} className={`col-span-2 h-full rounded-sm font-bold flex items-center justify-center gap-2 transition-all border ${isPlaying ? 'bg-green-600 text-white animate-breathe-glow translate-y-[2px]' : 'bg-[#dcdcdc] text-neutral-800 border-black/10 shadow-[0_3px_0_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-none hover:bg-white'}`}>
                                    {isPlaying ? <StopIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                                </button>
                                <button onClick={toggleRecording} className={`h-10 flex items-center justify-center rounded-sm font-bold shadow-[0_2px_0_rgba(0,0,0,0.2)] transition-all active:shadow-none active:translate-y-[2px] border border-black/10 ${isRecording ? 'bg-red-600 text-white' : 'bg-[#dcdcdc] hover:bg-white text-red-600'}`}>
                                    <span className="text-[10px] font-black">REC</span>
                                </button>
                                <button onPointerDown={startSampling} onPointerUp={stopSampling} onPointerLeave={stopSampling} className={`h-10 rounded-sm border-b-2 active:border-b-0 active:translate-y-[2px] transition-all flex items-center justify-center ${isSampling ? 'bg-red-500 text-white border-red-700 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-[#dcdcdc] text-neutral-600 border-neutral-400 hover:bg-white'}`}>
                                    <MicrophoneIcon className="w-4 h-4" />
                                </button>
                                <button onClick={handleUndo} className="h-8 rounded-sm bg-[#dcdcdc] text-[#666] border-b-[2px] border-[#bbb] hover:bg-white flex items-center justify-center active:translate-y-[2px] active:border-b-0 shadow-sm group" title="Undo">
                                    <ArrowUturnLeftIcon className="w-3 h-3 group-active:-rotate-45 transition-transform" />
                                </button>
                                <button onClick={handleToggleLock} className={`h-8 rounded-sm flex items-center justify-center transition-all border-b-[2px] active:border-b-0 active:translate-y-[2px] ${isLocked ? 'animate-rgb-lock text-white border-transparent bg-neutral-900' : 'bg-[#dcdcdc] text-neutral-600 border-[#bbb] shadow-sm hover:bg-white'}`}>
                                    {isLocked ? <LockClosedIcon className="w-3 h-3" /> : <LockOpenIcon className="w-3 h-3" />}
                                </button>
                                <button onClick={() => setMetronomeEnabled(!metronomeEnabled)} className={`h-8 rounded-sm font-bold border-b-[2px] flex items-center justify-center transition-all active:translate-y-[2px] active:border-b-0 shadow-sm ${metronomeEnabled ? 'bg-[#333] text-white border-black' : 'bg-[#dcdcdc] text-neutral-600 border-[#bbb] hover:bg-white'}`}>
                                    <ClockIcon className="w-3 h-3" />
                                </button>
                                <button onClick={handleClearTrack} className="h-8 rounded-sm font-bold border-b-[2px] flex items-center justify-center transition-all active:translate-y-[2px] active:border-b-0 shadow-sm bg-[#dcdcdc] text-neutral-600 border-[#bbb] hover:bg-red-100 hover:text-red-500">
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-1 gap-2 h-56 min-w-0">
                            <PitchModWheels onPitchChange={handlePitchWheel} pitchValue={selectedTrack.pitch / 3} isLocked={isPitchLengthLocked} onToggleLock={handleToggleStretch} />
                            <div className="flex flex-col gap-2 flex-1 h-full min-w-0">
                                <LCDDisplay bpm={bpm} patternName={lcdPatternName} isPlaying={isPlaying} isRecording={isRecording} statusMessage={statusMessage} metronomeEnabled={metronomeEnabled} sampleBuffer={selectedTrack.sample?.buffer} previewBuffer={previewBuffer} sampleStart={selectedTrack.sample?.start} sampleEnd={selectedTrack.sample?.end} isSampling={isSampling} isStretch={selectedTrack.sample?.stretch} onSampleUpdate={handleSampleRegionUpdate} recordingAnalyser={recordingAnalyser} onClearSample={handleClearSample} isTrackEmpty={selectedTrack.name === 'EMPTY'} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-2 h-[340px] shrink-0"> {/* Reduced height and gap */}
                        
                        {/* LEFT: JAM MATRIX (SCENES & PATTERNS) */}
                        <div className="flex-[6.5] bg-[#1a1a1a] rounded-sm border border-black/30 shadow-inner flex flex-col p-1 gap-0.5 overflow-hidden">
                             {/* HEADER ALIGNED WITH COLUMNS */}
                             <div className="flex gap-1 h-5 w-full shrink-0 pr-1"> 
                                 <div className="w-20 shrink-0 border-r border-white/5 bg-[#222] flex items-center justify-end px-2">
                                     <span className="text-[9px] font-black text-neutral-500 tracking-wider">SCENES</span>
                                 </div>
                                 <div className="flex-1 grid grid-cols-8 gap-[2px]"> {/* CHANGED FROM flex to grid */}
                                     {Array.from({length: SCENE_COUNT}).map((_, i) => (
                                         <button key={i} onClick={() => handleSceneSelect(i)} className={`flex-1 rounded-[1px] flex flex-col items-center justify-center transition-all ${activeScene === i ? 'bg-white text-black' : `${SCENE_COLORS[i]} text-white/90 opacity-80 hover:opacity-100`}`}>
                                             <span className="text-[9px] font-black leading-none">{i + 1}</span>
                                         </button>
                                     ))}
                                 </div>
                             </div>
                             
                             {/* TRACK LIST */}
                             <div className="flex-1 flex flex-col gap-[2px] overflow-y-auto pr-1 custom-scrollbar">
                                {Array.from({length: 15}).map((_, i) => {
                                    const track = tracks.find(t => t.id === i);
                                    
                                    if (!track) {
                                        // Empty Slot
                                        return (
                                            <div key={i} className="flex items-center gap-1 h-6 shrink-0 opacity-30 select-none grayscale pointer-events-none">
                                                <div className="w-20 shrink-0 text-[9px] font-bold text-right pr-2 border-r border-white/10 text-neutral-700 font-mono">
                                                    --
                                                </div>
                                                <div className="flex-1 grid grid-cols-8 gap-[2px] h-full">
                                                     {Array.from({length: 8}).map((_, p) => (
                                                         <div key={p} className="bg-[#111] rounded-[1px] border border-white/5"></div>
                                                     ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                    
                                    return (
                                    <div key={track.id} className="flex items-center gap-1 h-6 shrink-0"> 
                                        <div className={`w-20 shrink-0 truncate text-[9px] font-bold text-right pr-2 border-r border-white/10 ${selectedTrackId === track.id ? 'text-white' : 'text-neutral-500'}`}>
                                            {track.name}
                                        </div>
                                        <div className="flex-1 grid grid-cols-8 gap-[2px] h-full">
                                            {Array.from({length: PATTERN_COUNT}).map((_, pIdx) => {
                                                const isActive = track.activePatternIdx === pIdx;
                                                const pattern = track.patterns[pIdx];
                                                const hasData = pattern.steps.some(s => s);
                                                const trackColor = trackColorClass(track.color);
                                                let bgClass = 'bg-[#0f0f0f]'; 
                                                if (isActive) bgClass = trackColor; 
                                                else if (hasData) bgClass = 'bg-neutral-700';
                                                
                                                return ( 
                                                    <button key={pIdx} onClick={() => handleMatrixPatternSelect(track.id, pIdx)} className={`rounded-[1px] transition-all h-full w-full relative overflow-hidden group ${bgClass} ${isActive ? 'shadow-[0_0_8px_rgba(255,255,255,0.4)] z-10 scale-[1.05]' : 'hover:bg-neutral-600 border border-white/5'}`}> 
                                                        {isActive && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>} 
                                                        {hasData && (
                                                            <div className="absolute inset-0 p-[2px] flex items-center justify-center">
                                                                <svg viewBox="0 0 16 4" className="w-full h-full opacity-50" preserveAspectRatio="none">
                                                                    {pattern.steps.map((step, sIdx) => (
                                                                        step ? <rect key={sIdx} x={sIdx} y={0} width={0.8} height={4} fill="currentColor" className="text-white" /> : null
                                                                    ))}
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </button> 
                                                );
                                            })}
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>

                        {/* RIGHT: RAVE FX & MACRO */}
                        <div className="flex-[3.5] flex flex-col gap-2 min-w-0">
                             <div className={`flex-1 bg-[#222] rounded-sm border border-white/10 shadow-md p-2 flex flex-col gap-1 relative overflow-hidden min-h-0`}>
                                <div className="flex items-center justify-between px-1 mb-0.5 w-full relative">
                                    <div className="flex items-center gap-2">
                                        <SparklesIcon className="w-4 h-4 text-yellow-400 animate-spin-slow"/>
                                        <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] text-shadow-neon">RAVE FX</span>
                                    </div>
                                </div>
                                {/* Horizontal Strip */}
                                <div className="flex-1 grid grid-cols-8 gap-1 min-h-0">
                                    {fxSlots.map((fxType, index) => {
                                        const info = FX_INFO[fxType];
                                        const isActive = heldFxIndices.has(index) || latchedFxIndices.has(index);
                                        const isLatched = latchedFxIndices.has(index);
                                        const isFocused = focusedFxIndex === index;
                                        return (
                                            <div key={index} className="flex flex-col h-full min-h-0 relative group">
                                                <button 
                                                    onMouseDown={() => handleFxPadDown(index)} 
                                                    onMouseUp={() => handleFxPadUp(index)} 
                                                    onMouseLeave={() => handleFxPadUp(index)} 
                                                    onTouchStart={(e) => { e.preventDefault(); handleFxPadDown(index); }} 
                                                    onTouchEnd={(e) => { e.preventDefault(); handleFxPadUp(index); }} 
                                                    className={`
                                                        w-full h-full relative rounded-sm border-b-4 active:border-b-0 active:translate-y-[4px] transition-all flex flex-col items-center justify-center overflow-hidden min-h-0
                                                        ${isActive ? `${info.color} text-white border-transparent z-10 scale-[1.02] ring-2 ring-white brightness-110 shadow-[0_0_15px_currentColor]` : `${info.color} text-white border-black/30 shadow-lg hover:brightness-110`}
                                                        ${isFocused && !isActive ? 'ring-1 ring-white/50' : ''}
                                                    `}
                                                >
                                                    {isActive && <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] animate-pulse"></div>}
                                                    <span className={`text-[8px] font-black tracking-tighter z-10 ${isActive ? 'scale-125' : ''} transition-transform drop-shadow-md pointer-events-none truncate w-full px-0.5 rotate-[-90deg]`}>{info.label}</span>
                                                </button>
                                                <button onClick={(e) => toggleLatch(index, e)} className={`absolute top-0 right-0 w-3 h-3 rounded-bl-md border-l border-b border-black/20 flex items-center justify-center z-20 shadow-sm transition-all ${isLatched ? 'bg-[#39ff14] border-white shadow-[0_0_8px_#39ff14]' : 'bg-black/40 hover:bg-black/60'}`}>
                                                    {isLatched && <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>}
                                                </button>
                                                <div className={`absolute bottom-0 left-0 w-4 h-4 flex items-center justify-center rounded-tr-md transition-colors z-30 cursor-pointer ${isActive ? 'bg-black/20 text-white' : 'bg-black/40 text-white hover:bg-black/60'}`} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                                                    <ChevronDownIcon className="w-3 h-3 relative z-10 pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                                                    <select className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={fxType} onChange={(e) => handleFxSlotChange(index, e.target.value)}>
                                                        {Object.keys(FX_INFO).map(key => (<option key={key} value={key} disabled={fxSlots.includes(key as MasterEffectType) && key !== fxType} className="text-black">{FX_INFO[key as MasterEffectType].label} - {key}</option>))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                             </div>
                             <div className="h-[120px] bg-[#1a1a1a] rounded-sm border border-white/5 p-2 flex flex-col gap-2 shadow-inner shrink-0">
                                <div className="flex justify-between items-center border-b border-white/5 pb-1">
                                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">MACRO CONTROL</span>
                                    <span className={`text-[10px] font-bold ${focusedFxInfo.color.replace('bg-', 'text-')} uppercase`}>{focusedFxInfo.label}</span>
                                </div>
                                <div className="flex-1 grid grid-cols-4 gap-2 items-center justify-around px-1">
                                    <MacroKnob label="DRY/WET" value={currentFxParams[0]} onChange={(v) => handleFxParamChange(0, v)} color={focusedFxInfo.color} />
                                    <MacroKnob label={focusedFxLabels.a} value={currentFxParams[1]} onChange={(v) => handleFxParamChange(1, v)} color={focusedFxInfo.color} />
                                    <MacroKnob label={focusedFxLabels.b} value={currentFxParams[2]} onChange={(v) => handleFxParamChange(2, v)} color={focusedFxInfo.color} />
                                    <MacroKnob label="VOLUME" value={currentFxParams[3]} onChange={(v) => handleFxParamChange(3, v)} color={focusedFxInfo.color} />
                                </div>
                             </div>
                        </div>

                    </div>
                    
                    <div className="bg-[#ccc] rounded-sm p-1.5 border border-white/20 shadow-inner w-full shrink-0">
                        <div className="flex justify-between items-center mb-1 opacity-60 px-1">
                            <div className="flex items-center gap-2"><BoltIcon className="w-3 h-3 text-neutral-600"/><span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">PRESETS (FILLS)</span></div>
                        </div>
                        <div className="flex flex-wrap gap-[2px] h-6 overflow-hidden content-start">
                            {FILL_BUTTONS.map((fill, idx) => {
                                let bgClass = 'bg-[#e0e0e0] hover:bg-white text-neutral-700';
                                if (fill.cat === 'func') bgClass = 'bg-neutral-300 hover:bg-neutral-200 text-neutral-800';
                                if (fill.cat === 'genre') bgClass = 'bg-blue-100 hover:bg-blue-50 text-blue-800';
                                if (fill.cat === 'rand') bgClass = 'bg-orange-100 hover:bg-orange-50 text-orange-800';
                                if (fill.cat === 'eucl') bgClass = 'bg-emerald-100 hover:bg-emerald-50 text-emerald-800';
                                if (fill.cat === 'tuple') bgClass = 'bg-purple-100 hover:bg-purple-50 text-purple-800';
                                return <button key={idx} onClick={() => handleQuickFill(fill.label)} className={`${bgClass} flex-1 min-w-[32px] h-6 rounded-[1px] border-b border-black/10 active:border-b-0 active:translate-y-[1px] transition-all flex items-center justify-center shadow-sm group text-[9px] font-black tracking-tighter leading-none`}>{fill.label}</button>
                            })}
                        </div>
                    </div>

                    <div className="h-28 flex gap-2 shrink-0 w-full">
                        <div className="w-24 bg-[#ccc] rounded-sm border border-white/20 h-full flex flex-col shadow-sm overflow-hidden shrink-0">
                            <div className="h-4 bg-[#d4d4d4] border-b border-white/50 flex items-center justify-center shadow-sm z-10 shrink-0"><span className="text-[7px] font-black text-neutral-500 uppercase tracking-tighter">GLOBAL PATTERN</span></div>
                            <div className="flex-1 flex flex-col items-center justify-center gap-1 p-1">
                                <div className="bg-[#222] text-[#5eead4] font-['VT323'] text-lg leading-none w-full text-center rounded-sm border border-white/10 flex items-center justify-center flex-1">{legendaryCountDisplay}</div>
                                <div className="flex w-full gap-0.5 h-5 shrink-0">
                                    <button onClick={handlePrevPattern} className="flex-1 bg-[#dcdcdc] hover:bg-white rounded-sm border-b border-[#bbb] active:translate-y-[1px] active:border-b-0 flex items-center justify-center text-neutral-600 shadow-sm"><ChevronLeftIcon className="w-3 h-3"/></button>
                                    <button onMouseDown={startRandomizing} onMouseUp={stopRandomizing} onMouseLeave={stopRandomizing} onTouchStart={(e) => { e.preventDefault(); startRandomizing(); }} onTouchEnd={(e) => { e.preventDefault(); stopRandomizing(); }} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white rounded-sm border-b border-orange-700 active:translate-y-[1px] active:border-b-0 flex items-center justify-center shadow-sm"><CubeIcon className="w-3 h-3"/></button>
                                    <button onClick={handleNextPattern} className="flex-1 bg-[#dcdcdc] hover:bg-white rounded-sm border-b border-[#bbb] active:translate-y-[1px] active:border-b-0 flex items-center justify-center text-neutral-600 shadow-sm"><ChevronRightIcon className="w-3 h-3"/></button>
                                </div>
                            </div>
                        </div>

                        <div className="w-24 bg-neutral-800 rounded-sm flex flex-col items-center justify-center border-b-4 border-black shadow-md shrink-0">
                            <div className={`w-3 h-3 rounded-full ${tracks.find(t=>t.id===selectedTrackId)?.color.replace('bg-', 'bg-') || 'bg-orange-500'} mb-1 shadow-[0_0_5px_currentColor]`}></div>
                            <span className="text-[8px] text-neutral-500 font-bold">TRACK</span>
                            <span className="text-sm font-black text-white uppercase leading-none truncate w-full text-center px-1">{selectedTrack.name}</span>
                        </div>
                        
                        {/* Center Section: Step Sequencer AND Automation Editor */}
                        <div className="flex-1 flex flex-col gap-1 min-w-0">
                            
                            {/* Step Sequencer */}
                            <div className="h-10 relative bg-[#2a2a2a] rounded-sm p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] border-b border-white/10 flex items-center gap-1">
                                <div className="flex-1 h-full">
                                        <StepSequencer steps={currentPattern.steps} currentStep={currentStep} onToggleStep={handleToggleStep} trackColor={selectedTrack.color} />
                                </div>
                                <button onClick={handleClearPattern} className="h-full w-10 rounded-[1px] bg-[#333] border border-white/5 hover:bg-red-900/50 hover:border-red-500/50 text-neutral-500 hover:text-red-500 flex items-center justify-center transition-colors group shrink-0 ml-1" title="Clear Pattern Steps"><span className="text-[9px] font-black group-hover:hidden">CLR</span><XMarkIcon className="w-4 h-4 hidden group-hover:block" /></button>
                            </div>
                            
                            {/* AUTOMATION EDITOR SECTION */}
                            <div className="flex-1 min-h-0 bg-[#151515] rounded-sm border border-white/5 relative">
                                {lastTouchedParam ? (
                                    <AutomationEditor 
                                        track={tracks.find(t => t.id === lastTouchedParam.trackId) || selectedTrack}
                                        paramName={lastTouchedParam.param}
                                        paramLabel={lastTouchedParam.label}
                                        automation={tracks.find(t => t.id === lastTouchedParam.trackId)?.patterns[tracks.find(t => t.id === lastTouchedParam.trackId)?.activePatternIdx || 0].automation[lastTouchedParam.param] || Array(16).fill(null)}
                                        onUpdate={handleAutomationGridUpdate}
                                        onClear={handleClearAutomation}
                                        color={tracks.find(t => t.id === lastTouchedParam.trackId)?.color || 'orange'}
                                        currentStep={currentStep}
                                        isPlaying={isPlaying}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-600 font-mono text-xs uppercase tracking-widest pointer-events-none">
                                        Touch a knob to edit automation
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-2 min-h-[500px] bg-[#333] rounded-sm border-4 border-[#555] shadow-inner p-[3px] overflow-y-auto">
                         <div className="flex justify-end mb-2 border-b border-white/10 pb-2">
                             <div className="flex gap-2 items-center overflow-x-auto pb-1 w-full scrollbar-hide">
                                    {GENRES.map((genre) => (
                                        <button key={genre} onClick={() => loadGenre(genre)} className={`text-xs font-mono px-3 py-1.5 rounded-sm transition-all border-b-2 active:border-b-0 active:translate-y-[2px] font-bold whitespace-nowrap ${selectedGenre === genre ? 'bg-neutral-800 text-white border-black shadow-none ring-1 ring-white/20' : 'bg-[#e0e0e0] text-neutral-600 border-neutral-400 hover:bg-white'}`}>{genre}</button>
                                    ))}
                             </div>
                         </div>
                         {renderPads()}
                    </div>
                </div>
        </div>
      </div>
    </div>
  );
};
