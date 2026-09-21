import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExtractionPhysicsEngine, MachineState } from './utils/physicsEngine';
import { soundManager } from './utils/audio';
import { hapticManager } from './utils/haptics';
import { INITIAL_UPGRADES } from './data/upgrades';
import { DONOR_PROFILES } from './data/donors';
import {
  DonorProfile,
  UpgradeItem,
  ClinicalOrder,
  ExtractionStats,
  ActiveSpecimenBatch,
} from './types';
import { PhysicsViewport } from './components/PhysicsViewport';
import { MobileControls } from './components/MobileControls';
import { UpgradesPanel } from './components/UpgradesPanel';
import { DonorRoster } from './components/DonorRoster';
import { ContractsBoard } from './components/ContractsBoard';
import { SpecimenReportModal } from './components/SpecimenReportModal';
import { StatsModal } from './components/StatsModal';
import { HeaderBar } from './components/HeaderBar';
import { SpecimenCupCard } from './components/SpecimenCupCard';

const STORAGE_KEY = 'semen_extractor_game_save_v1';

export default function App() {
  // --- Persistent Game State ---
  const [credits, setCredits] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).credits ?? 50;
    } catch {
      // ignore
    }
    return 50;
  });

  const [storedSpecimenMl, setStoredSpecimenMl] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).storedSpecimenMl ?? 0;
    } catch {
      // ignore
    }
    return 0;
  });

  const [upgrades, setUpgrades] = useState<UpgradeItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && JSON.parse(saved).upgrades) {
        const savedUpgrades = JSON.parse(saved).upgrades;
        return INITIAL_UPGRADES.map((init) => {
          const match = savedUpgrades.find((u: UpgradeItem) => u.id === init.id);
          return match ? { ...init, level: match.level } : init;
        });
      }
    } catch {
      // ignore
    }
    return INITIAL_UPGRADES;
  });

  const [activeDonor, setActiveDonor] = useState<DonorProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && JSON.parse(saved).activeDonorId) {
        const match = DONOR_PROFILES.find((d) => d.id === JSON.parse(saved).activeDonorId);
        if (match) return match;
      }
    } catch {
      // ignore
    }
    return DONOR_PROFILES[0];
  });

  const [stats, setStats] = useState<ExtractionStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && JSON.parse(saved).stats) return JSON.parse(saved).stats;
    } catch {
      // ignore
    }
    return {
      totalExtractedMl: 0,
      totalCreditsEarned: 0,
      totalSurges: 0,
      highestSurgeMl: 0,
      highestMotility: 0,
      playtimeSeconds: 0,
      manualStrokes: 0,
    };
  });

  const [orders, setOrders] = useState<ClinicalOrder[]>([
    {
      id: 'order_1',
      client: 'Genesis Cryo-Bank',
      title: 'Emergency Cryo-Banking Supply',
      targetVolume: 12,
      minGrade: 'B',
      rewardCredits: 350,
      expirySeconds: 300,
      remainingSeconds: 300,
      progressVolume: 0,
      completed: false,
    },
    {
      id: 'order_2',
      client: 'Apex Fertility Institute',
      title: 'High-Motility Research Quota',
      targetVolume: 25,
      minGrade: 'A',
      rewardCredits: 1200,
      expirySeconds: 600,
      remainingSeconds: 600,
      progressVolume: 0,
      completed: false,
    },
    {
      id: 'order_3',
      client: 'Orbital Habitat Chimera',
      title: 'Long-Duration Colonization Bio-Reserve',
      targetVolume: 60,
      minGrade: 'S',
      rewardCredits: 5000,
      expirySeconds: 1200,
      remainingSeconds: 1200,
      progressVolume: 0,
      completed: false,
    },
  ]);

  // UI state
  const [activeTab, setActiveTab] = useState<'simulator' | 'upgrades' | 'donors' | 'orders'>('simulator');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => hapticManager.enabled);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [activeBatch, setActiveBatch] = useState<ActiveSpecimenBatch | null>(null);

  // --- Real-time Physics Engine & Machine State ---
  const engineRef = useRef<ExtractionPhysicsEngine>(new ExtractionPhysicsEngine());
  const machineStateRef = useRef<MachineState>({
    vacuumPressure: 0,
    targetVacuum: 35,
    strokePosition: 0.5,
    strokeVelocity: 0,
    currentFrequency: 0,
    temperature: 36.8,
    targetTemperature: 37.0,
    lubeLevel: 100,
    frictionCoeff: 0.2,
    resonance: 0,
    satisfaction: 0,
    satisfactionMilestone: 0,
    cadenceAccuracy: 0,
    vacuumAccuracy: 0,
    thermalComfort: 100,
    frictionComfort: 100,
    isSurging: false,
    surgeProgress: 0,
    heartRate: 75,
    liquidLevelMl: 4.2,
    maxBeakerCapacity: 50,
    sloshAngle: 0,
    sloshVelocity: 0,
  });

  // Keep soundManager and hapticManager in sync
  useEffect(() => {
    soundManager.enabled = soundEnabled;
  }, [soundEnabled]);

  const handleToggleHaptics = useCallback(() => {
    setHapticsEnabled((prev) => {
      const next = !prev;
      hapticManager.setEnabled(next);
      if (next) {
        hapticManager.triggerRibPass();
      }
      return next;
    });
  }, []);

  // Save game periodically
  useEffect(() => {
    const saveTimer = setInterval(() => {
      try {
        const payload = {
          credits,
          storedSpecimenMl,
          upgrades: upgrades.map((u) => ({ id: u.id, level: u.level })),
          activeDonorId: activeDonor.id,
          stats,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(saveTimer);
  }, [credits, storedSpecimenMl, upgrades, activeDonor, stats]);

  // Calculate dynamic stat totals from purchased upgrades
  const upgradeStats = React.useMemo(() => {
    let vacuumPower = 0;
    let strokePower = 1.0;
    let autoStrokesPerSec = 0;
    let autoVacuumRate = 0;
    let lubeCapacity = 100;
    let thermalStability = 1.0;
    let fluidFlowRate = 1.0;
    let specimenValueMultiplier = 1.0;
    let motilityBonus = 0;
    let surgeVolumeBonus = 0;
    let passiveIncome = 0;

    upgrades.forEach((u) => {
      if (u.level > 0) {
        if (u.stats.vacuumPower) vacuumPower += u.stats.vacuumPower * u.level;
        if (u.stats.strokePower) strokePower += (u.stats.strokePower - 1) * u.level;
        if (u.stats.autoStrokesPerSec) autoStrokesPerSec += u.stats.autoStrokesPerSec * u.level;
        if (u.stats.autoVacuumRate) autoVacuumRate += u.stats.autoVacuumRate * u.level;
        if (u.stats.lubeCapacity) lubeCapacity += u.stats.lubeCapacity * u.level;
        if (u.stats.thermalStability) thermalStability += u.stats.thermalStability * u.level;
        if (u.stats.fluidFlowRate) fluidFlowRate += u.stats.fluidFlowRate * u.level;
        if (u.stats.specimenValueMultiplier) specimenValueMultiplier += u.stats.specimenValueMultiplier * u.level;
        if (u.stats.motilityBonus) motilityBonus += u.stats.motilityBonus * u.level;
        if (u.stats.surgeVolumeBonus) surgeVolumeBonus += u.stats.surgeVolumeBonus * u.level;
        if (u.stats.passiveIncome) passiveIncome += u.stats.passiveIncome * u.level;
      }
    });

    return {
      vacuumPower,
      strokePower,
      autoStrokesPerSec,
      autoVacuumRate,
      lubeCapacity,
      thermalStability,
      fluidFlowRate,
      specimenValueMultiplier,
      motilityBonus,
      surgeVolumeBonus,
      passiveIncome,
    };
  }, [upgrades]);

  // Main Simulation Tick (60 FPS physics + state sync)
  useEffect(() => {
    let lastTime = performance.now();
    let passiveSecAccum = 0;

    const interval = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const state = machineStateRef.current;
      const engine = engineRef.current;

      // 1. Passive Auto-Piston Stroking or Active Click-Stroke Cycle
      if (upgradeStats.autoStrokesPerSec > 0 && !state.isSurging) {
        const autoPhase = (now * 0.001 * upgradeStats.autoStrokesPerSec) % 1;
        state.strokePosition = 0.5 + Math.sin(autoPhase * Math.PI * 2) * 0.35;
        state.strokeVelocity = Math.cos(autoPhase * Math.PI * 2) * upgradeStats.autoStrokesPerSec * 2;
        engine.recordStroke(0.8);
      } else if (state.isClickStroking && state.clickStrokeTime && !state.isManualDragging) {
        // Fast, tactile manual click stroke cycle (plunges down to base and returns smoothly)
        const elapsed = (now - state.clickStrokeTime) / 1000;
        const strokeDuration = 0.36; // 360ms per stroke
        if (elapsed >= strokeDuration) {
          state.isClickStroking = false;
          state.clickStrokeTime = undefined;
          state.strokePosition = 0.12;
          state.strokeVelocity = 0;
        } else {
          const t = elapsed / strokeDuration;
          // Smooth sine plunge: starts at 0.12, reaches 0.94 at mid-stroke (t=0.5), returns to 0.12
          state.strokePosition = 0.12 + Math.sin(t * Math.PI) * 0.82;
          state.strokeVelocity = Math.cos(t * Math.PI) * 6.5;
        }
      }

      // 2. Auto-Vacuum Governor
      if (upgradeStats.autoVacuumRate > 0) {
        const targetSweet = activeDonor.optimalVacuum;
        if (state.targetVacuum < targetSweet) {
          state.targetVacuum = Math.min(targetSweet, state.targetVacuum + upgradeStats.autoVacuumRate * dt * 5);
        }
      }

      // 3. Passive Research Grant Income ($ per second)
      passiveSecAccum += dt;
      if (passiveSecAccum >= 1.0) {
        if (upgradeStats.passiveIncome > 0) {
          setCredits((c) => c + Math.round(upgradeStats.passiveIncome));
          setStats((prev) => ({
            ...prev,
            totalCreditsEarned: prev.totalCreditsEarned + Math.round(upgradeStats.passiveIncome),
            playtimeSeconds: prev.playtimeSeconds + 1,
          }));
        }
        passiveSecAccum = 0;
      }

      // 4. Update frequency reading
      state.currentFrequency = engine.getSmoothedFrequency();

      // 5. Sound vacuum hum
      soundManager.updateVacuumHum(state.vacuumPressure);

      // 6. Resonance & Stimulation calculation
      const freqDelta = Math.abs(state.currentFrequency - activeDonor.optimalFrequency);
      const vacDelta = Math.abs(state.vacuumPressure - activeDonor.optimalVacuum);
      const tempDelta = Math.abs(state.temperature - 37.0);

      // Detailed Performance Metrics for Satisfaction Meter
      state.cadenceAccuracy = Math.max(0, Math.min(100, (1 - freqDelta / 1.5) * 100));
      state.vacuumAccuracy = Math.max(0, Math.min(100, (1 - vacDelta / 22) * 100));
      state.thermalComfort = Math.max(0, Math.min(100, (1 - tempDelta / 3.0) * 100));
      state.frictionComfort = state.lubeLevel >= 30 ? 100 : Math.max(0, (state.lubeLevel / 30) * 100);

      // Satisfaction Meter dynamics
      if (state.currentFrequency > 0.4 && state.vacuumPressure > 12) {
        const quality =
          (state.cadenceAccuracy * 0.4 +
            state.vacuumAccuracy * 0.3 +
            state.thermalComfort * 0.15 +
            state.frictionComfort * 0.15) /
          100;
        let satisfactionDelta = (quality - 0.35) * 14.0 * dt;
        if (state.lubeLevel < 20) {
          satisfactionDelta -= (1 - state.lubeLevel / 20) * 16.0 * dt;
        }
        state.satisfaction = Math.max(0, Math.min(100, state.satisfaction + satisfactionDelta));
      } else {
        state.satisfaction = Math.max(0, state.satisfaction - 3.5 * dt);
      }

      // Check for milestone threshold triggers & haptic feedback
      const currentTier = ExtractionPhysicsEngine.getSatisfactionTier(state.satisfaction);
      if (currentTier.tierIndex > state.satisfactionMilestone) {
        state.satisfactionMilestone = currentTier.tierIndex;
        hapticManager.triggerMilestone(currentTier.tierIndex);
        soundManager.playLevelUp();
      } else if (currentTier.tierIndex < state.satisfactionMilestone) {
        state.satisfactionMilestone = currentTier.tierIndex;
      }

      // Calculate stimulation increment
      let stimRate = 0;
      if (state.currentFrequency > 0.5 && state.vacuumPressure > 15) {
        // Frequency alignment multiplier (0 to 1)
        const freqScore = Math.max(0, 1 - freqDelta / 1.5);
        // Vacuum score
        const vacScore = Math.max(0, 1 - vacDelta / 25);
        // Thermal score
        const tempScore = Math.max(0, 1 - tempDelta / 3.0);

        const resonanceFactor = (freqScore * 0.5 + vacScore * 0.35 + tempScore * 0.15);
        stimRate = resonanceFactor * 16.0 * upgradeStats.strokePower;

        // Minor fluid dribble during high stimulation
        if (state.resonance > 50 && Math.random() < 0.15) {
          engine.spawnFluidBurst(window.innerWidth * 0.25, 120, 2, 0.8, activeDonor.viscosityRating);
        }
      } else {
        // Natural gradual decay if untouched
        stimRate = -4.0;
      }

      state.resonance = Math.max(0, Math.min(100, state.resonance + stimRate * dt));

      // 7. Dynamic Heart Rate
      const targetBpm = 70 + (state.resonance / 100) * 85 + (state.isSurging ? 25 : 0);
      state.heartRate += (targetBpm - state.heartRate) * dt * 2.0;

      // 8. Update physical engine particles & slosh
      const tubePath = [
        { x: 120, y: 120 },
        { x: 180, y: 80 },
        { x: 260, y: 90 },
        { x: 300, y: 140 },
      ];
      const beakerBounds = { x: 260, y: 120, width: 80, height: 140 };
      engine.update(state, dt, 360, 280, tubePath, beakerBounds);
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [activeDonor, upgradeStats]);

  // Handle Manual Stroke Action
  const handleManualStroke = useCallback((velocity: number) => {
    const state = machineStateRef.current;
    state.strokeVelocity = velocity > 0 ? 5.2 : -5.2;
    state.manualStrokes = (state.manualStrokes || 0) + 1;
    engineRef.current.recordStroke(velocity);

    soundManager.playStroke(velocity, state.lubeLevel);

    setStats((prev) => ({
      ...prev,
      manualStrokes: prev.manualStrokes + 1,
    }));

    // Trigger immediate mechanical stroke movement along shaft
    state.isClickStroking = true;
    state.clickStrokeTime = performance.now();

    // Pull vacuum pressure up on downward stroke
    state.vacuumPressure = Math.min(100, state.vacuumPressure + 2.5);

    // Suction pull extracts semen directly through the tube into the cup
    state.liquidLevelMl = Math.min(state.maxBeakerCapacity, state.liquidLevelMl + 0.22);

    // Agitate fluid slosh in beaker
    state.sloshVelocity += (Math.random() - 0.5) * 0.25;

    // Spawn fluid lubrication droplets if lubed
    if (state.lubeLevel > 20 && Math.random() < 0.3) {
      engineRef.current.spawnFluidBurst(120, 130, 2, 0.6, 0.4);
    }
  }, []);

  // Handle Lube Spray
  const handleApplyLube = useCallback(() => {
    const state = machineStateRef.current;
    state.lubeLevel = Math.min(100, state.lubeLevel + 40);
    soundManager.playLubeSpray();
    hapticManager.triggerLubrication();
  }, []);

  // Handle Trigger Extraction Surge
  const handleTriggerSurge = useCallback(() => {
    const state = machineStateRef.current;
    if (state.resonance < 99 || state.isSurging) return;

    state.isSurging = true;
    soundManager.playSurgeTriumph();
    soundManager.playViscousSpurt();

    // Advanced multi-stage climax haptic escalation
    hapticManager.triggerSurgeClimax();

    // Spawn massive multi-stage physical fluid bursts!
    const burstCount = 6;
    for (let b = 0; b < burstCount; b++) {
      setTimeout(() => {
        engineRef.current.spawnFluidBurst(140, 125, 25, 2.2, activeDonor.viscosityRating);
        soundManager.playFluidDrip(0.9 + b * 0.1);
      }, b * 120);
    }

    // Satisfaction & Yield Bonus Calculations
    const currentSatisfaction = Math.min(100, Math.max(0, state.satisfaction));
    const tierInfo = ExtractionPhysicsEngine.getSatisfactionTier(currentSatisfaction);
    const yieldBonusPercent = tierInfo.bonusPercent;

    const baseVol = activeDonor.baseVolume + upgradeStats.surgeVolumeBonus;
    const randomVar = 0.85 + Math.random() * 0.35;
    const baseVolumeExtracted = parseFloat((baseVol * randomVar).toFixed(1));
    const bonusVolumeExtracted = parseFloat((baseVolumeExtracted * (yieldBonusPercent / 100)).toFixed(1));
    const totalVolumeExtracted = parseFloat((baseVolumeExtracted + bonusVolumeExtracted).toFixed(1));

    // Satisfaction Purity Motility Boost
    const satisfactionMotilityBoost = tierInfo.tierIndex * 2.0;
    const motility = Math.min(
      99.8,
      activeDonor.motilityBaseline + upgradeStats.motilityBonus + satisfactionMotilityBoost + (Math.random() * 2 - 1)
    );

    const grade = engineRef.current.evaluateBatchGrade(motility, totalVolumeExtracted);

    // Value calculation
    const baseValuePerMl = 25;
    let gradeMult = 1.0;
    if (grade === 'MYTHIC') gradeMult = 4.5;
    else if (grade === 'S') gradeMult = 2.8;
    else if (grade === 'A') gradeMult = 1.8;
    else if (grade === 'B') gradeMult = 1.3;

    const totalPayout = Math.round(
      totalVolumeExtracted * baseValuePerMl * gradeMult * upgradeStats.specimenValueMultiplier
    );

    setTimeout(() => {
      state.isSurging = false;
      state.resonance = 0; // Reset after release
      state.satisfaction = 0;
      state.satisfactionMilestone = 0;
      hapticManager.resetMilestones();

      // Add to beaker and stored vault
      state.liquidLevelMl = Math.min(state.maxBeakerCapacity, state.liquidLevelMl + totalVolumeExtracted);
      setStoredSpecimenMl((v) => v + totalVolumeExtracted);
      setCredits((c) => c + totalPayout);

      // Update statistics
      setStats((prev) => ({
        ...prev,
        totalExtractedMl: prev.totalExtractedMl + totalVolumeExtracted,
        totalCreditsEarned: prev.totalCreditsEarned + totalPayout,
        totalSurges: prev.totalSurges + 1,
        highestSurgeMl: Math.max(prev.highestSurgeMl, totalVolumeExtracted),
        highestMotility: Math.max(prev.highestMotility, motility),
      }));

      // Show Analysis Certificate Modal with Yield Bonus breakdown
      setActiveBatch({
        id: `BATCH-${Date.now()}`,
        volumeMl: totalVolumeExtracted,
        baseVolumeMl: baseVolumeExtracted,
        bonusVolumeMl: bonusVolumeExtracted,
        yieldBonusPercent,
        satisfactionPercent: currentSatisfaction,
        satisfactionTier: tierInfo.tier,
        motility,
        grade,
        cellDensityMillion: Math.round(55 + Math.random() * 65),
        marketValue: totalPayout,
        timestamp: Date.now(),
      });
    }, burstCount * 120 + 400);
  }, [activeDonor, upgradeStats]);

  // Quick Sell from Beaker Flask
  const handleQuickSellFlask = () => {
    const state = machineStateRef.current;
    if (state.liquidLevelMl <= 0.5) return;

    const vol = state.liquidLevelMl;
    const payout = Math.round(vol * 28 * upgradeStats.specimenValueMultiplier);
    state.liquidLevelMl = 0;

    setCredits((c) => c + payout);
    setStats((prev) => ({
      ...prev,
      totalCreditsEarned: prev.totalCreditsEarned + payout,
    }));
    soundManager.playCashRegister();
  };

  // Purchase Upgrade
  const handlePurchaseUpgrade = (upgradeId: string) => {
    const target = upgrades.find((u) => u.id === upgradeId);
    if (!target) return;

    const cost = Math.round(target.baseCost * Math.pow(target.costMultiplier, target.level));
    if (credits < cost || target.level >= target.maxLevel) return;

    setCredits((c) => c - cost);
    setUpgrades((prev) =>
      prev.map((u) => (u.id === upgradeId ? { ...u, level: u.level + 1 } : u))
    );
    soundManager.playUpgradeChime();
  };

  // Fulfill Contract Order
  const handleFulfillOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || storedSpecimenMl < order.targetVolume || order.completed) return;

    setStoredSpecimenMl((v) => v - order.targetVolume);
    setCredits((c) => c + order.rewardCredits);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, completed: true } : o))
    );
    soundManager.playSurgeTriumph();
  };

  // Reset Game Data
  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all laboratory progress?')) {
      localStorage.removeItem(STORAGE_KEY);
      setCredits(50);
      setStoredSpecimenMl(0);
      setUpgrades(INITIAL_UPGRADES);
      setActiveDonor(DONOR_PROFILES[0]);
      setStats({
        totalExtractedMl: 0,
        totalCreditsEarned: 0,
        totalSurges: 0,
        highestSurgeMl: 0,
        highestMotility: 0,
        playtimeSeconds: 0,
        manualStrokes: 0,
      });
      setShowStatsModal(false);
    }
  };

  // Active upgrade levels for visual and tactile resonance
  const sleeveUpgradeLevel = upgrades.find((u) => u.id === 'upg_sleeve_material')?.level || 1;
  const resonatorUpgradeLevel = upgrades.find((u) => u.id === 'upg_ultrasonic_resonator')?.level || 0;
  const vacuumUpgradeLevel = upgrades.find((u) => u.id === 'upg_dual_diaphragm_pump')?.level || 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-3 sm:p-4 select-none">
      <div className="w-full max-w-lg flex flex-col gap-3">
        {/* Top Header Bar */}
        <HeaderBar
          credits={credits}
          storedVolumeMl={storedSpecimenMl}
          beakerVolumeMl={machineStateRef.current.liquidLevelMl}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenStats={() => setShowStatsModal(true)}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((s) => !s)}
          hapticsEnabled={hapticsEnabled}
          onToggleHaptics={handleToggleHaptics}
          onQuickSellFlask={handleQuickSellFlask}
        />

        {/* TAB CONTENT */}
        {activeTab === 'simulator' && (
          <main className="w-full flex flex-col gap-3">
            {/* Active Donor Information Pill */}
            <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: activeDonor.avatarColor }}
                />
                <span className="font-bold text-slate-200">{activeDonor.name}</span>
                <span className="text-cyan-400 text-[10px]">({activeDonor.codename})</span>
              </div>
              <button
                onClick={() => setActiveTab('donors')}
                className="text-cyan-400 hover:text-cyan-300 text-[11px] underline"
              >
                Switch Donor
              </button>
            </div>

            {/* Physics Viewport Canvas */}
            <PhysicsViewport
              engine={engineRef.current}
              state={machineStateRef.current}
              activeDonor={activeDonor}
              onManualStroke={handleManualStroke}
              vacuumPowerBonus={upgradeStats.vacuumPower}
              sleeveUpgradeLevel={sleeveUpgradeLevel}
              resonatorUpgradeLevel={resonatorUpgradeLevel}
            />

            {/* Prominent Specimen Cup Card holding Semen */}
            <SpecimenCupCard
              state={machineStateRef.current}
              activeDonor={activeDonor}
              onQuickSellFlask={handleQuickSellFlask}
            />

            {/* Tactile Mobile Controls */}
            <MobileControls
              state={machineStateRef.current}
              activeDonor={activeDonor}
              onManualStroke={handleManualStroke}
              onApplyLube={handleApplyLube}
              onTriggerSurge={handleTriggerSurge}
              onSetVacuum={(val) => {
                machineStateRef.current.targetVacuum = val;
              }}
              onSetTemperature={(val) => {
                machineStateRef.current.targetTemperature = val;
              }}
              vacuumPowerBonus={upgradeStats.vacuumPower}
              sleeveUpgradeLevel={sleeveUpgradeLevel}
            />
          </main>
        )}

        {activeTab === 'upgrades' && (
          <UpgradesPanel
            upgrades={upgrades}
            credits={credits}
            onPurchaseUpgrade={handlePurchaseUpgrade}
          />
        )}

        {activeTab === 'donors' && (
          <DonorRoster
            donors={DONOR_PROFILES}
            activeDonorId={activeDonor.id}
            lifetimeCredits={stats.totalCreditsEarned}
            onSelectDonor={(d) => {
              setActiveDonor(d);
              setActiveTab('simulator');
            }}
          />
        )}

        {activeTab === 'orders' && (
          <ContractsBoard
            orders={orders}
            storedSpecimenMl={storedSpecimenMl}
            onFulfillOrder={handleFulfillOrder}
          />
        )}

        {/* Analysis Certificate Modal */}
        <SpecimenReportModal
          batch={activeBatch}
          onClose={() => setActiveBatch(null)}
        />

        {/* Stats & Laboratory Diagnostic Modal */}
        {showStatsModal && (
          <StatsModal
            stats={stats}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((s) => !s)}
            onClose={() => setShowStatsModal(false)}
            onResetData={handleResetData}
          />
        )}
      </div>
    </div>
  );
}
