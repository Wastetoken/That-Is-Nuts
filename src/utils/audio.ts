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

  // Thick viscous clear lube slather sound (pump squirt + wet squelching gel massage)
  playLubeSlather() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const t = this.ctx.currentTime;
      const sampleRate = this.ctx.sampleRate;

      // 1. Dispenser pump ejection squirt
      const squirtOsc = this.ctx.createOscillator();
      const squirtGain = this.ctx.createGain();
      squirtOsc.type = 'triangle';
      squirtOsc.frequency.setValueAtTime(820, t);
      squirtOsc.frequency.exponentialRampToValueAtTime(320, t + 0.14);

      squirtGain.gain.setValueAtTime(0.001, t);
      squirtGain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      squirtGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      squirtOsc.connect(squirtGain);
      squirtGain.connect(this.ctx.destination);
      squirtOsc.start(t);
      squirtOsc.stop(t + 0.15);

      // 2. Thick viscous gel slathering wave (dense wet gooey friction)
      const slatherDur = 0.38;
      const bufLen = Math.floor(sampleRate * slatherDur);
      const buf = this.ctx.createBuffer(1, bufLen, sampleRate);
      const data = buf.getChannelData(0);
      let smooth = 0;
      for (let i = 0; i < bufLen; i++) {
        const white = Math.random() * 2 - 1;
        smooth = smooth * 0.6 + white * 0.4;
        const progress = i / bufLen;
        const ripple = 1.0 + 0.4 * Math.sin(progress * Math.PI * 6);
        data[i] = smooth * Math.sin(progress * Math.PI) * ripple;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buf;

      const bandFilter = this.ctx.createBiquadFilter();
      bandFilter.type = 'bandpass';
      bandFilter.frequency.setValueAtTime(650, t + 0.04);
      bandFilter.frequency.exponentialRampToValueAtTime(1250, t + 0.18);
      bandFilter.frequency.exponentialRampToValueAtTime(450, t + slatherDur);
      bandFilter.Q.setValueAtTime(4.0, t);

      const slatherGain = this.ctx.createGain();
      slatherGain.gain.setValueAtTime(0.001, t + 0.03);
      slatherGain.gain.linearRampToValueAtTime(0.38, t + 0.08);
      slatherGain.gain.exponentialRampToValueAtTime(0.001, t + slatherDur);

      noiseSource.connect(bandFilter);
      bandFilter.connect(slatherGain);
      slatherGain.connect(this.ctx.destination);

      noiseSource.start(t + 0.03);
      noiseSource.stop(t + slatherDur + 0.05);

      // 3. Wet gooey surface bubble pops
      for (let p = 0; p < 3; p++) {
        const popTime = t + 0.08 + p * 0.07;
        const popOsc = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();
        popOsc.type = 'sine';
        const startF = 380 - p * 60;
        popOsc.frequency.setValueAtTime(startF, popTime);
        popOsc.frequency.exponentialRampToValueAtTime(110, popTime + 0.035);

        pGain.gain.setValueAtTime(0.001, popTime);
        pGain.gain.linearRampToValueAtTime(0.16, popTime + 0.006);
        pGain.gain.exponentialRampToValueAtTime(0.001, popTime + 0.035);

        popOsc.connect(pGain);
        pGain.connect(this.ctx.destination);
        popOsc.start(popTime);
        popOsc.stop(popTime + 0.04);
      }
    } catch {
      // Safe fail
    }
  }

  // Backwards compatibility alias
  playLubeSpray() {
    this.playLubeSlather();
  }

  // Tactile vacuum pump surge or pneumatic release hiss
  playVacuumPulse(pressureKPa: number = 35) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const t = this.ctx.currentTime;
      const sampleRate = this.ctx.sampleRate;

      if (pressureKPa <= 3) {
        // Pneumatic pressure relief vent (pssshhht release)
        const ventDur = 0.32;
        const bufLen = Math.floor(sampleRate * ventDur);
        const buf = this.ctx.createBuffer(1, bufLen, sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.8);
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;

        const filt = this.ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.setValueAtTime(2600, t);
        filt.frequency.exponentialRampToValueAtTime(1200, t + ventDur);
        filt.Q.setValueAtTime(2.2, t);

        const ventGain = this.ctx.createGain();
        ventGain.gain.setValueAtTime(0.25, t);
        ventGain.gain.exponentialRampToValueAtTime(0.001, t + ventDur);

        src.connect(filt);
        filt.connect(ventGain);
        ventGain.connect(this.ctx.destination);
        src.start(t);
        src.stop(t + ventDur + 0.05);
        return;
      }

      // Vacuum suction pump stroke: motor draw + suction whoosh + tight collar seal snap
      const pulseDur = 0.28;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const baseF = 45 + (pressureKPa / 100) * 65;
      osc.frequency.setValueAtTime(baseF, t);
      osc.frequency.exponentialRampToValueAtTime(baseF * 1.5, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(30, t + pulseDur);

      oscGain.gain.setValueAtTime(0.001, t);
      oscGain.gain.linearRampToValueAtTime(0.24, t + 0.04);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + pulseDur);

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(220, t);
      lowpass.frequency.linearRampToValueAtTime(550, t + 0.1);
      lowpass.frequency.exponentialRampToValueAtTime(150, t + pulseDur);

      osc.connect(lowpass);
      lowpass.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + pulseDur + 0.02);

      // Suction air rush noise
      const noiseDur = 0.24;
      const nBufLen = Math.floor(sampleRate * noiseDur);
      const nBuf = this.ctx.createBuffer(1, nBufLen, sampleRate);
      const nData = nBuf.getChannelData(0);
      for (let i = 0; i < nBufLen; i++) {
        nData[i] = (Math.random() * 2 - 1) * Math.sin((i / nBufLen) * Math.PI);
      }
      const nSrc = this.ctx.createBufferSource();
      nSrc.buffer = nBuf;

      const nFilt = this.ctx.createBiquadFilter();
      nFilt.type = 'bandpass';
      nFilt.frequency.setValueAtTime(450 + pressureKPa * 8, t);
      nFilt.Q.setValueAtTime(3.0, t);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.001, t);
      nGain.gain.linearRampToValueAtTime(0.28, t + 0.05);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + noiseDur);

      nSrc.connect(nFilt);
      nFilt.connect(nGain);
      nGain.connect(this.ctx.destination);
      nSrc.start(t);
      nSrc.stop(t + noiseDur + 0.02);

      // Rubber seal snap pop at peak suction
      const snapOsc = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snapOsc.type = 'sine';
      snapOsc.frequency.setValueAtTime(240, t + 0.08);
      snapOsc.frequency.exponentialRampToValueAtTime(70, t + 0.13);

      snapGain.gain.setValueAtTime(0.001, t + 0.08);
      snapGain.gain.linearRampToValueAtTime(0.25, t + 0.088);
      snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

      snapOsc.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snapOsc.start(t + 0.08);
      snapOsc.stop(t + 0.14);
    } catch {
      // Safe fail
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

  // Precision rhythm metronome tick
  playMetronomeTick(accent: boolean = false) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(accent ? 880 : 440, t);
      osc.frequency.exponentialRampToValueAtTime(accent ? 220 : 110, t + 0.035);

      gain.gain.setValueAtTime(accent ? 0.12 : 0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch {
      // Ignore
    }
  }

  // Satisfying rhythm timing hit sound (for PERFECT on-beat hits)
  playRhythmHit(perfect: boolean = true) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(perfect ? 659.25 : 523.25, t); // E5 or C5
      osc.frequency.exponentialRampToValueAtTime(perfect ? 880 : 587.33, t + 0.06);

      gain.gain.setValueAtTime(perfect ? 0.16 : 0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.085);
    } catch {
      // Ignore
    }
  }
}

export const soundManager = new AudioManager();
