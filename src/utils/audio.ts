// Web Audio API procedural sound synthesizer for realistic laboratory & mechanical extraction audio

class AudioManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private vacuumNode: { osc: OscillatorNode; noise: AudioBufferSourceNode; gain: GainNode } | null = null;
  private userHasInteracted: boolean = false;

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

  // Tactile stroke sound with authentic wet skin rubbing and viscous lubricant squelch
  playStroke(velocity: number = 1.0, lubeLevel: number = 75) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const safeVelocity = Math.max(0.2, Math.min(velocity, 2.5));
      const lubeFactor = Math.max(0.15, Math.min(1.4, lubeLevel / 60));
      const t = this.ctx.currentTime;
      const sampleRate = this.ctx.sampleRate;

      // 1. Deep fleshy impact / body resonance
      const bodyOsc = this.ctx.createOscillator();
      const bodyGain = this.ctx.createGain();
      bodyOsc.type = 'sine';
      const startFreq = 68 + safeVelocity * 28 + (Math.random() * 8 - 4);
      bodyOsc.frequency.setValueAtTime(startFreq, t);
      bodyOsc.frequency.exponentialRampToValueAtTime(32, t + 0.16);

      const bodyPeakGain = Math.max(0.01, 0.24 * Math.min(safeVelocity, 1.4));
      bodyGain.gain.setValueAtTime(bodyPeakGain, t);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(this.ctx.destination);
      bodyOsc.start(t);
      bodyOsc.stop(t + 0.18);

      // 2. Viscous lubricant wet squelch & skin shear noise
      const bufferLen = Math.max(1, Math.floor(sampleRate * 0.15));
      const noiseBuffer = this.ctx.createBuffer(1, bufferLen, sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let lastVal = 0;
      for (let i = 0; i < bufferLen; i++) {
        const white = Math.random() * 2 - 1;
        // Pink-tinted smoothed noise for rich viscous fluid texture
        lastVal = (lastVal * 0.45) + (white * 0.55);
        // Windowed envelope with gentle initial squish and wet drag
        const progress = i / bufferLen;
        const env = Math.sin(progress * Math.PI) * (1 + 0.4 * Math.sin(progress * Math.PI * 3));
        data[i] = lastVal * env;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Primary juicy squelch formant (380 - 750 Hz)
      const formantFilter = this.ctx.createBiquadFilter();
      formantFilter.type = 'bandpass';
      const formantFreq = 420 + safeVelocity * 180 + (Math.random() * 60 - 30);
      formantFilter.frequency.setValueAtTime(formantFreq, t);
      formantFilter.frequency.exponentialRampToValueAtTime(formantFreq * 1.35, t + 0.08);
      formantFilter.frequency.exponentialRampToValueAtTime(formantFreq * 0.85, t + 0.14);
      formantFilter.Q.setValueAtTime(3.8 + lubeFactor * 1.8, t);

      // Secondary wet slippery friction sheen (1200 - 2400 Hz)
      const sheenFilter = this.ctx.createBiquadFilter();
      sheenFilter.type = 'bandpass';
      const sheenFreq = 1400 + safeVelocity * 400 + (Math.random() * 120 - 60);
      sheenFilter.frequency.setValueAtTime(sheenFreq, t);
      sheenFilter.frequency.exponentialRampToValueAtTime(sheenFreq * 0.7, t + 0.12);
      sheenFilter.Q.setValueAtTime(2.6, t);

      const noiseGain = this.ctx.createGain();
      const peakNoise = Math.max(0.01, 0.18 * Math.min(safeVelocity, 1.5) * lubeFactor);
      noiseGain.gain.setValueAtTime(0.005, t);
      noiseGain.gain.linearRampToValueAtTime(peakNoise, t + 0.035);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      noiseSource.connect(formantFilter);
      noiseSource.connect(sheenFilter);
      formantFilter.connect(noiseGain);
      sheenFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noiseSource.start(t);
      noiseSource.stop(t + 0.16);

      // 3. Wet suction micro-pop / lube slip snap (if sufficiently lubricated)
      if (lubeLevel > 25) {
        const popOsc = this.ctx.createOscillator();
        const popGain = this.ctx.createGain();
        popOsc.type = 'sine';
        const popStart = 380 + Math.random() * 220;
        popOsc.frequency.setValueAtTime(popStart, t + 0.025);
        popOsc.frequency.exponentialRampToValueAtTime(popStart * 1.9, t + 0.065);

        popGain.gain.setValueAtTime(0.001, t);
        popGain.gain.setValueAtTime(0.09 * lubeFactor, t + 0.025);
        popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);

        popOsc.connect(popGain);
        popGain.connect(this.ctx.destination);
        popOsc.start(t + 0.025);
        popOsc.stop(t + 0.08);
      }
    } catch {
      // Ignore audio failure
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
