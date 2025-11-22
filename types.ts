
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
