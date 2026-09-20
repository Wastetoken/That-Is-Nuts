export type SpecimenGrade = 'D' | 'C' | 'B' | 'A' | 'S' | 'MYTHIC';

export interface FluidParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  viscosity: number; // 0.1 (watery) to 1.0 (thick non-Newtonian)
  inTube: boolean;
  tubeProgress?: number;
  splattered?: boolean;
}

export interface DonorProfile {
  id: string;
  name: string;
  codename: string;
  avatarColor: string;
  description: string;
  baseVolume: number; // mL per surge
  optimalFrequency: number; // Hz (strokes per second)
  optimalVacuum: number; // kPa (e.g. 35-55)
  temperatureTolerance: [number, number]; // [min, max] Celsius
  viscosityRating: number; // 0-1
  motilityBaseline: number; // 60-98%
  unlockedAtCredits: number;
}

export interface UpgradeItem {
  id: string;
  name: string;
  category: 'pneumatics' | 'fluidics' | 'thermals' | 'automation';
  description: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  effectDescription: string;
  // Dynamic stat effects
  stats: {
    vacuumPower?: number; // +kPa max
    vacuumEfficiency?: number; // % seal retention
    strokePower?: number; // stimulation per stroke
    autoStrokesPerSec?: number; // idle strokes
    autoVacuumRate?: number; // idle suction
    lubeCapacity?: number; // max lube units
    thermalStability?: number; // resistance to temperature shift
    fluidFlowRate?: number; // mL/s suction speed
    specimenValueMultiplier?: number; // +% BioCredits per mL
    motilityBonus?: number; // +% purity
    surgeVolumeBonus?: number; // +mL per surge
    passiveIncome?: number; // BioCredits / sec
  };
}

export interface ClinicalOrder {
  id: string;
  client: string;
  title: string;
  targetVolume: number; // in mL
  minGrade: SpecimenGrade;
  rewardCredits: number;
  expirySeconds: number;
  remainingSeconds: number;
  progressVolume: number;
  completed: boolean;
}

export interface ExtractionStats {
  totalExtractedMl: number;
  totalCreditsEarned: number;
  totalSurges: number;
  highestSurgeMl: number;
  highestMotility: number;
  playtimeSeconds: number;
  manualStrokes: number;
}

export interface ActiveSpecimenBatch {
  id: string;
  volumeMl: number;
  baseVolumeMl: number;
  bonusVolumeMl: number;
  yieldBonusPercent: number;
  satisfactionPercent: number;
  satisfactionTier: 'Baseline' | 'Moderate' | 'High' | 'Euphoric' | 'Ecstatic' | 'Transcendent';
  motility: number;
  grade: SpecimenGrade;
  cellDensityMillion: number;
  marketValue: number;
  timestamp: number;
}
