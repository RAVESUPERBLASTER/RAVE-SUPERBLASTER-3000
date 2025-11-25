
export type Genre = 
  | 'TR-909' 
  | 'TR-808' 
  | 'TR-707' 
  | 'LINN-DRUM' 
  | 'JUNGLE' 
  | 'MEMPHIS' 
  | 'GOA' 
  | 'ETHNIC-WORLD' 
  | 'GABBER' 
  | 'ACID' 
  | 'UK-GARAGE' 
  | 'EURO-DANCE' 
  | 'HARDSTYLE' 
  | 'DUBSTEP';

export enum InstrumentType {
  KICK = 'KICK',
  SNARE = 'SNARE',
  HIHAT_CLOSED = 'HIHAT_CLOSED',
  HIHAT_OPEN = 'HIHAT_OPEN',
  CLAP = 'CLAP',
  TOM_LOW = 'TOM_LOW',
  TOM_HI = 'TOM_HI',
  BASS = 'BASS',
  SYNTH_HIT = 'SYNTH_HIT',
  FX = 'FX',
  COWBELL = 'COWBELL',
  LASER = 'LASER',
  CRASH = 'CRASH',
  RIDE = 'RIDE',
  RIMSHOT = 'RIMSHOT',
  CHORD = 'CHORD'
}

export enum MasterEffectType {
  // BANK A (Original)
  HALF_RATE = 'HALF_RATE',
  DISTORTION = 'DISTORTION',
  SQUASH = 'SQUASH',
  ECHO_FADE = 'ECHO_FADE',
  PITCH_LFO = 'PITCH_LFO',
  EQ_SWEEP = 'EQ_SWEEP',
  MEGA_MORPH = 'MEGA_MORPH',
  PITCH_UP = 'PITCH_UP',
  PUNCH = 'PUNCH',
  QUANTISE_6_8 = 'QUANTISE_6_8', // Shared
  BEAT_REPEAT = 'BEAT_REPEAT',
  BEAT_REPEAT_FAST = 'BEAT_REPEAT_FAST',
  FM = 'FM',
  GRANULAR = 'GRANULAR',
  REVERSE = 'REVERSE', // Shared
  BOUNCING = 'BOUNCING',

  // BANK B (PO Style)
  LOOP_16 = 'LOOP_16',
  LOOP_12 = 'LOOP_12',
  LOOP_SHORT = 'LOOP_SHORT',
  LOOP_SHORTER = 'LOOP_SHORTER',
  UNISON = 'UNISON',
  UNISON_LOW = 'UNISON_LOW',
  OCTAVE_UP = 'OCTAVE_UP',
  OCTAVE_DOWN = 'OCTAVE_DOWN',
  STUTTER_4 = 'STUTTER_4',
  STUTTER_3 = 'STUTTER_3',
  SCRATCH = 'SCRATCH',
  SCRATCH_FAST = 'SCRATCH_FAST',
  RETRIGGER = 'RETRIGGER',
  NO_EFFECT = 'NO_EFFECT'
}

export interface EffectState {
  active: boolean;
  value: number; // 0 to 1
}

export interface ChannelEffects {
  reverb: EffectState;
  delay: EffectState;
  filter: EffectState;
  bitcrush: EffectState;
  stutter: EffectState;
  glitch: EffectState;
}

export interface PatternData {
  steps: boolean[]; // 16 steps
  variation: number;
  pitch: number;
  pan: number;
  // Automation: key is parameter name (e.g., "volume", "effects.filter.value"), value is array of 16 steps (number | null)
  automation: { [key: string]: (number | null)[] };
}

export interface SampleConfig {
  buffer: AudioBuffer | null;
  start: number; // 0 to 1 (Trim start)
  end: number;   // 0 to 1 (Trim end)
  isCustom: boolean;
  stretch?: boolean; // Enable time-invariant pitch shifting
}

export interface SoundConfig {
  genre: string;
  type: InstrumentType;
  name: string;
}

export interface UserSample {
  id: string;
  name: string;
  buffer: AudioBuffer;
  date: number;
}

export interface VariationState {
  volume: number;
  pan: number;
  pitch: number;
  effects: ChannelEffects;
}

export interface Track {
  id: number;
  name: string;
  type: InstrumentType;
  color: string;
  patterns: PatternData[]; // 8 Patterns containing steps & sound params
  activePatternIdx: number; // The currently playing pattern for this track (0-7)
  volume: number;
  pan: number;     // Current live value (synced with active pattern)
  pitch: number;   // Current live value (synced with active pattern)
  variation: number; // Current live value (synced with active pattern)
  muted: boolean;
  effects: ChannelEffects;
  sample?: SampleConfig; // Optional custom sample data
  soundConfig?: SoundConfig; // Optional override for sound engine (Mix & Match genres)
  variationStates: VariationState[]; // Store separate mixer settings for each variation (0-3)
}

export interface TrackStateSnapshot {
  volume: number;
  pan: number;
  pitch: number;
  muted: boolean;
  effects: ChannelEffects;
  soundConfig?: SoundConfig;
  sample?: SampleConfig;
  activePatternIdx: number;
  variation: number;
  color: string;
}

export interface SceneData {
  genre: string;
  bpm: number;
  trackStates: Record<number, TrackStateSnapshot>;
}

export interface SequencerState {
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  selectedTrackId: number;
  swing: number;
}

export type PatternResponse = {
  tracks: {
    name: string;
    steps: number[]; // Array of 0s and 1s
  }[];
  bpm?: number;
  name?: string;
};
