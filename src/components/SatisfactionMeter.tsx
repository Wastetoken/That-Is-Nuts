import React from 'react';
import { MachineState, ExtractionPhysicsEngine } from '../utils/physicsEngine';
import { DonorProfile } from '../types';
import { HeartHandshake, Sparkles, TrendingUp, Check, AlertTriangle } from 'lucide-react';

interface SatisfactionMeterProps {
  state: MachineState;
  activeDonor: DonorProfile;
}

export const SatisfactionMeter: React.FC<SatisfactionMeterProps> = ({
  state,
  activeDonor,
}) => {
  const currentSatisfaction = Math.min(100, Math.max(0, state.satisfaction));
  const tierInfo = ExtractionPhysicsEngine.getSatisfactionTier(currentSatisfaction);

  // Milestone points
  const milestones = [
    { pct: 25, label: '+15%', name: 'Moderate' },
    { pct: 50, label: '+35%', name: 'High' },
    { pct: 75, label: '+65%', name: 'Euphoria' },
    { pct: 90, label: '+100%', name: 'Ecstatic' },
    { pct: 100, label: '+150%', name: 'Transcendent' },
  ];

  // Comfort alerts
  const isLubeLow = state.lubeLevel < 20;
  const isVacTooHigh = state.vacuumPressure > activeDonor.optimalVacuum + 18;
  const isTempOff = Math.abs(state.temperature - 37.0) > 2.0;

  return (
    <div
      id="satisfaction-meter-widget"
      className="w-full bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-lg flex flex-col gap-2 transition-all"
    >
      {/* Top Header: Title, Tier Badge & Current Yield Bonus */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-pink-500/20 border border-pink-400/40 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-200 tracking-tight font-mono">
                SATISFACTION
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded font-mono border ${
                  tierInfo.tierIndex >= 4
                    ? 'bg-gradient-to-r from-pink-500/30 to-amber-500/30 border-amber-400/60 text-amber-300 animate-pulse'
                    : tierInfo.tierIndex >= 2
                    ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {tierInfo.tier}
              </span>
            </div>
          </div>
        </div>

        {/* Current Yield Bonus Highlight */}
        <div className="flex items-center gap-1 shrink-0">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono font-black ${
              tierInfo.bonusPercent > 0
                ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>
              {tierInfo.bonusPercent > 0 ? `+${tierInfo.bonusPercent}% YIELD` : 'BASE YIELD'}
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-white min-w-[36px] text-right">
            {Math.round(currentSatisfaction)}%
          </span>
        </div>
      </div>

      {/* Main Gauge Progress Bar with Milestone Nodes */}
      <div className="relative w-full">
        {/* Progress Track */}
        <div className="relative w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              currentSatisfaction >= 100
                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse'
                : currentSatisfaction >= 75
                ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500'
                : currentSatisfaction >= 50
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                : 'bg-gradient-to-r from-cyan-700 to-cyan-500'
            }`}
            style={{ width: `${currentSatisfaction}%` }}
          />
        </div>

        {/* Milestone Tick Markers */}
        <div className="relative w-full h-3 mt-1 pointer-events-none overflow-visible">
          {milestones.map((m) => {
            const isReached = currentSatisfaction >= m.pct;
            const isLast = m.pct === 100;
            const isFirst = m.pct <= 25;
            const alignClass = isLast ? '-translate-x-[90%]' : isFirst ? '-translate-x-[20%]' : '-translate-x-1/2';
            return (
              <div
                key={m.pct}
                className={`absolute top-0 ${alignClass} flex flex-col items-center`}
                style={{ left: `${m.pct}%` }}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full border transition-colors ${
                    isReached
                      ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                />
                <span
                  className={`text-[8px] font-mono leading-none mt-0.5 whitespace-nowrap ${
                    isReached ? 'text-emerald-300 font-bold' : 'text-slate-500'
                  }`}
                >
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Factors Diagnostics Strip */}
      <div className="grid grid-cols-4 gap-1 pt-1 text-[10px] font-mono">
        {/* Cadence Rhythm */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded p-1 flex flex-col items-center justify-center text-center">
          <span className="text-slate-500 text-[9px]">Cadence</span>
          <span
            className={`font-semibold ${
              state.cadenceAccuracy > 80
                ? 'text-emerald-400'
                : state.cadenceAccuracy > 50
                ? 'text-cyan-400'
                : 'text-slate-400'
            }`}
          >
            {Math.round(state.cadenceAccuracy)}%
          </span>
        </div>

        {/* Vacuum Seal */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded p-1 flex flex-col items-center justify-center text-center">
          <span className="text-slate-500 text-[9px]">Seal</span>
          <span
            className={`font-semibold ${
              isVacTooHigh
                ? 'text-rose-400'
                : state.vacuumAccuracy > 80
                ? 'text-emerald-400'
                : state.vacuumAccuracy > 50
                ? 'text-cyan-400'
                : 'text-slate-400'
            }`}
          >
            {Math.round(state.vacuumAccuracy)}%
          </span>
        </div>

        {/* Silicone Lubrication */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded p-1 flex flex-col items-center justify-center text-center">
          <span className="text-slate-500 text-[9px]">Lube</span>
          <span
            className={`font-semibold ${
              isLubeLow
                ? 'text-rose-400 animate-pulse'
                : state.lubeLevel > 50
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            {Math.round(state.lubeLevel)}%
          </span>
        </div>

        {/* Thermal Regulation */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded p-1 flex flex-col items-center justify-center text-center">
          <span className="text-slate-500 text-[9px]">Temp</span>
          <span
            className={`font-semibold ${
              isTempOff
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {state.temperature.toFixed(1)}°
          </span>
        </div>
      </div>

      {/* Warning / Advice hint if any parameter is hurting satisfaction */}
      {(isLubeLow || isVacTooHigh || isTempOff) && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded px-2 py-1 text-[10px] font-mono text-rose-300 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
          <span className="truncate">
            {isLubeLow
              ? 'Friction alert: Spray lubricant to prevent discomfort!'
              : isVacTooHigh
              ? 'Suction pressure too high: Lower vacuum closer to sweet spot!'
              : 'Thermal variance: Adjust sleeve heater toward 37.0°C!'}
          </span>
        </div>
      )}
    </div>
  );
};
