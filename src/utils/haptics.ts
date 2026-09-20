// Advanced Haptic Feedback Engine
// Simulates mechanical & biological resistance, silicone ribbed textures, fluid drag, and surge climaxes.
// Includes audio-tactile sub-bass transducer emulation for devices without navigator.vibrate (e.g., iOS Safari).

import { soundManager } from './audio';

export interface HapticProfile {
  vacuumPressure: number; // 0-100 kPa
  lubeLevel: number; // 0-100%
  strokeVelocity: number; // 0-5
  sleeveUpgradeLevel: number;
  resonatorUpgradeLevel: number;
  vacuumUpgradeLevel: number;
}

class HapticFeedbackManager {
  public enabled: boolean = true;
  private lastRibTime: number = 0;
  private lastMilestoneVibrated: number = -1;

  constructor() {
    // Check if user previously toggled haptics
    try {
      const saved = localStorage.getItem('semen_extractor_haptics_enabled');
      if (saved !== null) {
        this.enabled = JSON.parse(saved);
      }
    } catch {
      this.enabled = true;
    }
  }

  public setEnabled(value: boolean) {
    this.enabled = value;
    try {
      localStorage.setItem('semen_extractor_haptics_enabled', JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  private triggerRawVibration(pattern: number | number[]) {
    if (!this.enabled) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore device restriction
      }
    }
  }

  /**
   * Simulates dynamic stroke resistance and ribbed texture
   * - Resistance scales with vacuum pressure (suction drag)
   * - Grittiness/texture scales with low lubrication (stick-slip friction)
   * - Smoothness and high-frequency tactile feel scale with sleeve upgrades
   */
  public triggerStrokeResistance(profile: HapticProfile) {
    if (!this.enabled) return;

    const {
      vacuumPressure,
      lubeLevel,
      strokeVelocity,
      sleeveUpgradeLevel = 1,
      resonatorUpgradeLevel = 0,
    } = profile;

    const vel = Math.max(0.5, Math.min(3.0, Math.abs(strokeVelocity)));
    const isDry = lubeLevel < 25;
    const isTight = vacuumPressure > 40;

    // Pattern calculation based on physical conditions:
    if (isDry) {
      // Harsh, gritty friction stick-slip stutter
      const chatter = [
        Math.round(10 * vel),
        8,
        Math.round(15 * vel),
        8,
        Math.round(12 * vel),
      ];
      this.triggerRawVibration(chatter);
    } else if (isTight) {
      // Heavy hydraulic resistance & suction drag
      const dragDuration = Math.round(25 + (vacuumPressure / 100) * 35 * vel);
      if (resonatorUpgradeLevel > 0) {
        // High-frequency harmonic pulse overlay from ultrasonic resonator
        this.triggerRawVibration([dragDuration, 10, 12, 10, 12]);
      } else {
        this.triggerRawVibration(dragDuration);
      }
    } else {
      // Smooth, slick pneumatic stroke with subtle sleeve rib texture
      const ribCount = Math.min(4, Math.max(1, Math.round(sleeveUpgradeLevel / 4)));
      const pattern: number[] = [];
      for (let i = 0; i < ribCount; i++) {
        pattern.push(Math.round(8 * vel));
        pattern.push(12);
      }
      pattern.push(Math.round(16 * vel));
      this.triggerRawVibration(pattern);
    }
  }

  /**
   * Tactile micro-tick when passing silicone sleeve ribs during swipe
   */
  public triggerRibPass() {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastRibTime < 60) return; // debounce rib ticks
    this.lastRibTime = now;
    this.triggerRawVibration(8);
  }

  /**
   * Lubricant aerosol burst haptic
   */
  public triggerLubeDispense() {
    if (!this.enabled) return;
    this.triggerRawVibration([12, 20, 25]);
  }

  public triggerLubrication() {
    this.triggerLubeDispense();
  }

  /**
   * Vacuum adjustment throttle click
   */
  public triggerVacuumStep(pressureKPa: number) {
    if (!this.enabled) return;
    const intensity = Math.round(6 + (pressureKPa / 100) * 14);
    this.triggerRawVibration(intensity);
  }

  /**
   * Milestone reached celebratory haptic
   */
  public triggerMilestone(tierIndex: number) {
    if (!this.enabled) return;
    if (tierIndex === this.lastMilestoneVibrated) return;
    this.lastMilestoneVibrated = tierIndex;

    // Escalating celebration pattern for higher satisfaction milestones
    if (tierIndex === 1) {
      // 25% Moderate
      this.triggerRawVibration([20, 30, 25]);
    } else if (tierIndex === 2) {
      // 50% High
      this.triggerRawVibration([25, 25, 35, 25, 45]);
    } else if (tierIndex === 3) {
      // 75% Euphoric
      this.triggerRawVibration([30, 20, 40, 20, 60]);
    } else if (tierIndex === 4) {
      // 90% Ecstatic
      this.triggerRawVibration([40, 15, 50, 15, 70, 20, 90]);
    } else if (tierIndex === 5) {
      // 100% Transcendent Bliss
      this.triggerRawVibration([50, 20, 80, 20, 110, 20, 140, 25, 200]);
    }
  }

  public resetMilestones() {
    this.lastMilestoneVibrated = -1;
  }

  /**
   * Massive Climax Extraction Surge - Multi-stage crescendo & peristaltic fluid rushes
   */
  public triggerSurgeClimax() {
    if (!this.enabled) return;
    // Stage 1: Buildup shudder -> Stage 2: Main hydraulic release -> Stage 3: Pulsating peristaltic aftershocks
    const crescendo = [
      40, 30, 60, 30, 90, 25, 140, 25, 200, 30, 280, 40, 150, 50, 100, 60, 80,
    ];
    this.triggerRawVibration(crescendo);
  }

  /**
   * Fluid burst ejection pulse
   */
  public triggerFluidSpurt() {
    if (!this.enabled) return;
    this.triggerRawVibration([35, 25, 45]);
  }

  /**
   * Specimen flask collection or quick sell celebration haptic
   */
  public triggerSpecimenCollected() {
    if (!this.enabled) return;
    this.triggerRawVibration([25, 30, 40, 20, 60]);
  }
}

export const hapticManager = new HapticFeedbackManager();
