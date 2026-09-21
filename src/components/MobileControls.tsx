import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MachineState } from '../utils/physicsEngine';
import { DonorProfile } from '../types';
import { soundManager } from '../utils/audio';
import { hapticManager } from '../utils/haptics';
import { SatisfactionMeter } from './SatisfactionMeter';
import { Droplet, Flame, Gauge, Zap, Waves, Sparkles } from 'lucide-react';

interface MobileControlsProps {
  state: MachineState;
  activeDonor: DonorProfile;
  onManualStroke: (velocity: number) => void;
  onApplyLube: () => void;
  onTriggerSurge: () => void;
  onSetVacuum: (val: number, immediatePull?: boolean) => void;
  onSetTemperature: (val: number) => void;
  vacuumPowerBonus: number;
  sleeveUpgradeLevel?: number;
  resonatorUpgradeLevel?: number;
  vacuumUpgradeLevel?: number;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  state,
  activeDonor,
  onManualStroke,
  onApplyLube,
  onTriggerSurge,
  onSetVacuum,
  onSetTemperature,
  vacuumPowerBonus,
  sleeveUpgradeLevel = 1,
  resonatorUpgradeLevel = 0,
  vacuumUpgradeLevel = 1,
}) => {
  const [strokePressed, setStrokePressed] = useState(false);
  const [lubePressed, setLubePressed] = useState(false);
  const [vacPumping, setVacPumping] = useState(false);
  const strokeIntervalRef = useRef<number | null>(null);

  const performStroke = useCallback(() => {
    onManualStroke(1.5);
    hapticManager.triggerStrokeResistance({
      vacuumPressure: state.vacuumPressure,
      lubeLevel: state.lubeLevel,
      strokeVelocity: 1.5,
      sleeveUpgradeLevel,
      resonatorUpgradeLevel,
      vacuumUpgradeLevel,
    });
  }, [onManualStroke, state.vacuumPressure, state.lubeLevel, sleeveUpgradeLevel, resonatorUpgradeLevel, vacuumUpgradeLevel]);

  const handleStrokePress = useCallback(() => {
    setStrokePressed(true);
    performStroke();

    if (strokeIntervalRef.current) {
      clearInterval(strokeIntervalRef.current);
    }
    strokeIntervalRef.current = window.setInterval(() => {
      performStroke();
    }, 360);
  }, [performStroke]);

  const handleStrokeRelease = useCallback(() => {
    setStrokePressed(false);
    if (strokeIntervalRef.current) {
      clearInterval(strokeIntervalRef.current);
      strokeIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (strokeIntervalRef.current) {
        clearInterval(strokeIntervalRef.current);
      }
    };
  }, []);

  const handleLubeClick = () => {
    setLubePressed(true);
    onApplyLube();
    setTimeout(() => setLubePressed(false), 900);
  };

  const handleVacuumPump = () => {
    setVacPumping(true);
    const nextVal = Math.min(maxVacuumAllowed, Math.round(state.targetVacuum + 10));
    onSetVacuum(nextVal, true);
    setTimeout(() => setVacPumping(false), 500);
  };

  const handleVacuumChange = (val: number) => {
    onSetVacuum(val, false);
  };

  // Determine resonance sweet spot status
  const freqDelta = Math.abs(state.currentFrequency - activeDonor.optimalFrequency);
  const vacDelta = Math.abs(state.vacuumPressure - activeDonor.optimalVacuum);
  const isSweetSpot = freqDelta < 0.6 && vacDelta < 12;

  const maxVacuumAllowed = 50 + vacuumPowerBonus;

  return (
    <div id="mobile-controls-panel" className="w-full flex flex-col gap-2.5 sm:gap-3">
      {/* 1. SATISFACTION METER & YIELD BONUS TRACKER */}
      <SatisfactionMeter state={state} activeDonor={activeDonor} />

      {/* 2. Dynamic Resonance & Stimulation Bar */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-lg">
        <div className="flex items-center justify-between text-xs mb-1 font-mono">
          <div className="flex items-center gap-1.5">
            <Zap className={`w-3.5 h-3.5 ${state.resonance > 80 ? 'text-pink-400 animate-bounce' : 'text-amber-400'}`} />
            <span className="text-slate-300 font-semibold">Resonance / Stimulation</span>
          </div>
          <span className={`font-bold ${state.resonance >= 100 ? 'text-pink-400 animate-pulse' : 'text-cyan-400'}`}>
            {state.resonance.toFixed(0)}%
          </span>
        </div>

        {/* Progress Bar with Sweet-Spot Glow */}
        <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-150 rounded-full ${
              state.resonance >= 100
                ? 'bg-gradient-to-r from-pink-500 via-rose-400 to-amber-300 animate-pulse'
                : state.resonance > 60
                ? 'bg-gradient-to-r from-cyan-500 to-pink-500'
                : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
            }`}
            style={{ width: `${Math.min(100, state.resonance)}%` }}
          />
        </div>

        {/* Sweet Spot Cadence Alignment Indicators */}
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1">
            <Waves className="w-3 h-3 text-cyan-400" />
            <span>Cadence:</span>
            <span className={freqDelta < 0.5 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
              {state.currentFrequency.toFixed(1)} Hz
            </span>
            <span className="text-slate-500 text-[10px]">(Sweet: {activeDonor.optimalFrequency.toFixed(1)})</span>
          </div>

          <div className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
            isSweetSpot ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
          }`}>
            {isSweetSpot ? '★ In Rhythm' : 'Adjust Cadence'}
          </div>
        </div>
      </div>

      {/* 3. Main Touch Interaction Buttons Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {/* BIG RHYTHMIC STROKE ACTION BUTTON */}
        <button
          id="btn-rhythmic-stroke"
          onMouseDown={handleStrokePress}
          onMouseUp={handleStrokeRelease}
          onMouseLeave={handleStrokeRelease}
          onTouchStart={handleStrokePress}
          onTouchEnd={handleStrokeRelease}
          onTouchCancel={handleStrokeRelease}
          className={`relative h-24 sm:h-28 rounded-xl flex flex-col items-center justify-center p-2.5 sm:p-3 border transition-all select-none active:scale-[0.98] ${
            strokePressed
              ? 'bg-cyan-600 border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.6)] text-white'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 border-cyan-500/30 hover:border-cyan-400 text-slate-200'
          }`}
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mb-1">
            <Waves className={`w-5 h-5 sm:w-6 sm:h-6 text-cyan-300 ${strokePressed ? 'scale-125' : ''} transition-transform`} />
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-wide">PUMP / STROKE</span>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono mt-0.5">Tap / Hold in rhythm</span>
        </button>

        {/* OVERDRIVE EXTRACTION BURST TRIGGER */}
        <button
          id="btn-trigger-surge"
          disabled={state.resonance < 100}
          onClick={onTriggerSurge}
          className={`relative h-24 sm:h-28 rounded-xl flex flex-col items-center justify-center p-2.5 sm:p-3 border transition-all select-none ${
            state.resonance >= 100
              ? 'bg-gradient-to-b from-pink-600 to-rose-700 border-pink-300 shadow-[0_0_30px_rgba(236,72,153,0.8)] text-white animate-pulse active:scale-95'
              : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center mb-1 ${
            state.resonance >= 100 ? 'bg-white/20 border border-white' : 'bg-slate-800/40 border border-slate-800'
          }`}>
            <Zap className={`w-5 h-5 sm:w-6 sm:h-6 ${state.resonance >= 100 ? 'text-yellow-300' : 'text-slate-600'}`} />
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-wide">
            {state.resonance >= 100 ? 'TRIGGER SURGE' : 'CHARGING SURGE'}
          </span>
          <span className="text-[9px] sm:text-[10px] font-mono mt-0.5">
            {state.resonance >= 100 ? '⚡ READY FOR SURGE ⚡' : `${Math.round(state.resonance)}% / 100%`}
          </span>
        </button>
      </div>

      {/* 4. Secondary Controls: Dedicated Vacuum Pump & Lube Dispenser & Thermal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Vacuum Control Card with Prominent Vacuum Button */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs mb-1 font-mono">
            <span className="text-slate-300 flex items-center gap-1 font-semibold">
              <Gauge className={`w-3.5 h-3.5 ${state.vacuumPressure > 10 ? 'text-cyan-400' : 'text-slate-400'}`} /> Vacuum Pump
            </span>
            <span className="text-cyan-300 font-bold font-mono">
              {Math.round(state.vacuumPressure)} <span className="text-slate-400 text-[10px]">/ {Math.round(state.targetVacuum)} kPa</span>
            </span>
          </div>

          {/* Dedicated Vacuum Pump Button */}
          <button
            id="btn-vacuum-pump"
            onClick={handleVacuumPump}
            title="Pump and boost vacuum suction pressure"
            className={`w-full py-2 px-2.5 rounded-lg border font-mono font-bold text-xs flex items-center justify-between transition-all active:scale-95 shadow ${
              vacPumping
                ? 'bg-cyan-500 border-white text-slate-950 scale-[0.98]'
                : state.vacuumPressure > 15
                ? 'bg-gradient-to-r from-cyan-950 to-slate-900 border-cyan-500/60 text-cyan-300 hover:border-cyan-400'
                : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200 hover:text-cyan-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Zap className={`w-3.5 h-3.5 ${vacPumping ? 'animate-spin text-white' : 'text-cyan-400'}`} />
              {vacPumping ? 'PUMPING...' : 'PUMP VACUUM (+10)'}
            </span>
            <span className="text-[10px] text-cyan-400 bg-slate-950/70 px-1.5 py-0.5 rounded border border-cyan-500/30">
              {state.vacuumPressure > activeDonor.optimalVacuum + 15
                ? 'High'
                : Math.abs(state.vacuumPressure - activeDonor.optimalVacuum) < 8
                ? 'Seal Lock'
                : 'Suction'}
            </span>
          </button>

          {/* Quick Preset Buttons: Sweet Spot & Vent */}
          <div className="flex gap-1 mt-1.5">
            <button
              id="btn-vacuum-sweet"
              onClick={() => onSetVacuum(activeDonor.optimalVacuum, true)}
              title="Snap immediately to donor's optimal vacuum sweet spot"
              className={`flex-1 py-1 px-1.5 text-[10px] font-mono rounded-lg border flex items-center justify-center gap-1 transition-all ${
                Math.abs(state.targetVacuum - activeDonor.optimalVacuum) < 3
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)] font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-300 hover:border-slate-700'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
              Sweet: {activeDonor.optimalVacuum}
            </button>
            <button
              id="btn-vacuum-vent"
              onClick={() => onSetVacuum(0, false)}
              title="Release pneumatic vacuum seal"
              className="py-1 px-2 text-[10px] font-mono rounded-lg border bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-300 hover:border-rose-900/50 transition-colors"
            >
              Vent (0)
            </button>
          </div>

          {/* Fine Tuning Slider */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <input
              id="slider-vacuum-pressure"
              type="range"
              min="0"
              max={maxVacuumAllowed}
              step="2"
              value={state.targetVacuum}
              onChange={(e) => handleVacuumChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded cursor-pointer"
            />
            <span className="text-[9px] font-mono text-cyan-400 w-9 text-right shrink-0">
              {Math.round(state.targetVacuum)}k
            </span>
          </div>
        </div>

        {/* Lubricant Dispenser Button with Instant Visual Slather Feedback */}
        <button
          id="btn-apply-lube"
          onClick={handleLubeClick}
          className={`border rounded-xl p-2.5 flex flex-col justify-between transition-all active:scale-95 shadow-md ${
            lubePressed
              ? 'border-cyan-400 bg-cyan-950/80 shadow-[0_0_16px_rgba(6,182,212,0.5)]'
              : state.lubeLevel < 20
              ? 'border-rose-500/60 bg-rose-950/30 hover:border-rose-400'
              : 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850'
          }`}
        >
          <div className="w-full flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-1.5 font-semibold">
              <Droplet className={`w-3.5 h-3.5 ${lubePressed ? 'text-cyan-300 animate-bounce' : state.lubeLevel < 20 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} />
              Silicone Lube
            </span>
            <span className={state.lubeLevel < 20 ? 'text-rose-400 font-bold animate-pulse' : 'text-cyan-300 font-bold'}>
              {Math.round(state.lubeLevel)}%
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden my-1.5 p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                state.lubeLevel < 20
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, state.lubeLevel))}%` }}
            />
          </div>
          <div className="w-full flex items-center justify-between text-[10px] font-mono">
            <span className={lubePressed ? 'text-cyan-200 font-bold animate-pulse' : 'text-cyan-400 font-medium'}>
              {lubePressed ? '✨ SLATHERING LUBE...' : '+ Slather Thick Lube'}
            </span>
            <span className="text-[9px] text-slate-400">
              {state.lubeLevel > 70 ? 'Ultra-Slick' : state.lubeLevel > 20 ? 'Lubed' : 'Dry!'}
            </span>
          </div>
        </button>

        {/* Thermal Regulation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" /> Sleeve Temp
            </span>
            <span className={Math.abs(state.temperature - 37.0) < 0.5 ? 'text-emerald-300 font-bold' : 'text-amber-300'}>
              {state.temperature.toFixed(1)}°C
            </span>
          </div>
          <div className="flex gap-1 mt-1.5">
            <button
              id="btn-temp-cool"
              onClick={() => onSetTemperature(35.5)}
              className={`flex-1 py-1 text-[10px] rounded font-mono border ${
                state.targetTemperature < 36.5 ? 'bg-cyan-900/50 border-cyan-500 text-cyan-200' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              35.5°
            </button>
            <button
              id="btn-temp-optimal"
              onClick={() => onSetTemperature(37.0)}
              className={`flex-1 py-1 text-[10px] rounded font-mono border ${
                Math.abs(state.targetTemperature - 37.0) < 0.3 ? 'bg-emerald-900/50 border-emerald-500 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              37.0° Ideal
            </button>
            <button
              id="btn-temp-warm"
              onClick={() => onSetTemperature(38.5)}
              className={`flex-1 py-1 text-[10px] rounded font-mono border ${
                state.targetTemperature > 37.5 ? 'bg-amber-900/50 border-amber-500 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              38.5°
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
