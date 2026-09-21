// Web Audio API procedural sound synthesizer with wet squishy gooey audio dynamics
class AudioManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private vacuumNode: { osc: OscillatorNode; noise: AudioBufferSourceNode; gain: GainNode } | null = null;
  private userHasInteracted: boolean = false;
  private distortionCurve: Float32Array | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.userHasInteracted = true;
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {
            // Autoplay policy prevented resume
          });
        }
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  private initContext() {
    if (!this.enabled) return;
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {
          // Autoplay policy prevented resume until gesture
        });
      }
    } catch {
      this.ctx = null;
    }
  }

  private getSoftDistortionCurve(): Float32Array {
    if (this.distortionCurve) return this.distortionCurve;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    const k = 2.5;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    this.distortionCurve = curve;
    return curve;
  }

  // Pure wet, squishy, gooey sound triggered on every stroke
  playStroke(velocity: number = 1.0, lubeLevel: number = 75) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const safeVel = Math.max(0.3, Math.min(velocity, 2.8));
      const lubeEffect = Math.max(0.4, Math.min(1.5, lubeLevel / 60));
      const t = this.ctx.currentTime;
      const sampleRate = this.ctx.sampleRate;
      const strokeDuration = Math.max(0.18, 0.28 / Math.pow(safeVel, 0.3));

      // Master wet stroke bus with soft saturation for juicy gooey fullness
      const strokeMaster = this.ctx.createGain();
      strokeMaster.gain.setValueAtTime(Math.min(1.0, 0.85 + safeVel * 0.15), t);

      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this.getSoftDistortionCurve() as any;
      shaper.oversample = '2x';
      strokeMaster.connect(shaper);
      shaper.connect(this.ctx.destination);

      // --- 1. Gooey Fluid Squelch (Viscous fluid turbulence & squishing gel) ---
      const noiseLen = Math.max(1, Math.floor(sampleRate * strokeDuration));
      const noiseBuffer = this.ctx.createBuffer(1, noiseLen, sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      let smooth = 0;
      for (let i = 0; i < noiseLen; i++) {
        const white = Math.random() * 2 - 1;
        // Warm brown-pink noise filtering for dense gooey consistency
        smooth = smooth * 0.52 + white * 0.48;
        const progress = i / noiseLen;
        // Wet squelch envelope: rapid rise, squishy middle ripples, gentle squelch tail
        const ripple = 1.0 + 0.35 * Math.sin(progress * Math.PI * 5);
        const env = Math.sin(progress * Math.PI) * ripple;
        noiseData[i] = smooth * env;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Resonant Goo Formant 1: Deep viscous body sweep (300Hz - 680Hz)
      const gooFilter1 = this.ctx.createBiquadFilter();
      gooFilter1.type = 'bandpass';
      const f1Base = 320 + safeVel * 120 + (Math.random() * 50 - 25);
      gooFilter1.frequency.setValueAtTime(f1Base, t);
      gooFilter1.frequency.exponentialRampToValueAtTime(f1Base * 1.85, t + strokeDuration * 0.45);
      gooFilter1.frequency.exponentialRampToValueAtTime(f1Base * 0.9, t + strokeDuration);
      gooFilter1.Q.setValueAtTime(5.5 + lubeEffect * 1.8, t);

      // Resonant Goo Formant 2: Moist squish & liquid churn (750Hz - 1450Hz)
      const gooFilter2 = this.ctx.createBiquadFilter();
      gooFilter2.type = 'bandpass';
      const f2Base = 780 + safeVel * 220 + (Math.random() * 80 - 40);
      gooFilter2.frequency.setValueAtTime(f2Base, t);
      gooFilter2.frequency.exponentialRampToValueAtTime(f2Base * 1.45, t + strokeDuration * 0.35);
      gooFilter2.frequency.exponentialRampToValueAtTime(f2Base * 0.75, t + strokeDuration);
      gooFilter2.Q.setValueAtTime(4.2 + lubeEffect * 1.5, t);

      const squelchGain = this.ctx.createGain();
      squelchGain.gain.setValueAtTime(0.01, t);
      squelchGain.gain.linearRampToValueAtTime(0.35 * lubeEffect, t + 0.03);
      squelchGain.gain.exponentialRampToValueAtTime(0.001, t + strokeDuration);

      noiseSource.connect(gooFilter1);
      noiseSource.connect(gooFilter2);
      gooFilter1.connect(squelchGain);
      gooFilter2.connect(squelchGain);
      squelchGain.connect(strokeMaster);

      noiseSource.start(t);
      noiseSource.stop(t + strokeDuration);

      // --- 2. Wet Gooey Micro-Bubble Pops & Cavitation Squishes (2-3 staggered bubbles) ---
      const numPops = 3;
      for (let p = 0; p < numPops; p++) {
        const popDelay = 0.02 + p * (0.05 + Math.random() * 0.035);
        if (popDelay >= strokeDuration - 0.02) continue;

        const popTime = t + popDelay;
        const popOsc = this.ctx.createOscillator();
        const popGain = this.ctx.createGain();
        popOsc.type = 'sine';

        // Downward gooey suction drop
        const startPopF = (360 + p * 160 + (Math.random() * 80 - 40)) * (0.9 + safeVel * 0.15);
        const endPopF = Math.max(90, startPopF * 0.32);
        const popDur = 0.028 + Math.random() * 0.015;

        popOsc.frequency.setValueAtTime(startPopF, popTime);
        popOsc.frequency.exponentialRampToValueAtTime(endPopF, popTime + popDur);

        popGain.gain.setValueAtTime(0.001, popTime);
        popGain.gain.linearRampToValueAtTime(0.18 * lubeEffect, popTime + 0.005);
        popGain.gain.exponentialRampToValueAtTime(0.001, popTime + popDur);

        popOsc.connect(popGain);
        popGain.connect(strokeMaster);

        popOsc.start(popTime);
        popOsc.stop(popTime + popDur + 0.005);
      }

      // --- 3. Deep Suction Body Churn (Subtle sub-harmonic goo displace) ---
      const bodyOsc = this.ctx.createOscillator();
      const bodyGain = this.ctx.createGain();
      bodyOsc.type = 'sine';
      const bodyF = 65 + safeVel * 20 + (Math.random() * 8 - 4);
      bodyOsc.frequency.setValueAtTime(bodyF, t);
      bodyOsc.frequency.exponentialRampToValueAtTime(38, t + strokeDuration * 0.8);

      bodyGain.gain.setValueAtTime(0.001, t);
      bodyGain.gain.linearRampToValueAtTime(0.24 * lubeEffect, t + 0.025);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, t + strokeDuration * 0.85);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(strokeMaster);

      bodyOsc.start(t);
      bodyOsc.stop(t + strokeDuration);

      // --- 4. Wet Fluid Lubricant Sheen (Slippery liquid friction) ---
      const sheenLen = Math.max(1, Math.floor(sampleRate * (strokeDuration * 0.6)));
      const sheenBuffer = this.ctx.createBuffer(1, sheenLen, sampleRate);
      const sheenData = sheenBuffer.getChannelData(0);
      for (let i = 0; i < sheenLen; i++) {
        sheenData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / sheenLen, 2.2);
      }
      const sheenSource = this.ctx.createBufferSource();
      sheenSource.buffer = sheenBuffer;

      const sheenFilter = this.ctx.createBiquadFilter();
      sheenFilter.type = 'bandpass';
      sheenFilter.frequency.setValueAtTime(2200 + (Math.random() * 400 - 200), t);
      sheenFilter.Q.setValueAtTime(2.2, t);

      const sheenGain = this.ctx.createGain();
      sheenGain.gain.setValueAtTime(0.001, t);
      sheenGain.gain.linearRampToValueAtTime(0.08 * lubeEffect, t + 0.015);
      sheenGain.gain.exponentialRampToValueAtTime(0.001, t + strokeDuration * 0.6);

      sheenSource.connect(sheenFilter);
      sheenFilter.connect(sheenGain);
      sheenGain.connect(strokeMaster);

      sheenSource.start(t);
      sheenSource.stop(t + strokeDuration * 0.6);
    } catch {
      // Audio execution safe fail
    }
  }

  // Viscous fluid drip / splash
  playFluidDrip(pitchMultiplier: number = 1.0) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const safePitch = Math.max(0.2, pitchMultiplier);
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(Math.max(20, 450 * safePitch), t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, 900 * safePitch), t + 0.06);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      // Ignore
    }
  }

  // Viscous spurt / ejection rush
  playViscousSpurt() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const t = this.ctx.currentTime;
      // Filtered liquid swoosh
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * 0.35));
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.7);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, t);
      filter.frequency.linearRampToValueAtTime(800, t + 0.15);
      filter.frequency.exponentialRampToValueAtTime(200, t + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.36);
    } catch {
      // Ignore
    }
  }

  // Continuous vacuum suction sound adjusting to pressure (0-100 kPa)
  updateVacuumHum(pressureKPa: number) {
    if (!this.enabled || pressureKPa <= 5 || !this.userHasInteracted) {
      if (this.vacuumNode && this.ctx) {
        try {
          this.vacuumNode.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
        } catch {
          // ignore
        }
      }
      return;
    }

    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const targetGain = Math.min(0.18, (pressureKPa / 100) * 0.18);
    const targetFreq = Math.max(20, 48 + (pressureKPa / 100) * 80);

    if (!this.vacuumNode) {
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(targetFreq, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.setTargetAtTime(targetGain, t, 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();

        // Dummy noise source holder
        const dummyBuffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
        const dummySource = this.ctx.createBufferSource();
        dummySource.buffer = dummyBuffer;

        this.vacuumNode = { osc, noise: dummySource, gain };
      } catch {
        // ignore
      }
    } else {
      try {
        const t = this.ctx.currentTime;
        this.vacuumNode.osc.frequency.setTargetAtTime(targetFreq, t, 0.1);
        this.vacuumNode.gain.gain.setTargetAtTime(targetGain, t, 0.1);
      } catch {
        // ignore
      }
    }
  }

  // Lube dispenser spray sound
  playLubeSpray() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const t = this.ctx.currentTime;
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * 0.18));
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.Q.setValueAtTime(2.0, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.2);
    } catch {
      // Ignore
    }
  }

  // Triumphant surge / climax extraction sound
  playSurgeTriumph() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25]; // C4, E4, G4, C5, E5 arpeggio
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + idx * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.45);
      });
    } catch {
      // Ignore
    }
  }

  // ECG Heartbeat blip
  playHeartbeat(urgency: number = 1.0) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const safeUrgency = Math.max(0.1, urgency);
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(Math.max(20, 120 + safeUrgency * 30), t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.09);
    } catch {
      // Ignore
    }
  }

  // UI click / upgrade chime
  playUpgradeChime() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, t); // C5
      osc1.frequency.setValueAtTime(783.99, t + 0.08); // G5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, t); // E5
      osc2.frequency.setValueAtTime(1046.5, t + 0.08); // C6

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.36);
      osc2.stop(t + 0.36);
    } catch {
      // Ignore
    }
  }

  // Cash register / specimen sale chime
  playCashRegister() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, t); // B5
      osc1.frequency.setValueAtTime(1318.51, t + 0.08); // E6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, t); // D6
      osc2.frequency.setValueAtTime(1567.98, t + 0.08); // G6

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.46);
      osc2.stop(t + 0.46);
    } catch {
      // Ignore
    }
  }

  // Milestone level-up chime
  playLevelUp() {
    this.playUpgradeChime();
  }
}

export const soundManager = new AudioManager();
