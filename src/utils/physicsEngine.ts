import { FluidParticle, SpecimenGrade } from '../types';

export interface MachineState {
  vacuumPressure: number; // 0 - 100 kPa
  targetVacuum: number;
  strokePosition: number; // 0.0 (top) to 1.0 (bottom)
  strokeVelocity: number;
  currentFrequency: number; // Hz
  temperature: number; // Celsius (35 - 41)
  targetTemperature: number;
  lubeLevel: number; // 0 - 100%
  frictionCoeff: number; // 0.1 (slick) to 1.0 (dry)
  resonance: number; // 0 - 100% (arousal/stimulation)
  satisfaction: number; // 0 - 100% (overall extraction performance & donor bliss)
  satisfactionMilestone: number; // 0 to 5
  cadenceAccuracy: number; // 0 - 100%
  vacuumAccuracy: number; // 0 - 100%
  thermalComfort: number; // 0 - 100%
  frictionComfort: number; // 0 - 100%
  isSurging: boolean;
  surgeProgress: number; // 0 - 1.0
  heartRate: number; // BPM (60 - 180)
  liquidLevelMl: number; // mL currently in collection beaker
  maxBeakerCapacity: number; // e.g. 50 mL
  sloshAngle: number;
  sloshVelocity: number;
  isManualDragging?: boolean;
}

export class ExtractionPhysicsEngine {
  public particles: FluidParticle[] = [];
  public splatters: { x: number; y: number; size: number; alpha: number; slideSpeed: number }[] = [];
  public lastNozzlePos: { x: number; y: number } = { x: 180, y: 120 };
  public lastChamberPos: { x: number; y: number } = { x: 100, y: 120 };
  private lastStrokeTime: number = 0;
  private strokeHistory: number[] = [];

  // Spawn fluid particles during normal flow or high-energy surge
  spawnFluidBurst(
    originX: number,
    originY: number,
    count: number,
    velocityScale: number = 1.0,
    viscosity: number = 0.7
  ) {
    const colors = [
      'rgba(245, 248, 255, 0.95)',
      'rgba(235, 242, 255, 0.9)',
      'rgba(255, 255, 255, 0.98)',
      'rgba(220, 235, 250, 0.85)',
    ];

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * 0.7 - 0.35) * Math.PI - Math.PI / 2; // mostly upward/forward into nozzle
      const speed = (2.5 + Math.random() * 5.5) * velocityScale;

      this.particles.push({
        x: originX + (Math.random() * 8 - 4),
        y: originY + (Math.random() * 6 - 3),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.2 + Math.random() * 3.5,
        alpha: 0.9 + Math.random() * 0.1,
        life: 0,
        maxLife: 180 + Math.random() * 90,
        color: colors[Math.floor(Math.random() * colors.length)],
        viscosity,
        inTube: false,
        tubeProgress: 0,
      });
    }
  }

  // Update physics step (dt in seconds)
  update(
    state: MachineState,
    dt: number,
    viewportWidth: number,
    viewportHeight: number,
    tubePath: { x: number; y: number }[],
    beakerBounds: { x: number; y: number; width: number; height: number }
  ) {
    // 1. Vacuum Pressure dynamics
    const vacDiff = state.targetVacuum - state.vacuumPressure;
    state.vacuumPressure += vacDiff * Math.min(dt * 3.5, 1.0);
    // Slight air leak if dry
    if (state.lubeLevel < 20) {
      state.vacuumPressure = Math.max(0, state.vacuumPressure - dt * 2.0 * (1 - state.lubeLevel / 20));
    }

    // 2. Friction & Lube consumption
    state.frictionCoeff = 0.15 + (1.0 - state.lubeLevel / 100) * 0.7;
    if (Math.abs(state.strokeVelocity) > 0.5) {
      state.lubeLevel = Math.max(0, state.lubeLevel - dt * 0.8 * state.frictionCoeff);
    }

    // 3. Thermal dynamics: friction heats up, ambient cools towards 36.5
    const ambientCooling = (36.5 - state.temperature) * dt * 0.2;
    const heaterPower = (state.targetTemperature - state.temperature) * dt * 0.6;
    const frictionHeat = Math.abs(state.strokeVelocity) * state.frictionCoeff * dt * 0.15;
    state.temperature += ambientCooling + heaterPower + frictionHeat;

    // 4. Piston Stroke Spring physics (only when user is not manually sliding the sleeve)
    if (!state.isManualDragging) {
      state.strokeVelocity += -8.0 * (state.strokePosition - 0.5) * dt; // gentle centering spring
      state.strokeVelocity *= Math.pow(0.85, dt * 60); // damping
      state.strokePosition = Math.max(0.05, Math.min(0.95, state.strokePosition + state.strokeVelocity * dt));
    }

    // 5. Beaker slosh physics
    state.sloshVelocity += -state.sloshAngle * 12.0 * dt;
    state.sloshVelocity -= (state.strokeVelocity * 0.15) * dt;
    state.sloshVelocity *= Math.pow(0.92, dt * 60);
    state.sloshAngle += state.sloshVelocity * dt;

    // 6. Fluid particles physics
    const nozzleX = tubePath && tubePath.length > 0 ? tubePath[0].x : this.lastNozzlePos.x;
    const nozzleY = tubePath && tubePath.length > 0 ? tubePath[0].y : this.lastNozzlePos.y;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;

      if (p.life > p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      // If outside tube, get drawn toward suction nozzle by vacuum
      if (!p.inTube) {
        const dx = nozzleX - p.x;
        const dy = nozzleY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Strong vacuum suction field near nozzle
        if (state.vacuumPressure > 10) {
          const suctionPower = (state.vacuumPressure / 100) * 450 / Math.max(dist, 15);
          p.vx += (dx / dist) * suctionPower * dt;
          p.vy += (dy / dist) * suctionPower * dt;
        }

        // Gravity & viscous drag
        p.vy += 220 * dt * (1 - p.viscosity * 0.4);
        p.vx *= Math.pow(0.95 - p.viscosity * 0.1, dt * 60);
        p.vy *= Math.pow(0.95 - p.viscosity * 0.1, dt * 60);

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Enter vacuum intake tube
        if (dist < 22 && state.vacuumPressure > 15) {
          p.inTube = true;
          p.tubeProgress = 0;
        }
      } else {
        // Traveling through clear peristaltic tubing!
        const flowSpeed = (0.7 + (state.vacuumPressure / 100) * 1.8) * dt;
        p.tubeProgress = (p.tubeProgress || 0) + flowSpeed;

        if (p.tubeProgress >= 1.0) {
          // Exit tube into graduated beaker
          p.inTube = false;
          p.x = beakerBounds.x + beakerBounds.width * 0.5 + (Math.random() * 12 - 6);
          p.y = beakerBounds.y + 12;
          p.vx = (Math.random() - 0.5) * 20;
          p.vy = 80 + Math.random() * 60;
        } else {
          // Follow tube spline path safely
          if (tubePath && tubePath.length >= 2) {
            const safeLen = tubePath.length;
            const rawIdx = Math.floor(p.tubeProgress * (safeLen - 1));
            const idx = Math.max(0, Math.min(safeLen - 2, rawIdx));
            const tSub = Math.max(0, Math.min(1, (p.tubeProgress * (safeLen - 1)) - idx));
            const p1 = tubePath[idx] || { x: beakerBounds.x, y: beakerBounds.y };
            const p2 = tubePath[idx + 1] || p1;
            p.x = p1.x + (p2.x - p1.x) * tSub + (Math.sin(p.life * 0.3) * 2);
            p.y = p1.y + (p2.y - p1.y) * tSub;
          } else {
            p.x = beakerBounds.x + beakerBounds.width * 0.5;
            p.y = beakerBounds.y + 12;
          }
        }
      }

      // Splash into collection beaker liquid
      const beakerBottomY = beakerBounds.y + beakerBounds.height - 8;
      const fillHeight = (state.liquidLevelMl / state.maxBeakerCapacity) * (beakerBounds.height - 20);
      const liquidSurfaceY = beakerBottomY - fillHeight;

      if (!p.inTube && p.x >= beakerBounds.x && p.x <= beakerBounds.x + beakerBounds.width) {
        if (p.y >= liquidSurfaceY) {
          // Add small volume increment
          state.liquidLevelMl = Math.min(state.maxBeakerCapacity, state.liquidLevelMl + 0.08);
          state.sloshVelocity += (p.vx * 0.005);

          // Random wall splatter
          if (Math.random() < 0.25) {
            this.splatters.push({
              x: p.x,
              y: p.y,
              size: 2 + Math.random() * 3,
              alpha: 0.8,
              slideSpeed: 3 + Math.random() * 6,
            });
          }

          this.particles.splice(i, 1);
        }
      }
    }

    // 7. Update glass splatters (slowly sliding down with viscosity)
    for (let s = this.splatters.length - 1; s >= 0; s--) {
      const sp = this.splatters[s];
      sp.y += sp.slideSpeed * dt;
      sp.alpha -= 0.03 * dt;
      if (sp.alpha <= 0 || sp.y > beakerBounds.y + beakerBounds.height) {
        this.splatters.splice(s, 1);
      }
    }
  }

  // Register a manual or automated stroke event
  recordStroke(amplitude: number = 1.0) {
    const now = performance.now();
    if (this.lastStrokeTime > 0) {
      const interval = (now - this.lastStrokeTime) / 1000;
      if (interval > 0.08) {
        const freq = 1 / interval;
        this.strokeHistory.push(freq);
        if (this.strokeHistory.length > 6) this.strokeHistory.shift();
      }
    }
    this.lastStrokeTime = now;
  }

  getSmoothedFrequency(): number {
    if (this.strokeHistory.length === 0) return 0;
    const now = performance.now();
    if (now - this.lastStrokeTime > 1200) {
      // Stroke ceased
      return 0;
    }
    const sum = this.strokeHistory.reduce((a, b) => a + b, 0);
    return sum / this.strokeHistory.length;
  }

  // Calculate specimen grade based on conditions during extraction
  evaluateBatchGrade(motility: number, volume: number): SpecimenGrade {
    if (motility >= 95 && volume >= 15) return 'MYTHIC';
    if (motility >= 90) return 'S';
    if (motility >= 80) return 'A';
    if (motility >= 70) return 'B';
    if (motility >= 60) return 'C';
    return 'D';
  }

  // Calculate yield bonus tier and percentage from donor satisfaction
  static getSatisfactionTier(satisfaction: number): {
    tier: 'Baseline' | 'Moderate' | 'High' | 'Euphoric' | 'Ecstatic' | 'Transcendent';
    tierIndex: number;
    bonusPercent: number;
    color: string;
    description: string;
  } {
    if (satisfaction >= 100) {
      return {
        tier: 'Transcendent',
        tierIndex: 5,
        bonusPercent: 150,
        color: 'text-amber-300',
        description: '+150% Yield & Mythic Potency',
      };
    }
    if (satisfaction >= 90) {
      return {
        tier: 'Ecstatic',
        tierIndex: 4,
        bonusPercent: 100,
        color: 'text-pink-400',
        description: '+100% Yield & S-Grade Viability',
      };
    }
    if (satisfaction >= 75) {
      return {
        tier: 'Euphoric',
        tierIndex: 3,
        bonusPercent: 65,
        color: 'text-purple-400',
        description: '+65% Yield & Motility Boost',
      };
    }
    if (satisfaction >= 50) {
      return {
        tier: 'High',
        tierIndex: 2,
        bonusPercent: 35,
        color: 'text-emerald-400',
        description: '+35% Yield Bonus',
      };
    }
    if (satisfaction >= 25) {
      return {
        tier: 'Moderate',
        tierIndex: 1,
        bonusPercent: 15,
        color: 'text-cyan-400',
        description: '+15% Yield Bonus',
      };
    }
    return {
      tier: 'Baseline',
      tierIndex: 0,
      bonusPercent: 0,
      color: 'text-slate-400',
      description: 'Standard Yield Output',
    };
  }
}
