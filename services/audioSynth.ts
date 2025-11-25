
import { InstrumentType, MasterEffectType, Track, Genre, ChannelEffects } from '../types';

interface ChannelStrip {
  input: GainNode;
  // Insert Effects
  bitcrush: WaveShaperNode;
  bitcrushDry: GainNode;
  bitcrushWet: GainNode;
  
  stutterGain: GainNode;
  stutterOsc: OscillatorNode;
  stutterConnected: boolean; // Tracking flag
  
  glitchGain: GainNode;
  glitchOsc: OscillatorNode;
  glitchConnected: boolean; // Tracking flag

  filter: BiquadFilterNode;
  
  // Sends & Output
  reverbSend: GainNode;
  delaySend: GainNode;
  pan: StereoPannerNode;
  volume: GainNode;
}

export type { Genre };

export class AudioSynth {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private activeGenre: Genre = 'TR-909';
  private currentBpm: number = 120;
  
  // Global Send Effects
  private reverbNode: ConvolverNode;
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delayOutput: GainNode;
  private reverbOutput: GainNode;

  // Master Bus FX (Punch-in)
  private masterBusInput: GainNode;
  
  // New FX Nodes
  private masterChopper: GainNode; 
  private masterChopperOsc: OscillatorNode;

  private masterFilter: BiquadFilterNode;
  
  private masterDistortion: WaveShaperNode;
  
  // Dry Path Control
  private masterDryGain: GainNode;

  private masterFXDelay: DelayNode;
  private masterFXDelayFeedback: GainNode;
  private masterFXDelayMix: GainNode;
  
  private masterLFO: OscillatorNode; 
  private masterLFOGain: GainNode;

  private masterMakeupGain: GainNode;

  private globalPitchMultiplier: number = 1.0;
  private globalPitchLFO: OscillatorNode; 
  private globalPitchLFOGain: GainNode;
  
  private activeSources: Map<AudioBufferSourceNode, number> = new Map();

  private channels: Map<number, ChannelStrip> = new Map();
  
  private distortionCurve: Float32Array;
  private hardClipCurve: Float32Array;
  private whiteNoiseBuffer: AudioBuffer;
  private pinkNoiseBuffer: AudioBuffer;
  private brownNoiseBuffer: AudioBuffer;
  private reverbBuffer: AudioBuffer;

  // Parameter Map: [Mix, ParamA, ParamB, Volume] - All normalized 0-1
  // Volume defaults to 1.0 (Unity gain)
  private masterFxParams: Map<MasterEffectType, [number, number, number, number]> = new Map();

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });

    this.distortionCurve = this.makeDistortionCurve(400);
    this.hardClipCurve = this.makeDistortionCurve(2000);
    this.whiteNoiseBuffer = this.createNoiseBuffer('white');
    this.pinkNoiseBuffer = this.createNoiseBuffer('pink');
    this.brownNoiseBuffer = this.createNoiseBuffer('brown');
    this.reverbBuffer = this.createReverbImpulse();
    
    this.masterBusInput = this.ctx.createGain();
    
    this.masterChopper = this.ctx.createGain();
    this.masterChopperOsc = this.ctx.createOscillator();
    this.masterChopperOsc.start();
    
    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 22000; 
    this.masterFilter.Q.value = 0;

    this.masterDistortion = this.ctx.createWaveShaper();
    this.masterDistortion.oversample = 'none';
    this.masterDistortion.curve = new Float32Array([ -1, 1 ]); 

    this.masterDryGain = this.ctx.createGain();
    this.masterDryGain.gain.value = 1.0;

    this.masterFXDelay = this.ctx.createDelay(4.0); 
    this.masterFXDelayFeedback = this.ctx.createGain();
    this.masterFXDelayFeedback.gain.value = 0;
    this.masterFXDelayMix = this.ctx.createGain();
    this.masterFXDelayMix.gain.value = 0; 

    this.masterLFO = this.ctx.createOscillator();
    this.masterLFO.frequency.value = 1; 
    this.masterLFO.type = 'sine';
    this.masterLFOGain = this.ctx.createGain();
    this.masterLFOGain.gain.value = 0;
    this.masterLFO.connect(this.masterLFOGain);
    this.masterLFO.start();

    this.globalPitchLFO = this.ctx.createOscillator();
    this.globalPitchLFO.start();
    this.globalPitchLFOGain = this.ctx.createGain();
    this.globalPitchLFOGain.gain.value = 0;
    this.globalPitchLFO.connect(this.globalPitchLFOGain);

    this.masterMakeupGain = this.ctx.createGain();
    this.masterMakeupGain.gain.value = 1.0;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.95; 
    
    // Optimized Master Compressor for Mobile/Louder Playback
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -8; 
    compressor.knee.value = 10;      
    compressor.ratio.value = 4;      
    compressor.attack.value = 0.01;  
    compressor.release.value = 0.2;

    this.masterBusInput.connect(this.masterChopper);
    this.masterChopper.connect(this.masterFilter);
    this.masterFilter.connect(this.masterDistortion);
    
    this.masterDistortion.connect(this.masterDryGain); 
    this.masterDryGain.connect(this.masterMakeupGain); // Through makeup

    this.masterDistortion.connect(this.masterFXDelay); 
    this.masterFXDelay.connect(this.masterFXDelayFeedback);
    this.masterFXDelayFeedback.connect(this.masterFXDelay);
    this.masterFXDelay.connect(this.masterFXDelayMix);
    this.masterFXDelayMix.connect(this.masterMakeupGain); // Through makeup

    this.masterMakeupGain.connect(this.masterGain);
    this.masterGain.connect(compressor);
    compressor.connect(this.ctx.destination);

    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.reverbBuffer;
    this.reverbOutput = this.ctx.createGain();
    this.reverbOutput.gain.value = 1.0;
    this.reverbNode.connect(this.reverbOutput);
    this.reverbOutput.connect(this.masterBusInput);

    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.value = 0.375; 
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.4;
    this.delayOutput = this.ctx.createGain();
    this.delayOutput.gain.value = 1.0;
    
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayOutput);
    this.delayOutput.connect(this.masterBusInput);
    
    // Initialize Params with defaults: Mix, A, B, Volume
    Object.values(MasterEffectType).forEach(t => {
        this.masterFxParams.set(t as MasterEffectType, [0.8, 0.5, 0.5, 0.8]); // Default vol 0.8 to match overall mix
    });
  }

  public playSilent() {
      if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
      }
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start();
  }
  
  public previewSound(params: { type: InstrumentType, genre: string, sample?: AudioBuffer }) {
      if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
      }
      const dummyTrack: Track = {
          id: -1,
          name: 'PREVIEW',
          type: params.type,
          color: 'gray',
          patterns: [],
          activePatternIdx: 0,
          volume: 0.9,
          pan: 0,
          pitch: 0,
          variation: 0,
          muted: false,
          effects: { 
              reverb: { active: false, value: 0 },
              delay: { active: false, value: 0 },
              filter: { active: false, value: 0 },
              bitcrush: { active: false, value: 0 },
              stutter: { active: false, value: 0 },
              glitch: { active: false, value: 0 }
          } as ChannelEffects,
          variationStates: [],
          sample: params.sample ? { buffer: params.sample, start: 0, end: 1, isCustom: true, stretch: false } : undefined,
          soundConfig: { genre: params.genre, type: params.type, name: 'PREVIEW' }
      };

      this.playSource(dummyTrack, 0, this.masterBusInput);
  }

  public ensureChannel(id: number) {
      if (!this.channels.has(id)) {
          this.createChannelStrip(id);
      }
  }

  public removeChannel(id: number) {
      const strip = this.channels.get(id);
      if (strip) {
          try {
              strip.volume.disconnect();
              strip.reverbSend.disconnect();
              strip.delaySend.disconnect();
              strip.stutterOsc.stop();
              strip.glitchOsc.stop();
          } catch (e) {
              console.warn("Error disconnecting channel", id, e);
          }
          this.channels.delete(id);
      }
  }

  // --- Dynamic FX Params with Volume Support ---

  public setMasterFxParam(type: MasterEffectType, index: 0 | 1 | 2 | 3, value: number) {
      const current = this.masterFxParams.get(type) || [0.8, 0.5, 0.5, 0.8];
      current[index] = value;
      this.masterFxParams.set(type, current);
  }
  
  public getMasterFxParams(type: MasterEffectType): [number, number, number, number] {
      return this.masterFxParams.get(type) || [0.8, 0.5, 0.5, 0.8];
  }

  private makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private createNoiseBuffer(type: 'white' | 'pink' | 'brown'): AudioBuffer {
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    
    if (type === 'white') {
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    } else if (type === 'pink') {
        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168981;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11; 
            b6 = white * 0.115926;
        }
    } else { 
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; 
        }
    }
    return buffer;
  }

  private createReverbImpulse(): AudioBuffer {
      const len = this.ctx.sampleRate * 2.0;
      const buffer = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
      for(let c=0; c<2; c++) {
          const ch = buffer.getChannelData(c);
          for(let i=0; i<len; i++) {
              ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - (i/len), 3);
          }
      }
      return buffer;
  }

  public setGenre(genre: string) {
     this.activeGenre = genre as Genre;
  }

  private updateGlobalPitch(t: number) {
      this.activeSources.forEach((baseRate, source) => {
          try {
              source.playbackRate.setTargetAtTime(baseRate * this.globalPitchMultiplier, t, 0.05);
          } catch(e) {}
      });
  }

  public applyMasterEffects(types: MasterEffectType[]) {
      const t = this.ctx.currentTime;
      const beatTime = 60 / this.currentBpm;

      // --- RESET / DEFAULTS ---
      this.masterDryGain.gain.cancelScheduledValues(t);
      this.masterDryGain.gain.setTargetAtTime(1.0, t, 0.05);
      
      this.masterFXDelayMix.gain.cancelScheduledValues(t);
      this.masterFXDelayMix.gain.setTargetAtTime(0, t, 0.05);
      
      this.masterFXDelayFeedback.gain.cancelScheduledValues(t);
      this.masterFXDelayFeedback.gain.setTargetAtTime(0, t, 0.05);
      
      this.masterFXDelay.delayTime.cancelScheduledValues(t);
      
      this.masterFilter.type = 'lowpass';
      this.masterFilter.frequency.cancelScheduledValues(t);
      this.masterFilter.frequency.setTargetAtTime(22000, t, 0.1);
      this.masterFilter.Q.cancelScheduledValues(t);
      this.masterFilter.Q.setTargetAtTime(0, t, 0.1);

      this.masterDistortion.curve = new Float32Array([-1, 1]);

      try { this.masterChopperOsc.disconnect(); } catch (e) {}
      this.masterChopper.gain.cancelScheduledValues(t);
      this.masterChopper.gain.setTargetAtTime(1.0, t, 0.05);

      try { this.masterLFOGain.disconnect(); } catch (e) {}
      try { this.globalPitchLFOGain.disconnect(); } catch (e) {}
      
      this.activeSources.forEach((_, source) => {
          try { this.globalPitchLFOGain.disconnect(source.playbackRate); } catch(e) {}
      });

      this.globalPitchMultiplier = 1.0;
      
      // Reset volume to unity before applying effect volume
      this.masterMakeupGain.gain.cancelScheduledValues(t);
      this.masterMakeupGain.gain.setTargetAtTime(1.0, t, 0.1);

      if (types.length === 0 || types.includes(MasterEffectType.NO_EFFECT)) {
          this.updateGlobalPitch(t);
          return;
      }

      const setupLFO = (type: OscillatorType, freq: number, gain: number, target: AudioParam) => {
          this.masterLFO.type = type;
          this.masterLFO.frequency.setValueAtTime(freq, t);
          this.masterLFOGain.gain.setValueAtTime(gain, t);
          try { this.masterLFOGain.disconnect(); } catch(e){}
          this.masterLFOGain.connect(target);
      };

      const setupPitchLFO = (wave: OscillatorType, freq: number, depth: number) => {
          this.globalPitchLFO.type = wave;
          this.globalPitchLFO.frequency.setValueAtTime(freq, t);
          this.globalPitchLFOGain.gain.setValueAtTime(depth, t);
          
          this.activeSources.forEach((_, source) => {
              try { this.globalPitchLFOGain.connect(source.playbackRate); } catch(e){}
          });
      };
      
      const priorityType = types[types.length - 1];
      const params = this.getMasterFxParams(priorityType);
      const [mix, pA, pB, vol] = params;

      // Apply Volume Parameter to Master Makeup Gain
      // Scale: 0.0 -> 2.0 (200%)
      const outputGain = vol * 2.0; 
      this.masterMakeupGain.gain.setTargetAtTime(outputGain, t, 0.05);

      types.forEach(type => {
          // Note: In a multi-FX scenario, we currently just use parameters from the priority effect
          // or re-fetch. For specific multi-stacking, we'd need more complex logic.
          // For now, we assume the user is tweaking the focused/priority effect parameters.
          const [effMix, effA, effB] = (type === priorityType) ? [mix, pA, pB] : this.getMasterFxParams(type);
          
          switch (type) {
              case MasterEffectType.HALF_RATE:
                  this.masterFilter.type = 'lowpass';
                  const freq = 100 + (effA * 4900); // A: Freq
                  this.masterFilter.frequency.setTargetAtTime(freq, t, 0.05);
                  this.masterFilter.Q.value = effB * 20; // B: Resonance
                  this.masterChopperOsc.type = 'square';
                  this.masterChopperOsc.frequency.setValueAtTime(this.ctx.sampleRate / 32, t);
                  this.masterDistortion.curve = this.makeDistortionCurve(20 * effMix);
                  break;

              case MasterEffectType.DISTORTION:
                  // A: Tone (Filter), B: Drive
                  this.masterDistortion.curve = this.makeDistortionCurve(50 + (effB * 2000)); 
                  this.masterFilter.type = 'lowpass';
                  this.masterFilter.frequency.setValueAtTime(200 + (effA * 20000), t);
                  this.masterFilter.Q.value = 2;
                  break;

              case MasterEffectType.SQUASH:
                  // A: Threshold/Amount implied by mix, B: Output Gain boost
                  this.masterDistortion.curve = this.makeDistortionCurve(5 + (effA * 100));
                  this.masterMakeupGain.gain.setTargetAtTime(outputGain * (1 + effB * 2), t, 0.05);
                  break;

              case MasterEffectType.ECHO_FADE:
                  // A: Time, B: Feedback
                  const echoTime = beatTime * (0.1 + (effA * 0.9));
                  this.masterFXDelay.delayTime.setValueAtTime(echoTime, t);
                  this.masterFXDelayFeedback.gain.setValueAtTime(effB * 0.95, t);
                  this.masterFXDelayMix.gain.setTargetAtTime(effMix, t, 0.02);
                  this.masterFilter.type = 'highpass';
                  this.masterFilter.frequency.setTargetAtTime(600, t, 0.5);
                  break;

              case MasterEffectType.PITCH_LFO: 
                  // A: Speed, B: Depth
                  this.masterFXDelay.delayTime.setValueAtTime(0.02, t);
                  this.masterFXDelayMix.gain.setTargetAtTime(1.0, t, 0.01); 
                  this.masterDryGain.gain.setTargetAtTime(0.5, t, 0.02);
                  setupLFO('sine', 0.5 + (effA * 15), 0.001 + (effB * 0.008), this.masterFXDelay.delayTime);
                  break;

              case MasterEffectType.EQ_SWEEP:
                  // A: Speed, B: Resonance
                  this.masterFilter.type = 'bandpass';
                  this.masterFilter.Q.value = 1 + (effB * 15);
                  setupLFO('sine', 0.1 + (effA * 8), 3000, this.masterFilter.frequency);
                  this.masterFilter.frequency.setValueAtTime(1000, t);
                  break;

              case MasterEffectType.MEGA_MORPH:
                  // A: Rate, B: Filter Q
                  this.masterFilter.type = 'lowpass';
                  this.masterFilter.Q.value = effB * 20;
                  setupLFO('sawtooth', 1 + (effA * 20), 1000, this.masterFilter.frequency);
                  this.masterFilter.frequency.setValueAtTime(1500, t);
                  this.masterChopperOsc.type = 'square';
                  this.masterChopperOsc.frequency.setValueAtTime(12, t);
                  this.masterChopperOsc.connect(this.masterChopper.gain);
                  break;

              case MasterEffectType.PITCH_UP: 
                  // A: Rise Speed, B: Feedback
                  this.masterFXDelayMix.gain.setValueAtTime(effMix, t);
                  this.masterFXDelayFeedback.gain.setValueAtTime(effB * 0.9, t);
                  this.masterFXDelay.delayTime.setValueAtTime(0.05, t);
                  const riseDuration = 2.0 - (effA * 1.9); // Faster rise with higher A
                  this.masterFXDelay.delayTime.linearRampToValueAtTime(0.001, t + riseDuration);
                  this.masterDryGain.gain.setTargetAtTime(0, t, 0.1);
                  break;

              case MasterEffectType.PUNCH:
                  // A: Freq, B: Gain Cut/Boost intensity
                  this.masterFilter.type = 'peaking';
                  this.masterFilter.frequency.value = 40 + (effA * 200);
                  this.masterFilter.gain.value = -12 * effB; // Cut bass
                  this.masterFilter.Q.value = 1;
                  // Punch usually means boosting the transient, here we simulate by cutting mud and boosting volume
                  this.masterMakeupGain.gain.value = outputGain * (1 + effB);
                  break;

              case MasterEffectType.QUANTISE_6_8:
                   // A: Filter, B: Res
                  this.masterFilter.type = 'lowpass';
                  this.masterFilter.frequency.value = 100 + (effA * 10000);
                  this.masterFilter.Q.value = effB * 10;
                  this.masterChopperOsc.type = 'square';
                  const tripFreq = (this.currentBpm / 60) * 3; 
                  this.masterChopperOsc.frequency.setValueAtTime(tripFreq, t);
                  this.masterChopperOsc.connect(this.masterChopper.gain);
                  break;

              case MasterEffectType.BEAT_REPEAT:
                  // A: Feedback, B: Filter
                  this.masterFXDelay.delayTime.setValueAtTime(beatTime / 2, t);
                  this.masterFXDelayFeedback.gain.setValueAtTime(0.9 * effA, t);
                  this.masterFXDelayMix.gain.setValueAtTime(effMix, t);
                  this.masterFilter.type = 'highpass';
                  this.masterFilter.frequency.value = effB * 2000;
                  break;

              case MasterEffectType.BEAT_REPEAT_FAST:
                  // A: Feedback, B: Filter
                  this.masterFXDelay.delayTime.setValueAtTime(beatTime / 8, t);
                  this.masterFXDelayFeedback.gain.setValueAtTime(0.9 * effA, t);
                  this.masterFXDelayMix.gain.setValueAtTime(effMix, t);
                  this.masterFilter.type = 'lowpass';
                  this.masterFilter.frequency.value = 22000 - (effB * 20000);
                  break;

              case MasterEffectType.FM:
                  // A: Mod Freq, B: Filter
                  this.masterChopperOsc.type = 'sine';
                  this.masterChopperOsc.frequency.setValueAtTime(20 + (effA * 2000), t);
                  this.masterChopperOsc.connect(this.masterChopper.gain);
                  this.masterFilter.type = 'highpass';
                  this.masterFilter.frequency.value = 2000 * effB;
                  break;

              case MasterEffectType.GRANULAR:
                  // A: Grain Size (LFO Freq), B: Feedback
                  this.masterFXDelayMix.gain.setValueAtTime(effMix, t);
                  this.masterFXDelayFeedback.gain.setValueAtTime(0.9 * effB, t);
                  setupLFO('sawtooth', 5 + (effA * 60), 0.05, this.masterFXDelay.delayTime);
                  break;

              case MasterEffectType.REVERSE: 
                  // A: Chop Speed, B: Filter
                  this.masterChopperOsc.type = 'sawtooth'; 
                  const chopRate = (this.currentBpm / 60) * (1 + Math.floor(effA * 4));
                  this.masterChopperOsc.frequency.setValueAtTime(chopRate, t);
                  this.masterChopperOsc.connect(this.masterChopper.gain);
                  this.masterFilter.type = 'lowpass';
                  this.masterFilter.frequency.value = 22000 - (effB * 15000);
                  break;

              case MasterEffectType.BOUNCING:
                  // A: Speed (Delay Time), B: Decay (Feedback)
                  this.masterFXDelayMix.gain.setValueAtTime(effMix, t);
                  this.masterFXDelayFeedback.gain.setValueAtTime(effB * 0.95, t);
                  this.masterFXDelay.delayTime.setValueAtTime(0.2 - (effA * 0.15), t);
                  this.masterFXDelay.delayTime.exponentialRampToValueAtTime(0.01, t + 2.0);
                  break;

              case MasterEffectType.LOOP_16:
                  // A: Filter, B: Feedback
                  this.masterDryGain.gain.setTargetAtTime(1.0 - effMix, t, 0.01); 
                  this.masterFXDelayMix.gain.setValueAtTime(effMix, t);
                  this.masterFXDelayFeedback.gain.setValueAtTime(effB * 0.95, t); 
                  this.masterFXDelay.delayTime.setValueAtTime(beatTime / 4, t);
                  this.masterFilter.type = 'lowpass';
                  this.masterFilter.frequency.value = 22000 - (effA * 20000);
                  break;
              
              case MasterEffectType.LOOP_12:
                   // A: Filter, B: Feedback
                  this.masterDryGain.gain.setTargetAtTime(1.0 - effMix, t, 0.01);
                  this.masterFXDelayMix.gain.setValueAtTime(effMix, t);
                  this.masterFXDelayFeedback.gain.setValueAtTime(effB * 0.95, t);
                  this.masterFXDelay.delayTime.setValueAtTime(beatTime / 3, t);
                  this.masterFilter.type = 'highpass';
                  this.masterFilter.frequency.value = effA * 3000;
                  break;

              case MasterEffectType.LOOP_SHORT:
                  // A: Filter, B: Feedback
                  this.masterDryGain.gain.setTargetAtTime(1.0 - effMix, t, 0.01);
                  this.masterFXDelayMix.gain.setValueAtTime(effMix, t);
                  this.masterFXDelayFeedback.gain.setValueAtTime(effB * 0.95, t);
                  this.masterFXDelay.delayTime.setValueAtTime(beatTime / 8, t);
                  this.masterFilter.type = 'bandpass';
                  this.masterFilter.frequency.value = 200 + (effA * 3000);
                  this.masterFilter.Q.value = 1;
                  break;

              case MasterEffectType.LOOP_SHORTER:
                  // A: Filter, B: Feedback
                  this.masterDryGain.gain.setTargetAtTime(1.0 - effMix, t, 0.01);
                  this.masterFXDelayMix.gain.setValueAtTime(effMix, t);
                  this.masterFXDelayFeedback.gain.setValueAtTime(effB * 0.99, t);
                  this.masterFXDelay.delayTime.setValueAtTime(beatTime / 16, t);
                  this.masterFilter.type = 'peaking';
                  this.masterFilter.frequency.value = 1000;
                  this.masterFilter.gain.value = 20 * effA;
                  break;

              case MasterEffectType.UNISON:
                  // A: Detune Speed, B: Detune Depth
                  this.masterFXDelayMix.gain.setValueAtTime(effMix * 0.5, t); 
                  this.masterFXDelay.delayTime.setValueAtTime(0.025, t); 
                  setupLFO('sine', 0.5 + (effA * 10), 0.001 + (effB * 0.005), this.masterFXDelay.delayTime); 
                  break;

              case MasterEffectType.UNISON_LOW:
                  // A: Cutoff, B: Detune Amount
                  this.globalPitchMultiplier = 0.75; // Minor 3rd down approx
                  this.masterFXDelayMix.gain.setValueAtTime(effMix * 0.6, t);
                  this.masterFXDelay.delayTime.setValueAtTime(0.04 + (effB * 0.01), t); 
                  this.masterFilter.type = 'lowpass';
                  this.masterFilter.frequency.setValueAtTime(400 + (effA * 5000), t);
                  break;

              case MasterEffectType.OCTAVE_UP:
                  this.globalPitchMultiplier = 2.0;
                  // A: Filter
                  this.masterFilter.type = 'highpass';
                  this.masterFilter.frequency.setValueAtTime(effA * 1000, t);
                  break;

              case MasterEffectType.OCTAVE_DOWN:
                  this.globalPitchMultiplier = 0.5;
                  // A: Filter
                  this.masterFilter.type = 'lowpass';
                  this.masterFilter.frequency.setValueAtTime(20000 - (effA * 19000), t);
                  break;

              case MasterEffectType.STUTTER_4:
                  // A: Filter Cutoff, B: Resonance
                  this.masterChopperOsc.type = 'square';
                  this.masterChopperOsc.frequency.setValueAtTime((this.currentBpm / 60) * 4, t); 
                  this.masterChopperOsc.connect(this.masterChopper.gain);
                  this.masterFilter.type = 'lowpass';
                  this.masterFilter.frequency.setValueAtTime(200 + (effA * 20000), t);
                  this.masterFilter.Q.value = effB * 15;
                  break;

              case MasterEffectType.STUTTER_3:
                  // A: Filter Cutoff, B: Noise/Crush (Simulated by high resonance peak)
                  this.masterChopperOsc.type = 'square';
                  this.masterChopperOsc.frequency.setValueAtTime((this.currentBpm / 60) * 3, t); 
                  this.masterChopperOsc.connect(this.masterChopper.gain);
                  this.masterFilter.type = 'highpass';
                  this.masterFilter.frequency.setValueAtTime(effA * 5000, t);
                  this.masterFilter.Q.value = effB * 20;
                  break;

              case MasterEffectType.SCRATCH:
                  // A: Speed, B: Depth
                  setupPitchLFO('sawtooth', 2 + (effA * 10), 0.2 + (effB * 0.8)); 
                  break;

              case MasterEffectType.SCRATCH_FAST:
                  // A: Speed, B: Depth
                  setupPitchLFO('triangle', 6 + (effA * 14), 0.5 + (effB * 0.5)); 
                  break;

              case MasterEffectType.RETRIGGER:
                  // A: Speed, B: Feedback
                  this.masterFXDelay.delayTime.setValueAtTime(beatTime / 4, t);
                  this.masterFXDelayFeedback.gain.setValueAtTime(0.8 * effB, t);
                  this.masterFXDelayMix.gain.setValueAtTime(effMix, t);
                  const lfoRate = 4 + (effA * 12);
                  setupLFO('square', lfoRate, 0.05, this.masterFXDelay.delayTime);
                  break;
          }
      });
      
      this.updateGlobalPitch(t);
  }

  public async renderPreview(track: Track): Promise<AudioBuffer> {
    const length = 44100 * 0.5; 
    const offlineCtx = new OfflineAudioContext(1, length, 44100);
    const dest = offlineCtx.createGain();
    dest.connect(offlineCtx.destination);
    
    this.playSource(track, 0, dest, offlineCtx);
    return await offlineCtx.startRendering();
  }

  private createChannelStrip(id: number) {
    if (this.channels.has(id)) return;

    const input = this.ctx.createGain();

    const bitcrush = this.ctx.createWaveShaper();
    bitcrush.oversample = 'none';
    const bitcrushDry = this.ctx.createGain();
    const bitcrushWet = this.ctx.createGain();

    bitcrushDry.gain.value = 1;
    bitcrushWet.gain.value = 0;

    const stutterGain = this.ctx.createGain();
    const stutterOsc = this.ctx.createOscillator();
    stutterOsc.type = 'square';
    stutterOsc.frequency.value = 0; 
    stutterOsc.start();

    const glitchGain = this.ctx.createGain();
    const glitchOsc = this.ctx.createOscillator();
    glitchOsc.type = 'sawtooth';
    glitchOsc.frequency.value = 0;
    glitchOsc.start();

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 22000;

    const reverbSend = this.ctx.createGain();
    const delaySend = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner();
    const volume = this.ctx.createGain();

    reverbSend.gain.value = 0;
    delaySend.gain.value = 0;
    volume.gain.value = 0.8;
    
    input.connect(bitcrushDry);
    input.connect(bitcrush);
    bitcrush.connect(bitcrushWet);
    
    bitcrushDry.connect(stutterGain);
    bitcrushWet.connect(stutterGain);

    stutterGain.connect(glitchGain);
    glitchGain.connect(filter);
    
    filter.connect(reverbSend);
    filter.connect(delaySend);
    filter.connect(pan);
    pan.connect(volume);
    volume.connect(this.masterBusInput); 

    reverbSend.connect(this.reverbNode);
    delaySend.connect(this.delayNode);

    this.channels.set(id, { 
        input, 
        bitcrush, bitcrushDry, bitcrushWet,
        stutterGain, stutterOsc, stutterConnected: false,
        glitchGain, glitchOsc, glitchConnected: false,
        filter, 
        reverbSend, delaySend, pan, volume 
    });
  }

  public async resume() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public getContext() {
    return this.ctx;
  }

  public updateBpm(bpm: number) {
    this.currentBpm = bpm;
    const beatTime = 60 / bpm;
    const delayTime = beatTime * 0.75;
    this.delayNode.delayTime.setTargetAtTime(delayTime, this.ctx.currentTime, 0.1);
  }

  public updateTrackParameters(track: Track, time?: number) {
    this.ensureChannel(track.id);

    const strip = this.channels.get(track.id);
    if (!strip) return;
    const t = time || this.ctx.currentTime;

    const targetVolume = track.muted ? 0 : track.volume;
    strip.volume.gain.setTargetAtTime(targetVolume, t, 0.02);
    strip.pan.pan.setTargetAtTime(track.pan, t, 0.02);

    if (track.effects.filter.active) {
        const val = Math.max(0.001, track.effects.filter.value); 
        const freq = 20 * Math.pow(1000, val); 
        strip.filter.frequency.setTargetAtTime(freq, t, 0.05);
        strip.filter.Q.value = 2; 
    } else {
        strip.filter.frequency.setTargetAtTime(22000, t, 0.05);
        strip.filter.Q.value = 0;
    }

    if (track.effects.bitcrush.active) {
        strip.bitcrush.curve = this.distortionCurve;
        const wet = track.effects.bitcrush.value;
        strip.bitcrushDry.gain.setTargetAtTime(1 - wet, t, 0.02);
        strip.bitcrushWet.gain.setTargetAtTime(wet, t, 0.02);
    } else {
        strip.bitcrushDry.gain.setTargetAtTime(1, t, 0.02);
        strip.bitcrushWet.gain.setTargetAtTime(0, t, 0.02);
    }

    this.updateModulator(strip, 'stutter', track.effects.stutter.active, track.effects.stutter.value, 3, 24, 'square', t);
    this.updateModulator(strip, 'glitch', track.effects.glitch.active, track.effects.glitch.value, 20, 800, 'sawtooth', t);

    strip.reverbSend.gain.setTargetAtTime(track.effects.reverb.active ? track.effects.reverb.value : 0, t, 0.02);
    strip.delaySend.gain.setTargetAtTime(track.effects.delay.active ? track.effects.delay.value : 0, t, 0.02);
  }

  private updateModulator(strip: ChannelStrip, type: 'stutter' | 'glitch', active: boolean, value: number, minFreq: number, maxFreq: number, oscType: OscillatorType, time?: number) {
      const t = time || this.ctx.currentTime;
      const osc = type === 'stutter' ? strip.stutterOsc : strip.glitchOsc;
      const targetGain = type === 'stutter' ? strip.stutterGain : strip.glitchGain;
      const isConnected = type === 'stutter' ? strip.stutterConnected : strip.glitchConnected;

      if (targetGain.context !== this.ctx) return;

      if (active) {
         const freq = minFreq + (value * (maxFreq - minFreq));
         osc.frequency.setTargetAtTime(freq, t, 0.02);
         osc.type = oscType;
         
         if (!isConnected) {
            try { osc.connect(targetGain.gain); } catch(e) {}
            if (type === 'stutter') strip.stutterConnected = true;
            else strip.glitchConnected = true;
         }
      } else {
         if (isConnected) {
            try { osc.disconnect(); } catch(e) {}
            if (type === 'stutter') strip.stutterConnected = false;
            else strip.glitchConnected = false;
            
            targetGain.gain.cancelScheduledValues(t); 
            targetGain.gain.setValueAtTime(1.0, t); 
         }
      }
  }

  public trigger(track: Track, time: number = 0) {
    this.ensureChannel(track.id);
    const t = time || this.ctx.currentTime;
    const strip = this.channels.get(track.id);
    if (!strip) return;
    
    this.playSource(track, t, strip.input);
  }

  public playClick(time: number, strong: boolean) {
    const t = time || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(strong ? 1500 : 800, t);
    osc.type = 'square';
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain); gain.connect(this.masterBusInput); 
    osc.start(t); osc.stop(t + 0.05);
  }

  private playSource(track: Track, t: number, dest: AudioNode, specificContext?: BaseAudioContext) {
     if (track.name.toUpperCase() === 'EMPTY' || (track.soundConfig && track.soundConfig.name.toUpperCase() === 'EMPTY')) {
         return;
     }

     const ctx = specificContext || dest.context;
     const trimGate = ctx.createGain();
     trimGate.connect(dest);
     
     const isSample = track.sample?.isCustom && track.sample.buffer;
     
     if (isSample) {
         if (track.sample?.stretch) {
             this.playGranularSample(track, t, trimGate);
         } else {
             this.playCustomSample(track, t, trimGate);
         }
         return; 
     }

     const duration = 1.0; 
     const sampleStart = track.sample?.start || 0;
     const sampleEnd = track.sample?.end || 1;
     
     if (sampleStart > 0 || sampleEnd < 1) {
         const startTime = t + (duration * sampleStart * 0.5);
         const endTime = t + (duration * sampleEnd);

         if (sampleStart > 0) {
             trimGate.gain.setValueAtTime(0, t);
             trimGate.gain.setValueAtTime(1, startTime);
         } else {
             trimGate.gain.setValueAtTime(1, t);
         }
         
         if (sampleEnd < 1) {
             trimGate.gain.setValueAtTime(0, endTime);
         }
     } else {
         trimGate.gain.setValueAtTime(1, t);
     }

     const synthDest = trimGate;
     let globalPitchShift = 0;
     if (this.globalPitchMultiplier >= 1.9) globalPitchShift = 1.0; 
     else if (this.globalPitchMultiplier <= 0.6) globalPitchShift = -1.0; 
     else if (this.globalPitchMultiplier === 0.75) globalPitchShift = -0.5; 

     const { variation, pitch } = track;
     const effectivePitch = pitch + globalPitchShift;
     const vol = 1.0;

     const type = track.soundConfig?.type || track.type;
     const genre = (track.soundConfig?.genre as Genre) || this.activeGenre;

     if (genre === 'ETHNIC-WORLD') {
         if (type === InstrumentType.FX) { this.dispatchBird(t, vol, effectivePitch, variation, synthDest); return; }
         if (type === InstrumentType.CHORD) { this.dispatchFlute(t, vol, effectivePitch, variation, synthDest); return; }
         if (type === InstrumentType.LASER) { this.dispatchBird(t, vol * 1.2, effectivePitch + 0.5, variation, synthDest); return; }
     }

     switch (type) {
      case InstrumentType.KICK: 
          this.dispatchKick(t, vol, effectivePitch, variation, synthDest, genre); 
          break;
      case InstrumentType.SNARE: 
          this.dispatchSnare(t, vol, effectivePitch, variation, synthDest, genre); 
          break;
      case InstrumentType.HIHAT_CLOSED: 
          this.dispatchHat(t, vol, effectivePitch, variation, synthDest, false, genre); 
          break;
      case InstrumentType.HIHAT_OPEN: 
          this.dispatchHat(t, vol, effectivePitch, variation, synthDest, true, genre); 
          break;
      case InstrumentType.CLAP: 
          this.dispatchClap(t, vol, effectivePitch, variation, synthDest, genre); 
          break;
      case InstrumentType.BASS:
          this.dispatchBass(t, vol, effectivePitch, variation, synthDest, genre);
          break;
      case InstrumentType.TOM_LOW:
      case InstrumentType.TOM_HI:
          if (['TR-909', 'TR-808', 'MEMPHIS', 'JUNGLE', 'GABBER', 'HARDSTYLE', 'DUBSTEP'].includes(genre) && type === InstrumentType.TOM_LOW) {
              this.dispatchKick(t, vol * 0.9, effectivePitch - 0.3, (variation + 1) % 4, synthDest, genre);
          } else {
              this.dispatchTom(t, type === InstrumentType.TOM_LOW ? 100 : 200, vol, effectivePitch, variation, synthDest);
          }
          break;
      case InstrumentType.COWBELL:
          this.dispatchCowbell(t, vol, effectivePitch, variation, synthDest);
          break;
      default:
          this.dispatchSynth(t, vol, effectivePitch, variation, synthDest, type, genre);
          break;
    }
  }

  private playCustomSample(track: Track, t: number, dest: AudioNode) {
      if (!track.sample || !track.sample.buffer) return;
      
      const ctx = dest.context;
      const source = ctx.createBufferSource();
      source.buffer = track.sample.buffer;
      
      const baseRate = Math.pow(2, track.pitch);
      source.playbackRate.value = baseRate * this.globalPitchMultiplier;
      
      if (ctx === this.ctx) {
          this.activeSources.set(source, baseRate);
          try { this.globalPitchLFOGain.connect(source.playbackRate); } catch(e) {}
          source.onended = () => { this.activeSources.delete(source); };
      }

      const bufferDuration = track.sample.buffer.duration;
      const startOffset = Math.max(0, Math.min(bufferDuration, track.sample.start * bufferDuration));
      const endOffset = Math.max(startOffset, Math.min(bufferDuration, track.sample.end * bufferDuration));
      const duration = (endOffset - startOffset); 

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.005); 
      
      const rate = Math.abs(source.playbackRate.value) || 1;
      const realDuration = duration / rate;

      env.gain.setValueAtTime(1, t + realDuration - 0.01);
      env.gain.linearRampToValueAtTime(0, t + realDuration); 

      source.connect(env);
      env.connect(dest);
      
      source.start(t, startOffset, duration);
  }

  private playGranularSample(track: Track, t: number, dest: AudioNode) {
      if (!track.sample || !track.sample.buffer) return;
      const ctx = dest.context;
      const buffer = track.sample.buffer;
      
      const trimStart = track.sample.start * buffer.duration;
      const trimEnd = track.sample.end * buffer.duration;
      const duration = trimEnd - trimStart;
      
      if (duration <= 0.01) return;

      const grainSize = 0.05; 
      const overlap = 0.5; 
      const spacing = grainSize * overlap; 
      
      const pitchRate = Math.pow(2, track.pitch) * this.globalPitchMultiplier;
      const maxDuration = 4.0;
      const playDuration = Math.min(duration, maxDuration);
      
      for (let time = 0; time < playDuration; time += spacing) {
          const grainStartAt = t + time;
          const bufferOffset = trimStart + time;
          if (bufferOffset + grainSize > buffer.duration) break;
          
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.value = pitchRate;
          
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, grainStartAt);
          gain.gain.linearRampToValueAtTime(1.0, grainStartAt + (grainSize / 2));
          gain.gain.linearRampToValueAtTime(0, grainStartAt + grainSize);
          
          source.connect(gain);
          gain.connect(dest);
          source.start(grainStartAt, bufferOffset, grainSize);
      }
  }

  private dispatchKick(t: number, vol: number, pitch: number, variation: number, dest: AudioNode, genre: Genre) {
      switch(genre) {
          case 'TR-808': this.kick808(t, vol, pitch, variation, dest); break;
          case 'TR-909': this.kick909(t, vol, pitch, variation, dest); break;
          case 'TR-707': this.kick707(t, vol, pitch, variation, dest); break;
          case 'LINN-DRUM': this.kickLinn(t, vol, pitch, variation, dest); break;
          case 'JUNGLE': this.kickDnB(t, vol, pitch, variation, dest); break;
          case 'MEMPHIS': this.kick808(t, vol * 1.2, pitch - 0.1, 3, dest); break; 
          case 'GOA': this.kickPsy(t, vol, pitch, variation, dest); break;
          case 'ETHNIC-WORLD': this.kickEthnic(t, vol, pitch, variation, dest); break;
          case 'GABBER': this.kickGabber(t, vol, pitch, variation, dest); break;
          case 'ACID': this.kick909(t, vol, pitch, variation, dest); break;
          case 'UK-GARAGE': this.kickUKG(t, vol, pitch, variation, dest); break;
          case 'EURO-DANCE': this.kick909(t, vol, pitch, variation, dest); break;
          case 'HARDSTYLE': this.kickGabber(t, vol, pitch, variation, dest); break;
          case 'DUBSTEP': this.kickDnB(t, vol, pitch, variation, dest); break;
          default: this.kick909(t, vol, pitch, variation, dest); break;
      }
  }

  private dispatchSnare(t: number, vol: number, pitch: number, variation: number, dest: AudioNode, genre: Genre) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const noise = ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      
      const noiseFreq = 1500 * Math.pow(2, pitch * 1.2);
      noiseFilter.frequency.value = Math.min(22000, noiseFreq);
      
      const noiseGain = ctx.createGain();

      const baseFreq = 200 * Math.pow(2, pitch);
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.1);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      noiseGain.gain.setValueAtTime(vol * 0.8, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      osc.connect(gain);
      gain.connect(dest);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(dest);

      osc.start(t); osc.stop(t + 0.3);
      noise.start(t); noise.stop(t + 0.3);
  }

  private dispatchHat(t: number, vol: number, pitch: number, variation: number, dest: AudioNode, open: boolean, genre: Genre) {
      const ctx = dest.context;
      const noise = ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;
      const filter = ctx.createBiquadFilter();
      
      filter.type = 'bandpass';
      filter.Q.value = 0.5;
      
      const baseFreq = 8000 * Math.pow(2, pitch);
      filter.frequency.value = Math.min(20000, baseFreq);

      const gain = ctx.createGain();
      
      const decay = open ? 0.4 : 0.05;
      
      gain.gain.setValueAtTime(vol * 0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + decay);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      noise.start(t); noise.stop(t + decay + 0.1);
  }

  private dispatchClap(t: number, vol: number, pitch: number, variation: number, dest: AudioNode, genre: Genre) {
     const ctx = dest.context;
     const noise = ctx.createBufferSource();
     noise.buffer = this.whiteNoiseBuffer;
     const filter = ctx.createBiquadFilter();
     filter.type = 'bandpass';
     
     const baseFreq = 1200 * Math.pow(2, pitch);
     filter.frequency.value = Math.min(20000, baseFreq);

     const gain = ctx.createGain();

     gain.gain.setValueAtTime(0, t);
     gain.gain.linearRampToValueAtTime(vol, t + 0.01);
     gain.gain.linearRampToValueAtTime(0, t + 0.02);
     gain.gain.linearRampToValueAtTime(vol, t + 0.03);
     gain.gain.linearRampToValueAtTime(0, t + 0.04);
     gain.gain.linearRampToValueAtTime(vol, t + 0.05);
     gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

     noise.connect(filter);
     filter.connect(gain);
     gain.connect(dest);
     noise.start(t); noise.stop(t + 0.2);
  }

  private dispatchBass(t: number, vol: number, pitch: number, variation: number, dest: AudioNode, genre: Genre) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      const freq = 55 * Math.pow(2, pitch);
      
      osc.type = genre === 'ACID' ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + 0.2);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(t); osc.stop(t + 0.5);
  }

  private dispatchTom(t: number, freq: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.setValueAtTime(freq * Math.pow(2, pitch), t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.2);
      
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t); osc.stop(t + 0.2);
  }

  private dispatchCowbell(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'square';
      osc2.type = 'square';
      
      const f = 500 * Math.pow(2, pitch);
      osc1.frequency.value = f;
      osc2.frequency.value = f * 1.5;

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(dest);
      osc1.start(t); osc2.start(t);
      osc1.stop(t+0.3); osc2.stop(t+0.3);
  }

  private dispatchSynth(t: number, vol: number, pitch: number, variation: number, dest: AudioNode, type: InstrumentType, genre: Genre) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440 * Math.pow(2, pitch), t);
      
      gain.gain.setValueAtTime(vol * 0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t); osc.stop(t + 0.3);
  }

  private dispatchBird(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, t);
      osc.frequency.linearRampToValueAtTime(2000, t + 0.1);
      osc.frequency.linearRampToValueAtTime(500, t + 0.2);
      
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t); osc.stop(t + 0.2);
  }

  private dispatchFlute(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440 * Math.pow(2, pitch), t);
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.1);
      gain.gain.linearRampToValueAtTime(0, t + 0.5);
      
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t); osc.stop(t + 0.5);
  }

  private kick909(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const baseFreq = 150 * Math.pow(2, pitch);

      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
      
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.frequency.value = 1000;
      clickGain.gain.setValueAtTime(vol, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
      click.connect(clickGain);
      clickGain.connect(dest);
      
      osc.connect(gain);
      gain.connect(dest);
      
      osc.start(t); osc.stop(t + 0.3);
      click.start(t); click.stop(t + 0.02);
  }

  private kick808(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const baseFreq = 60 * Math.pow(2, pitch);

      osc.frequency.setValueAtTime(baseFreq * 2, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.05);
      
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      
      osc.connect(gain);
      gain.connect(dest);
      
      osc.start(t); osc.stop(t + 0.8);
  }
  
  private kick707(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
     this.kick909(t, vol, pitch, variation, dest); 
  }

  private kickLinn(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
     this.kick909(t, vol, pitch, variation, dest); 
  }
  
  private kickDnB(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
     this.kick909(t, vol, pitch + 0.2, variation, dest);
  }

  private kickPsy(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
     const ctx = dest.context;
     const osc = ctx.createOscillator();
     const gain = ctx.createGain();
     osc.frequency.setValueAtTime(1000, t);
     osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
     gain.gain.setValueAtTime(vol, t);
     gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
     osc.connect(gain);
     gain.connect(dest);
     osc.start(t); osc.stop(t+0.1);
  }

  private kickEthnic(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
     this.kick808(t, vol, pitch, variation, dest);
  }

  private kickGabber(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
     const ctx = dest.context;
     const dist = ctx.createWaveShaper();
     dist.curve = this.hardClipCurve;
     const distGain = ctx.createGain();
     distGain.connect(dest);
     dist.connect(distGain);
     this.kick909(t, vol, pitch, variation, dist);
  }

  private kickUKG(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
     this.kick909(t, vol, pitch + 0.1, variation, dest);
  }
}
