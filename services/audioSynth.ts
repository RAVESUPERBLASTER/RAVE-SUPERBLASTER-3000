
import { InstrumentType, Track } from '../types';

interface ChannelStrip {
  input: GainNode;
  // Insert Effects
  bitcrush: WaveShaperNode;
  bitcrushDry: GainNode;
  bitcrushWet: GainNode;
  
  stutterGain: GainNode;
  stutterOsc: OscillatorNode;
  
  glitchGain: GainNode;
  glitchOsc: OscillatorNode;

  filter: BiquadFilterNode;
  
  // Sends & Output
  reverbSend: GainNode;
  delaySend: GainNode;
  pan: StereoPannerNode;
  volume: GainNode;
}

export type Genre = 'TR-909' | 'TR-808' | 'TR-707' | 'LINN-DRUM' | 'JUNGLE' | 'MEMPHIS' | 'GOA' | 'ETHNIC-WORLD' | 'GABBER' | 'ACID' | 'UK-GARAGE' | 'EURO-DANCE' | 'HARDSTYLE' | 'DUBSTEP';

export class AudioSynth {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private activeGenre: Genre = 'TR-909';
  
  // Global Effects
  private reverbNode: ConvolverNode;
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delayOutput: GainNode;
  private reverbOutput: GainNode;

  // Channel Strips (one per track ID)
  private channels: Map<number, ChannelStrip> = new Map();
  
  // Cached Buffers & Curves
  private distortionCurve: Float32Array;
  private hardClipCurve: Float32Array;
  private whiteNoiseBuffer: AudioBuffer;
  private pinkNoiseBuffer: AudioBuffer;
  private brownNoiseBuffer: AudioBuffer;
  private reverbBuffer: AudioBuffer;

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8; // Slight headroom
    
    // Master Compressor/Limiter for "Glue"
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 16;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.2;

    this.masterGain.connect(compressor);
    compressor.connect(this.ctx.destination);

    // Pre-calculate assets
    this.distortionCurve = this.makeDistortionCurve(400);
    this.hardClipCurve = this.makeDistortionCurve(2000);
    this.whiteNoiseBuffer = this.createNoiseBuffer('white');
    this.pinkNoiseBuffer = this.createNoiseBuffer('pink');
    this.brownNoiseBuffer = this.createNoiseBuffer('brown');
    this.reverbBuffer = this.createReverbImpulse();

    // Setup Reverb Bus
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.reverbBuffer;
    this.reverbOutput = this.ctx.createGain();
    this.reverbOutput.gain.value = 1.0;
    this.reverbNode.connect(this.reverbOutput);
    this.reverbOutput.connect(this.masterGain);

    // Setup Delay Bus
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.value = 0.375; 
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.4;
    this.delayOutput = this.ctx.createGain();
    this.delayOutput.gain.value = 1.0;
    
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayOutput);
    this.delayOutput.connect(this.masterGain);

    // Initialize Channel Strips for 16 tracks
    for (let i = 0; i < 16; i++) {
      this.createChannelStrip(i);
    }
  }

  public setGenre(genre: string) {
     this.activeGenre = genre as Genre;
  }

  public async renderPreview(track: Track): Promise<AudioBuffer> {
    // Offline rendering for visualization
    const length = 44100 * 0.5; // 0.5 seconds preview
    const offlineCtx = new OfflineAudioContext(1, length, 44100);
    
    const dest = offlineCtx.createGain();
    dest.connect(offlineCtx.destination);
    
    // We play the source directly into the offline destination
    // This skips the channel strip effects (filter, bitcrush) for speed/simplicity in preview
    // but captures the core synthesis parameters (pitch, variation)
    this.playSource(track, 0, dest);
    
    return await offlineCtx.startRendering();
  }

  private createChannelStrip(id: number) {
    const input = this.ctx.createGain();

    // 1. Bitcrush / Distortion (Wet/Dry Implementation)
    const bitcrush = this.ctx.createWaveShaper();
    bitcrush.oversample = 'none';
    const bitcrushDry = this.ctx.createGain();
    const bitcrushWet = this.ctx.createGain();

    // Default to dry
    bitcrushDry.gain.value = 1;
    bitcrushWet.gain.value = 0;

    // 2. Stutter / Gate
    const stutterGain = this.ctx.createGain();
    const stutterOsc = this.ctx.createOscillator();
    stutterOsc.type = 'square';
    stutterOsc.frequency.value = 0; 
    stutterOsc.start();

    // 3. Glitch / Ring Mod
    const glitchGain = this.ctx.createGain();
    const glitchOsc = this.ctx.createOscillator();
    glitchOsc.type = 'sawtooth';
    glitchOsc.frequency.value = 0;
    glitchOsc.start();

    // 4. Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 22000;

    // 5. Sends & Pan
    const reverbSend = this.ctx.createGain();
    const delaySend = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner();
    const volume = this.ctx.createGain();

    reverbSend.gain.value = 0;
    delaySend.gain.value = 0;
    volume.gain.value = 0.8;
    
    // --- Routing ---
    // Bitcrush Parallel Path
    input.connect(bitcrushDry);
    input.connect(bitcrush);
    bitcrush.connect(bitcrushWet);
    
    // Sum Bitcrush Paths into Stutter
    bitcrushDry.connect(stutterGain);
    bitcrushWet.connect(stutterGain);

    // Chain Rest
    stutterGain.connect(glitchGain);
    glitchGain.connect(filter);
    
    filter.connect(reverbSend);
    filter.connect(delaySend);
    filter.connect(pan);
    pan.connect(volume);
    volume.connect(this.masterGain);

    reverbSend.connect(this.reverbNode);
    delaySend.connect(this.delayNode);

    this.channels.set(id, { 
        input, 
        bitcrush, bitcrushDry, bitcrushWet,
        stutterGain, stutterOsc,
        glitchGain, glitchOsc,
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
    const beatTime = 60 / bpm;
    const delayTime = beatTime * 0.75;
    this.delayNode.delayTime.setTargetAtTime(delayTime, this.ctx.currentTime, 0.1);
  }

  public updateTrackParameters(track: Track, time?: number) {
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

    // Bitcrush / Distortion Wet/Dry Mix
    if (track.effects.bitcrush.active) {
        strip.bitcrush.curve = this.distortionCurve;
        const wet = track.effects.bitcrush.value;
        strip.bitcrushDry.gain.setTargetAtTime(1 - wet, t, 0.02);
        strip.bitcrushWet.gain.setTargetAtTime(wet, t, 0.02);
    } else {
        strip.bitcrushDry.gain.setTargetAtTime(1, t, 0.02);
        strip.bitcrushWet.gain.setTargetAtTime(0, t, 0.02);
    }

    this.updateModulator(strip.stutterGain, strip.stutterOsc, track.effects.stutter.active, track.effects.stutter.value, 3, 24, 'square', t);
    this.updateModulator(strip.glitchGain, strip.glitchOsc, track.effects.glitch.active, track.effects.glitch.value, 20, 800, 'sawtooth', t);

    strip.reverbSend.gain.setTargetAtTime(track.effects.reverb.active ? track.effects.reverb.value : 0, t, 0.02);
    strip.delaySend.gain.setTargetAtTime(track.effects.delay.active ? track.effects.delay.value : 0, t, 0.02);
  }

  private updateModulator(targetGain: GainNode, osc: OscillatorNode, active: boolean, value: number, minFreq: number, maxFreq: number, type: OscillatorType, time?: number) {
      const t = time || this.ctx.currentTime;
      if (active) {
         const freq = minFreq + (value * (maxFreq - minFreq));
         osc.frequency.setTargetAtTime(freq, t, 0.02);
         osc.type = type;
         try { osc.disconnect(); osc.connect(targetGain.gain); } catch(e) {}
      } else {
         try { osc.disconnect(); targetGain.gain.cancelScheduledValues(t); targetGain.gain.setValueAtTime(1.0, t); } catch(e) {}
      }
  }

  public trigger(track: Track, time: number = 0) {
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
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(t); osc.stop(t + 0.05);
  }

  // =========================================================================
  // ANALOG & ORGANIC MODELING ENGINES
  // =========================================================================

  private playSource(track: Track, t: number, dest: AudioNode) {
     // CHECK FOR CUSTOM SAMPLE
     if (track.sample?.isCustom && track.sample.buffer) {
         this.playCustomSample(track, t, dest);
         return;
     }

     const { type, pitch, variation } = track;
     const vol = 1.0;

     // Special Override for Ethnic World - Nature Sounds
     if (this.activeGenre === 'ETHNIC-WORLD') {
         if (type === InstrumentType.FX) { this.dispatchBird(t, vol, pitch, variation, dest); return; }
         if (type === InstrumentType.CHORD) { this.dispatchFlute(t, vol, pitch, variation, dest); return; }
         if (type === InstrumentType.LASER) { this.dispatchBird(t, vol * 1.2, pitch + 0.5, variation, dest); return; }
     }

     switch (type) {
      case InstrumentType.KICK: 
          this.dispatchKick(t, vol, pitch, variation, dest); 
          break;
      case InstrumentType.SNARE: 
          this.dispatchSnare(t, vol, pitch, variation, dest); 
          break;
      case InstrumentType.HIHAT_CLOSED: 
          this.dispatchHat(t, vol, pitch, variation, dest, false); 
          break;
      case InstrumentType.HIHAT_OPEN: 
          this.dispatchHat(t, vol, pitch, variation, dest, true); 
          break;
      case InstrumentType.CLAP: 
          this.dispatchClap(t, vol, pitch, variation, dest); 
          break;
      case InstrumentType.BASS:
          this.dispatchBass(t, vol, pitch, variation, dest);
          break;
      case InstrumentType.TOM_LOW:
      case InstrumentType.TOM_HI:
          // Secondary Kick Logic for Heavy Packs
          if (['TR-909', 'TR-808', 'MEMPHIS', 'JUNGLE', 'GABBER', 'HARDSTYLE', 'DUBSTEP'].includes(this.activeGenre) && type === InstrumentType.TOM_LOW) {
              this.dispatchKick(t, vol * 0.9, pitch - 0.3, (variation + 1) % 4, dest);
          } else {
              this.dispatchTom(t, type === InstrumentType.TOM_LOW ? 100 : 200, vol, pitch, variation, dest);
          }
          break;
      case InstrumentType.COWBELL:
          this.dispatchCowbell(t, vol, pitch, variation, dest);
          break;
      default:
          this.dispatchSynth(t, vol, pitch, variation, dest, type);
          break;
    }
  }

  // --- CUSTOM SAMPLER ENGINE ---
  private playCustomSample(track: Track, t: number, dest: AudioNode) {
      if (!track.sample || !track.sample.buffer) return;
      
      const ctx = dest.context;
      const source = ctx.createBufferSource();
      source.buffer = track.sample.buffer;
      
      // PITCH CALCULATION
      const playbackRate = Math.pow(2, track.pitch);
      source.playbackRate.value = playbackRate;
      
      // TRIM CALCULATION
      const bufferDuration = track.sample.buffer.duration;
      const startOffset = Math.max(0, Math.min(bufferDuration, track.sample.start * bufferDuration));
      const endOffset = Math.max(startOffset, Math.min(bufferDuration, track.sample.end * bufferDuration));
      const duration = (endOffset - startOffset); 

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.005); 
      env.gain.setValueAtTime(1, t + (duration / playbackRate) - 0.01);
      env.gain.linearRampToValueAtTime(0, t + (duration / playbackRate)); 

      source.connect(env);
      env.connect(dest);
      
      source.start(t, startOffset, duration);
  }

  // --- KICK ENGINES ---
  private dispatchKick(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      switch(this.activeGenre) {
          case 'TR-808': this.kick808(t, vol, pitch, variation, dest); break;
          case 'TR-909': this.kick909(t, vol, pitch, variation, dest); break;
          case 'TR-707': this.kick707(t, vol, pitch, variation, dest); break;
          case 'LINN-DRUM': this.kickLinn(t, vol, pitch, variation, dest); break;
          case 'JUNGLE': this.kickDnB(t, vol, pitch, variation, dest); break;
          case 'MEMPHIS': this.kick808(t, vol * 1.2, pitch - 0.1, 3, dest); break; // Use distorted 808 var
          case 'GOA': this.kickPsy(t, vol, pitch, variation, dest); break;
          case 'ETHNIC-WORLD': this.kickEthnic(t, vol, pitch, variation, dest); break;
          case 'GABBER': this.kickGabber(t, vol, pitch, variation, dest); break;
          case 'ACID': this.kick909(t, vol, pitch, variation, dest); break;
          case 'UK-GARAGE': this.kickUKG(t, vol, pitch, variation, dest); break;
          case 'EURO-DANCE': this.kick909(t, vol, pitch, variation, dest); break;
          case 'HARDSTYLE': this.kickHardstyle(t, vol, pitch, variation, dest); break;
          case 'DUBSTEP': this.kickDubstep(t, vol, pitch, variation, dest); break;
          default: this.kick909(t, vol, pitch, variation, dest);
      }
  }

  private kick808(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      let freq = 50 + (pitch*10);
      let decay = 0.6;
      let drive = 0;
      let click = 0.1;

      if (variation === 1) { freq = 65; decay = 0.35; click = 0.4; } 
      if (variation === 2) { freq = 45; decay = 0.9; click = 0.05; } 
      if (variation === 3) { freq = 55; decay = 0.5; drive = 1; click = 0.2; } 

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.setValueAtTime(freq + 150, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.02);
      osc.frequency.exponentialRampToValueAtTime(30, t + decay);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

      const clickOsc = ctx.createOscillator();
      clickOsc.type = 'square'; clickOsc.frequency.value = 300;
      const cGain = ctx.createGain();
      cGain.gain.setValueAtTime(click, t);
      cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
      clickOsc.connect(cGain); cGain.connect(dest);
      clickOsc.start(t); clickOsc.stop(t+0.02);

      if (drive > 0) {
          const shaper = ctx.createWaveShaper();
          shaper.curve = this.distortionCurve;
          osc.connect(shaper); shaper.connect(gain);
      } else {
          osc.connect(gain);
      }
      
      gain.connect(dest);
      osc.start(t); osc.stop(t + decay);
  }

  private kick909(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      let decay = 0.4;
      let startF = 200 + (pitch * 50);
      let noiseAmt = 0.3;
      
      if (variation === 1) { decay = 0.5; noiseAmt = 0.6; }
      if (variation === 2) { decay = 0.2; startF = 300; noiseAmt = 0.5; }
      if (variation === 3) { decay = 0.35; noiseAmt = 0.1; startF = 150; }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle'; 
      
      osc.frequency.setValueAtTime(startF, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + decay);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

      const noise = ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;
      const nFilt = ctx.createBiquadFilter();
      nFilt.type = 'lowpass'; nFilt.frequency.value = 1500;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(noiseAmt, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
      noise.connect(nFilt); nFilt.connect(nGain); nGain.connect(dest);
      noise.start(t);

      const shaper = ctx.createWaveShaper();
      shaper.curve = this.distortionCurve;
      
      osc.connect(shaper); shaper.connect(gain); gain.connect(dest);
      osc.start(t); osc.stop(t + decay);
  }

  private kickGabber(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const distortion = ctx.createWaveShaper();
      distortion.curve = this.hardClipCurve;

      const driveGain = ctx.createGain();
      driveGain.gain.value = 50.0;

      const outGain = ctx.createGain();
      outGain.gain.value = vol * 0.6; 

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = variation === 1 ? 8000 : 2500; 

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      const decay = variation === 2 ? 0.8 : 0.4; 
      
      const startFreq = 800;
      const endFreq = 50 + (pitch * 10);
      
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.1);
      
      if (variation === 1) {
           osc.frequency.setValueAtTime(endFreq, t + 0.15);
           osc.frequency.linearRampToValueAtTime(endFreq - 15, t + 0.4);
      }
      
      if (variation === 0) osc.type = 'triangle';
      if (variation === 1) osc.type = 'sawtooth';
      if (variation === 2) osc.type = 'square';
      if (variation === 3) osc.type = 'sine';

      oscGain.gain.setValueAtTime(1.0, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + decay);

      osc.connect(oscGain);
      oscGain.connect(driveGain);
      driveGain.connect(distortion);
      distortion.connect(filter);
      filter.connect(outGain);
      outGain.connect(dest);

      osc.start(t);
      osc.stop(t + decay);
  }

  private kickUKG(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const freq = variation === 1 ? 45 : 55;
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(freq + (pitch*10), t + 0.15);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      
      const mod = ctx.createOscillator();
      mod.frequency.value = 80;
      const modG = ctx.createGain();
      modG.gain.value = variation === 2 ? 300 : 100;
      mod.connect(modG); modG.connect(osc.frequency);
      mod.start(t); mod.stop(t+0.1);

      osc.connect(gain); gain.connect(dest);
      osc.start(t); osc.stop(t + 0.2);
  }

  private kick707(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 140 + (pitch * 50) + (variation * 40);
      filter.Q.value = 4;

      const decay = 0.25;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
      
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

      osc.connect(filter); filter.connect(gain); gain.connect(dest);
      osc.start(t); osc.stop(t + decay);
  }

  private kickLinn(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      
      osc.frequency.setValueAtTime(120 + (pitch * 20) + (variation*10), t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      const noise = ctx.createBufferSource();
      noise.buffer = this.brownNoiseBuffer;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.5, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
      noise.connect(nGain); nGain.connect(dest);
      noise.start(t);

      osc.connect(gain); gain.connect(dest);
      osc.start(t); osc.stop(t + 0.2);
  }

  private kickDnB(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      
      const decay = variation === 3 ? 0.15 : 0.25;
      const startF = 180 + (pitch*50);
      const endF = variation === 1 ? 45 : 60;

      osc.frequency.setValueAtTime(startF, t);
      osc.frequency.exponentialRampToValueAtTime(endF, t + 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

      const noise = ctx.createBufferSource();
      noise.buffer = this.pinkNoiseBuffer;
      const nFilt = ctx.createBiquadFilter();
      nFilt.type = 'bandpass';
      nFilt.frequency.value = 300; 
      nFilt.Q.value = 2;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(vol * 0.3, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      if (variation === 2) {
          const shaper = ctx.createWaveShaper();
          shaper.curve = this.distortionCurve;
          osc.connect(shaper); shaper.connect(gain);
      } else {
          osc.connect(gain);
      }
      
      gain.connect(dest);
      noise.connect(nFilt); nFilt.connect(nGain); nGain.connect(dest);

      osc.start(t); osc.stop(t + decay);
      noise.start(t); noise.stop(t + decay);
  }

  private kickDubstep(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      
      let decay = 0.4;
      let clickAmt = 0.2;
      
      if (variation === 1) { clickAmt = 0.6; decay = 0.3; }
      if (variation === 2) { decay = 0.8; }
      
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(45 + (pitch*10), t + 0.1);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
      
      const cOsc = ctx.createOscillator();
      cOsc.type = 'square'; cOsc.frequency.value = 800;
      const cGain = ctx.createGain();
      cGain.gain.setValueAtTime(clickAmt, t);
      cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
      cOsc.connect(cGain); cGain.connect(dest);
      cOsc.start(t); cOsc.stop(t+0.05);

      if (variation === 3) {
          const shaper = ctx.createWaveShaper();
          shaper.curve = this.distortionCurve;
          osc.connect(shaper); shaper.connect(gain);
      } else {
          osc.connect(gain);
      }
      gain.connect(dest);
      osc.start(t); osc.stop(t + decay);
  }

  private kickPsy(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      
      let startF = 900;
      let endF = 45 + (pitch * 10);
      let sweepTime = 0.08;
      let holdTime = 0.05;
      let decay = 0.3; 
      
      if (variation === 1) { startF = 1200; endF = 50; decay = 0.2; sweepTime = 0.06; }
      if (variation === 2) { startF = 1500; endF = 55; decay = 0.15; }
      if (variation === 3) { startF = 600; endF = 40; decay = 0.4; holdTime = 0.1; }

      osc.frequency.setValueAtTime(startF, t);
      osc.frequency.exponentialRampToValueAtTime(endF, t + sweepTime);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.setValueAtTime(vol, t + holdTime);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
      
      const cOsc = ctx.createOscillator();
      const cGain = ctx.createGain();
      cOsc.frequency.setValueAtTime(2500, t);
      cOsc.frequency.exponentialRampToValueAtTime(1000, t + 0.01);
      cGain.gain.setValueAtTime(variation === 2 ? 0.3 : 0.1, t);
      cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
      
      cOsc.connect(cGain); cGain.connect(dest);
      cOsc.start(t); cOsc.stop(t+0.02);

      osc.connect(gain); gain.connect(dest);
      osc.start(t); osc.stop(t + decay);
  }

  private kickHardstyle(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const dist = ctx.createWaveShaper();
      dist.curve = this.hardClipCurve;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.8;

      const oscP = ctx.createOscillator();
      const gainP = ctx.createGain();
      oscP.frequency.setValueAtTime(900, t);
      oscP.frequency.exponentialRampToValueAtTime(180, t + 0.1);
      gainP.gain.setValueAtTime(vol, t);
      gainP.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      
      const oscT = ctx.createOscillator();
      const gainT = ctx.createGain();
      oscT.type = variation === 1 ? 'sawtooth' : 'triangle';
      
      const freq = 50 + (pitch * 10);
      oscT.frequency.setValueAtTime(freq, t);
      if (variation === 3) oscT.frequency.linearRampToValueAtTime(freq - 10, t + 0.5);

      gainT.gain.setValueAtTime(vol * 0.8, t);
      if (variation === 2) {
          gainT.gain.setValueAtTime(0, t);
          gainT.gain.linearRampToValueAtTime(vol, t + 0.15);
          gainT.gain.linearRampToValueAtTime(0, t + 0.5);
      } else {
          gainT.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      }

      oscP.connect(gainP); gainP.connect(dist);
      oscT.connect(gainT); gainT.connect(dist);
      dist.connect(masterGain); masterGain.connect(dest);
      
      oscP.start(t); oscP.stop(t+0.2);
      oscT.start(t); oscT.stop(t+0.6);
  }

  private kickEthnic(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120 + (pitch * 20), t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 1.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300 + (variation * 100);
      filter.Q.value = 2;

      osc.connect(filter); filter.connect(gain); gain.connect(dest);
      osc.start(t); osc.stop(t + 0.4);
  }

  // --- SNARE ENGINES ---
  private dispatchSnare(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      switch(this.activeGenre) {
          case 'TR-808': this.snare808(t, vol, pitch, variation, dest); break;
          case 'TR-909': this.snare909(t, vol, pitch, variation, dest); break;
          case 'TR-707': this.snare707(t, vol, pitch, variation, dest); break;
          case 'LINN-DRUM': this.snareLinn(t, vol, pitch, variation, dest); break;
          case 'JUNGLE': this.snareDnB(t, vol, pitch, variation, dest); break;
          case 'MEMPHIS': this.snareTrap(t, vol, pitch, variation, dest); break;
          case 'ETHNIC-WORLD': this.snareEthnic(t, vol, pitch, variation, dest); break;
          case 'GABBER': this.snare909(t, vol * 1.2, pitch + 0.2, 2, dest); break; // Distorted 909
          case 'ACID': this.snare909(t, vol, pitch, 0, dest); break;
          case 'UK-GARAGE': this.snareUKG(t, vol, pitch, variation, dest); break;
          case 'EURO-DANCE': this.snare909(t, vol, pitch, 1, dest); break;
          case 'HARDSTYLE': this.snare909(t, vol * 1.2, pitch - 0.1, 1, dest); break; // Hard Punchy 909
          case 'DUBSTEP': this.snareTrap(t, vol, pitch - 0.2, 2, dest); break; // Heavy Layered Snare
          default: this.snare909(t, vol, pitch, variation, dest);
      }
  }

  private snare808(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const toneF = variation === 1 ? 250 : 180;
      const noiseLen = variation === 2 ? 0.4 : 0.2;
      
      const tone = ctx.createOscillator();
      const toneGain = ctx.createGain();
      tone.frequency.value = toneF + (pitch * 20);
      toneGain.gain.setValueAtTime(vol * 0.5, t);
      toneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      tone.connect(toneGain); toneGain.connect(dest);
      tone.start(t); tone.stop(t + 0.1);

      const noise = ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;
      const nFilt = ctx.createBiquadFilter();
      nFilt.type = 'highpass'; nFilt.frequency.value = 1000;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(vol * 0.8, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + noiseLen);
      noise.connect(nFilt); nFilt.connect(nGain); nGain.connect(dest);
      noise.start(t); noise.stop(t + noiseLen);
  }

  private snare909(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const toneStart = variation === 1 ? 300 : 200;
      const noiseLen = variation === 3 ? 0.15 : 0.3;
      const isDist = variation === 2;

      const tone = ctx.createOscillator();
      const toneGain = ctx.createGain();
      tone.frequency.setValueAtTime(toneStart + (pitch * 20), t);
      tone.frequency.exponentialRampToValueAtTime(150, t + 0.1);
      toneGain.gain.setValueAtTime(vol * 0.6, t);
      toneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      
      if (isDist) {
          const shaper = ctx.createWaveShaper();
          shaper.curve = this.distortionCurve;
          tone.connect(shaper); shaper.connect(toneGain);
      } else {
          tone.connect(toneGain);
      }
      toneGain.connect(dest);
      tone.start(t); tone.stop(t + 0.15);

      const noise = ctx.createBufferSource();
      noise.buffer = this.pinkNoiseBuffer;
      const nFilt = ctx.createBiquadFilter();
      nFilt.type = 'lowpass'; nFilt.frequency.value = 12000;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(vol * 0.7, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + noiseLen);
      noise.connect(nFilt); nFilt.connect(nGain); nGain.connect(dest);
      noise.start(t); noise.stop(t + noiseLen);
  }

  private snareUKG(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      osc.frequency.value = 300 + (variation * 50) + (pitch * 20);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      
      osc.connect(filter); filter.connect(gain); gain.connect(dest);
      osc.start(t); osc.stop(t + 0.1);
  }

  private snare707(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const noise = ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;
      const nFilt = ctx.createBiquadFilter();
      nFilt.type = 'bandpass'; nFilt.frequency.value = 2500 + (variation * 500);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(vol, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      noise.connect(nFilt); nFilt.connect(nGain); nGain.connect(dest);
      noise.start(t); noise.stop(t + 0.12);
  }

  private snareLinn(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const noise = ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;
      const nFilt = ctx.createBiquadFilter();
      nFilt.type = 'lowpass'; nFilt.frequency.value = 6000 - (variation * 1000);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(vol, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      
      const tone = ctx.createOscillator();
      tone.frequency.value = 180 + (pitch * 20);
      const tGain = ctx.createGain();
      tGain.gain.setValueAtTime(vol * 0.4, t);
      tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      noise.connect(nFilt); nFilt.connect(nGain); nGain.connect(dest);
      tone.connect(tGain); tGain.connect(dest);
      noise.start(t); tone.start(t);
      noise.stop(t + 0.2); tone.stop(t + 0.1);
  }

  private snareDnB(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const oscLow = ctx.createOscillator();
      oscLow.frequency.setValueAtTime(200, t);
      oscLow.frequency.exponentialRampToValueAtTime(150, t + 0.05);
      const gainLow = ctx.createGain();
      gainLow.gain.setValueAtTime(vol * 0.7, t);
      gainLow.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      const oscRing = ctx.createOscillator();
      oscRing.type = 'triangle';
      const ringFreq = variation === 1 ? 1000 : 850;
      oscRing.frequency.setValueAtTime(ringFreq + (pitch * 100), t); 
      const gainRing = ctx.createGain();
      gainRing.gain.setValueAtTime(vol * 0.4, t);
      gainRing.gain.exponentialRampToValueAtTime(0.001, t + 0.08); 

      const noise = ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 4000;
      const noiseGain = ctx.createGain();
      const noiseLen = variation === 3 ? 0.3 : 0.15;
      noiseGain.gain.setValueAtTime(vol * 0.8, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseLen);

      if (variation === 3) {
           const shaper = ctx.createWaveShaper();
           shaper.curve = this.distortionCurve;
           noise.connect(shaper); shaper.connect(noiseFilter);
      } else {
           noise.connect(noiseFilter);
      }

      oscLow.connect(gainLow); gainLow.connect(dest);
      oscRing.connect(gainRing); gainRing.connect(dest);
      noiseFilter.connect(noiseGain); noiseGain.connect(dest);
      
      oscLow.start(t); oscRing.start(t); noise.start(t);
      oscLow.stop(t+0.2); oscRing.stop(t+0.2); noise.stop(t+0.3);
  }

  private snareTrap(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      this.snare808(t, vol, pitch + 0.2, variation, dest);
      this.dispatchClap(t, vol * 0.5, pitch, variation, dest);
  }

  private snareEthnic(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      osc.frequency.value = 800 + (pitch * 100) + (variation * 50);
      osc.type = 'triangle';
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      
      osc.connect(filter); filter.connect(gain); gain.connect(dest);
      osc.start(t); osc.stop(t + 0.1);
  }

  // --- HAT ENGINES ---
  private dispatchHat(t: number, vol: number, pitch: number, variation: number, dest: AudioNode, isOpen: boolean) {
      const ctx = dest.context;
      const dur = isOpen ? 0.3 : 0.05;
      
      const isMetallic = ['TR-909', 'JUNGLE', 'LINN-DRUM', 'GABBER', 'EURO-DANCE', 'ACID', 'HARDSTYLE'].includes(this.activeGenre);
      
      if (isMetallic) {
          let tuningMult = 1;
          if (variation === 1) tuningMult = 1.5;
          if (variation === 2) tuningMult = 0.7;
          if (variation === 3) tuningMult = 1.2;
          
          if (this.activeGenre === 'JUNGLE') {
             tuningMult = 0.8; 
          }

          const freqs = [263, 400, 421, 474, 587, 845].map(f => f * tuningMult);
          const oscs = freqs.map(f => {
              const o = ctx.createOscillator();
              o.type = 'square';
              o.frequency.value = f * (1 + pitch * 0.1);
              o.start(t); o.stop(t + dur);
              return o;
          });
          
          const mix = ctx.createGain();
          mix.gain.value = 0.2;
          oscs.forEach(o => o.connect(mix));

          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = isOpen ? 7000 : 9000;
          if (this.activeGenre === 'JUNGLE') filter.frequency.value = 4000; 
          
          const env = ctx.createGain();
          env.gain.setValueAtTime(vol, t);
          env.gain.exponentialRampToValueAtTime(0.001, t + dur);
          
          mix.connect(filter); filter.connect(env); env.connect(dest);
      } else if (this.activeGenre === 'ETHNIC-WORLD' || this.activeGenre === 'UK-GARAGE') {
          const noise = ctx.createBufferSource();
          noise.buffer = this.pinkNoiseBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 4000 + (variation * 1000);
          filter.Q.value = 1;
          
          const env = ctx.createGain();
          env.gain.setValueAtTime(vol * 0.7, t);
          env.gain.exponentialRampToValueAtTime(0.001, t + dur);
          
          noise.connect(filter); filter.connect(env); env.connect(dest);
          noise.start(t); noise.stop(t + dur);
      } else {
          const noise = ctx.createBufferSource();
          noise.buffer = this.whiteNoiseBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = isOpen ? 4000 : 6000 + (variation * 1000);
          
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 8000;

          const env = ctx.createGain();
          env.gain.setValueAtTime(vol * 0.6, t);
          env.gain.exponentialRampToValueAtTime(0.001, t + dur);
          
          noise.connect(filter); filter.connect(bp); bp.connect(env); env.connect(dest);
          noise.start(t); noise.stop(t + dur);
      }
  }

  // --- CLAP ENGINES ---
  private dispatchClap(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const noise = ctx.createBufferSource();
      noise.buffer = this.pinkNoiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1500 + (pitch * 200) + (variation * 200);
      filter.Q.value = 1;
      
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      
      const count = variation === 3 ? 1 : 3; 
      for(let i=0; i<count; i++) {
         env.gain.setValueAtTime(vol, t + (i * 0.01));
         env.gain.exponentialRampToValueAtTime(0.01, t + (i * 0.01) + 0.01);
      }
      if (variation !== 3) {
          env.gain.setValueAtTime(vol, t + 0.03);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.15); 
      }

      noise.connect(filter); filter.connect(env); env.connect(dest);
      noise.start(t); noise.stop(t + 0.2);
  }

  // --- BASS & SYNTH ENGINES ---
  private dispatchBass(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const baseFreq = 55 + (pitch * 10); 
      
      if (this.activeGenre === 'ACID') {
          this.dispatch303(t, vol, pitch, variation, dest);
      } else if (this.activeGenre === 'UK-GARAGE') {
          this.dispatchOrgan(t, vol, pitch, variation, dest);
      } else if (this.activeGenre === 'GABBER' || this.activeGenre === 'HARDSTYLE') {
          this.dispatchHoover(t, vol, pitch, variation, dest);
      } else if (this.activeGenre === 'JUNGLE') {
          this.dispatchReese(t, vol, pitch, variation, dest);
      } else if (this.activeGenre === 'DUBSTEP') {
          this.dispatchWobble(t, vol, pitch, variation, dest);
      } else if (this.activeGenre === 'MEMPHIS' || this.activeGenre === 'TR-808') {
          const osc = ctx.createOscillator();
          osc.type = variation === 3 ? 'sawtooth' : 'sine';
          osc.frequency.setValueAtTime(baseFreq, t);
          if (variation === 2) osc.frequency.exponentialRampToValueAtTime(20, t + 0.5);
          
          const env = ctx.createGain();
          env.gain.setValueAtTime(vol, t);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

          if (variation === 1) {
             const shaper = ctx.createWaveShaper();
             shaper.curve = this.distortionCurve;
             osc.connect(shaper); shaper.connect(env);
          } else {
             osc.connect(env);
          }
          env.connect(dest);
          osc.start(t); osc.stop(t + 0.8);

      } else {
          const osc = ctx.createOscillator();
          osc.type = (variation === 1 || variation === 3) ? 'square' : 'sawtooth';
          osc.frequency.value = baseFreq;
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          
          if (variation === 2) {
              filter.frequency.setValueAtTime(100, t);
              filter.frequency.linearRampToValueAtTime(800, t + 0.2);
          } else {
              filter.frequency.setValueAtTime(variation === 3 ? 2000 : 800, t);
              filter.frequency.exponentialRampToValueAtTime(100, t + 0.2);
          }
          
          const env = ctx.createGain();
          env.gain.setValueAtTime(vol, t);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          
          osc.connect(filter); filter.connect(env); env.connect(dest);
          osc.start(t); osc.stop(t + 0.3);
      }
  }

  private dispatch303(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      osc.type = (variation === 1) ? 'square' : 'sawtooth';
      osc.frequency.value = 110 * Math.pow(2, pitch); 
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = variation === 2 ? 20 : 10;
      
      const envF = 1000 + (Math.sin(t * 5) * 500); 
      filter.frequency.setValueAtTime(envF, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + 0.3);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      
      if (variation === 3) {
         const shaper = ctx.createWaveShaper();
         shaper.curve = this.distortionCurve;
         osc.connect(filter); filter.connect(shaper); shaper.connect(gain);
      } else {
         osc.connect(filter); filter.connect(gain);
      }
      gain.connect(dest);
      osc.start(t); osc.stop(t+0.3);
  }

  private dispatchOrgan(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const f = 110 * Math.pow(2, pitch);
      const osc1 = ctx.createOscillator(); osc1.type = 'sine'; osc1.frequency.value = f;
      const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = f * 2;
      
      const g1 = ctx.createGain(); g1.gain.value = 0.8;
      const g2 = ctx.createGain(); g2.gain.value = variation === 0 ? 0.5 : 0.2;
      
      const master = ctx.createGain();
      master.gain.setValueAtTime(vol, t);
      master.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      
      osc1.connect(g1); g1.connect(master);
      osc2.connect(g2); g2.connect(master);
      master.connect(dest);
      
      osc1.start(t); osc2.start(t);
      osc1.stop(t+0.3); osc2.stop(t+0.3);
  }

  private dispatchReese(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const baseFreq = 55 + (pitch * 10); 
      const osc1 = ctx.createOscillator(); osc1.type = 'sawtooth';
      const osc2 = ctx.createOscillator(); osc2.type = 'sawtooth';
      const osc3 = ctx.createOscillator(); osc3.type = 'square'; 
      
      osc1.frequency.value = baseFreq - 1;
      osc2.frequency.value = baseFreq + 1;
      osc3.frequency.value = baseFreq / 2;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      if (variation === 1) {
         filter.frequency.setValueAtTime(2000, t); 
      } else {
         filter.frequency.setValueAtTime(400, t);
         filter.frequency.linearRampToValueAtTime(1200, t + 0.3); 
      }

      const env = ctx.createGain();
      env.gain.setValueAtTime(vol, t);
      env.gain.linearRampToValueAtTime(vol * 0.8, t + 0.1);
      env.gain.linearRampToValueAtTime(0, t + 0.5);

      osc1.connect(filter); osc2.connect(filter); osc3.connect(filter);
      filter.connect(env); env.connect(dest);
      osc1.start(t); osc2.start(t); osc3.start(t);
      osc1.stop(t+0.5); osc2.stop(t+0.5); osc3.stop(t+0.5);
  }

  private dispatchWobble(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator(); 
      osc.type = 'sawtooth';
      const baseFreq = 55 + (pitch * 10);
      osc.frequency.value = baseFreq;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 5;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      const rates = [3, 6, 12, 1.5];
      lfo.frequency.value = rates[variation];
      
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1000;

      const env = ctx.createGain();
      env.gain.setValueAtTime(vol, t);
      env.gain.linearRampToValueAtTime(vol, t + 0.4);
      env.gain.linearRampToValueAtTime(0, t + 0.5);
      
      filter.frequency.setValueAtTime(500, t);
      lfo.connect(lfoGain); lfoGain.connect(filter.frequency);

      osc.connect(filter); filter.connect(env); env.connect(dest);
      osc.start(t); lfo.start(t);
      osc.stop(t+0.5); lfo.stop(t+0.5);
  }

  private dispatchHoover(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc1 = ctx.createOscillator(); osc1.type = 'sawtooth';
      const osc2 = ctx.createOscillator(); osc2.type = 'sawtooth';
      const lfo = ctx.createOscillator(); lfo.frequency.value = 4;
      const lfoG = ctx.createGain(); lfoG.gain.value = 20;

      const base = 110 * Math.pow(2, pitch);
      osc1.frequency.value = base;
      osc2.frequency.value = base * 1.01; 
      
      if (variation === 0 || variation === 2) {
          osc1.frequency.setValueAtTime(base * 0.8, t);
          osc1.frequency.linearRampToValueAtTime(base, t + 0.2);
          osc2.frequency.setValueAtTime(base * 0.8, t);
          osc2.frequency.linearRampToValueAtTime(base * 1.01, t + 0.2);
      }

      lfo.connect(lfoG);
      lfoG.connect(osc1.frequency);
      lfoG.connect(osc2.frequency);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;
      filter.Q.value = 2;

      const env = ctx.createGain();
      env.gain.setValueAtTime(vol, t);
      env.gain.linearRampToValueAtTime(0, t + 1.0);

      osc1.connect(filter); osc2.connect(filter); filter.connect(env); env.connect(dest);
      osc1.start(t); osc2.start(t); lfo.start(t);
      osc1.stop(t+1.0); osc2.stop(t+1.0); lfo.stop(t+1.0);
  }

  // --- SPECIAL FX ---
  private dispatchBird(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const outGain = ctx.createGain();

      const startFreq = 2000 + (pitch * 500);
      
      carrier.frequency.setValueAtTime(startFreq, t);
      carrier.frequency.exponentialRampToValueAtTime(startFreq + 500, t + 0.1);
      carrier.frequency.exponentialRampToValueAtTime(startFreq, t + 0.2);

      modulator.frequency.value = 20 + (variation * 10);
      modGain.gain.value = 1000;

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      outGain.gain.setValueAtTime(0, t);
      outGain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.05);
      outGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      carrier.connect(outGain);
      outGain.connect(dest);

      carrier.start(t); modulator.start(t);
      carrier.stop(t + 0.4); modulator.stop(t + 0.4);
  }

  private dispatchFlute(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 440 + (pitch * 100); 
      
      const noise = ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = osc.frequency.value;
      const noiseGain = ctx.createGain();
      
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vol * 0.8, t + 0.05); 
      env.gain.linearRampToValueAtTime(0, t + 0.6);

      noiseGain.gain.value = 0.1 + (variation * 0.1); 

      osc.connect(env);
      noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(env);
      env.connect(dest);

      osc.start(t); noise.start(t);
      osc.stop(t+0.6); noise.stop(t+0.6);
  }

  private dispatchCowbell(t: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const f1 = 540 + (pitch * 100) + (variation * 50);
      const f2 = 800 + (pitch * 148) + (variation * 50); 
      
      const osc1 = ctx.createOscillator(); osc1.type = 'square'; osc1.frequency.value = f1;
      const osc2 = ctx.createOscillator(); osc2.type = 'square'; osc2.frequency.value = f2;
      
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = (f1 + f2) / 1.5; 
      
      const env = ctx.createGain();
      env.gain.setValueAtTime(vol * 0.6, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      
      osc1.connect(bp); osc2.connect(bp); bp.connect(env); env.connect(dest);
      osc1.start(t); osc2.start(t); 
      osc1.stop(t + 0.3); osc2.stop(t + 0.3);
  }
  
  private dispatchTom(t: number, freq: number, vol: number, pitch: number, variation: number, dest: AudioNode) {
      const ctx = dest.context;
      const osc = ctx.createOscillator();
      osc.type = variation === 1 ? 'triangle' : 'sine';
      const f = freq + (pitch * 50);
      osc.frequency.setValueAtTime(f, t);
      
      if (variation === 3) {
          osc.frequency.exponentialRampToValueAtTime(f * 0.2, t + 0.3);
      } else {
          osc.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.3);
      }
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      
      osc.connect(gain); gain.connect(dest);
      osc.start(t); osc.stop(t+0.3);
  }

  private dispatchSynth(t: number, vol: number, pitch: number, variation: number, dest: AudioNode, type: InstrumentType) {
      const ctx = dest.context;
      if (this.activeGenre === 'EURO-DANCE' || this.activeGenre === 'HARDSTYLE') {
          this.dispatchHoover(t, vol, pitch, variation, dest);
          return;
      }

      const osc = ctx.createOscillator();
      osc.type = ['triangle', 'sawtooth', 'square', 'sine'][variation] as OscillatorType;
      osc.frequency.value = 440 + (pitch * 100);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      
      if (variation === 3) {
          const mod = ctx.createOscillator();
          mod.frequency.value = osc.frequency.value * 2;
          const modG = ctx.createGain();
          modG.gain.value = 300;
          mod.connect(modG); modG.connect(osc.frequency);
          mod.start(t); mod.stop(t+0.4);
      }

      osc.connect(gain); gain.connect(dest);
      osc.start(t); osc.stop(t + 0.4);
  }

  // --- UTILS ---
  private createNoiseBuffer(type: 'white' | 'pink' | 'brown') {
    const bufferSize = this.ctx.sampleRate * 2; 
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    if (type === 'white') {
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
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
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            data[i] *= 0.11; 
            b6 = white * 0.115926;
        }
    } else { 
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; 
        }
    }
    return buffer;
  }
  
  private makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100; const curve = new Float32Array(n_samples); const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private createReverbImpulse() {
    const len = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
        const data = buffer.getChannelData(c);
        for(let i=0; i<len; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/len, 3);
        }
    }
    return buffer;
  }
}
