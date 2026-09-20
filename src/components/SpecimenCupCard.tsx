import React from 'react';
import { MachineState } from '../utils/physicsEngine';
import { DonorProfile } from '../types';
import { Beaker, Sparkles, ArrowDownToLine, DollarSign, Droplets, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { hapticManager } from '../utils/haptics';

interface SpecimenCupCardProps {
  state: MachineState;
  activeDonor: DonorProfile;
  onQuickSellFlask: () => void;
  onDepositToVault?: (amount: number) => void;
}

export const SpecimenCupCard: React.FC<SpecimenCupCardProps> = ({
  state,
  activeDonor,
  onQuickSellFlask,
  onDepositToVault,
}) => {
  const currentVolume = Math.max(0, state.liquidLevelMl);
  const maxCapacity = state.maxBeakerCapacity || 50;
  const fillPercent = Math.min(100, Math.round((currentVolume / maxCapacity) * 100));

  // Estimated value calculation
  const baseValuePerMl = 28;
  const estimatedValue = Math.round(currentVolume * baseValuePerMl);

  const handleSell = () => {
    if (currentVolume < 0.5) return;
    soundManager.playCashRegister();
    hapticManager.triggerSpecimenCollected();
    onQuickSellFlask();
  };

  return (
    <div
      id="specimen-cup-display-card"
      className="w-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl p-3.5 sm:p-4 shadow-xl shadow-cyan-950/20"
    >
      {/* Header bar of the Cup Card */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Beaker className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold tracking-wide text-slate-100 flex items-center gap-1.5">
              CLINICAL SPECIMEN CUP
              {fillPercent >= 90 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950 border border-rose-500/50 text-rose-300 animate-pulse">
                  NEAR FULL
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Collecting donor specimen from suction tube
            </p>
          </div>
        </div>

        {/* Live Volume Counter */}
        <div className="text-right font-mono">
          <div className="text-sm sm:text-base font-black text-cyan-300">
            {currentVolume.toFixed(1)} <span className="text-xs text-slate-400">/ {maxCapacity} mL</span>
          </div>
          <div className="text-[10px] text-slate-400">{fillPercent}% Capacity</div>
        </div>
      </div>

      {/* Visceral Graphic of the Graduated Laboratory Cup */}
      <div className="relative w-full h-24 sm:h-28 bg-slate-950 rounded-xl border border-slate-800 p-2 overflow-hidden flex items-center gap-3">
        {/* Visual Cup Silhouette */}
        <div className="relative w-20 sm:w-24 h-full shrink-0 flex items-end justify-center">
          {/* Glass Beaker Outline */}
          <div className="relative w-16 sm:w-18 h-full rounded-b-xl border-2 border-cyan-400/50 bg-slate-900/60 overflow-hidden shadow-[inset_0_0_15px_rgba(6,182,212,0.2)]">
            {/* Graduated Markings on the glass */}
            <div className="absolute inset-y-0 right-1 flex flex-col justify-between py-1 pointer-events-none z-20 text-[7px] font-mono text-cyan-400/80">
              <span className="border-b border-cyan-400/50 pr-0.5">50ml</span>
              <span className="border-b border-cyan-400/50 pr-0.5">40ml</span>
              <span className="border-b border-cyan-400/50 pr-0.5">30ml</span>
              <span className="border-b border-cyan-400/50 pr-0.5">20ml</span>
              <span className="border-b border-cyan-400/50 pr-0.5">10ml</span>
            </div>

            {/* Rising Thick Viscous Semen Fluid Mesh */}
            <div
              className="absolute bottom-0 inset-x-0 transition-all duration-300 ease-out bg-gradient-to-t from-slate-100 via-slate-200 to-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
              style={{ height: `${Math.max(4, fillPercent)}%` }}
            >
              {/* Dynamic Meniscus Wave on Semen Surface */}
              <div className="absolute -top-1 inset-x-0 h-2 bg-white/90 rounded-full blur-[0.5px] animate-pulse" />
              {/* Internal specimen glow / froth */}
              <div className="w-full h-full bg-radial from-white/80 to-transparent opacity-60" />
            </div>

            {/* Glass Surface Specular Sheen Reflection */}
            <div className="absolute inset-y-0 left-1 w-1.5 bg-white/20 rounded-full pointer-events-none z-20" />
          </div>

          {/* Pouring Spout Lip */}
          <div className="absolute top-0 right-1 w-2 h-1 bg-cyan-400/60 rounded-tr" />
        </div>

        {/* Cup Status & Live Specimen Metrics */}
        <div className="flex-1 flex flex-col justify-between h-full py-0.5">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-900/90 rounded-lg p-1.5 border border-slate-800">
              <div className="text-[9px] text-slate-400 flex items-center gap-1">
                <Droplets className="w-2.5 h-2.5 text-cyan-400" /> Motility
              </div>
              <div className="text-cyan-200 font-bold mt-0.5">
                {activeDonor.motilityBaseline.toFixed(1)}% <span className="text-[9px] text-emerald-400">Peak</span>
              </div>
            </div>

            <div className="bg-slate-900/90 rounded-lg p-1.5 border border-slate-800">
              <div className="text-[9px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-yellow-400" /> Market Value
              </div>
              <div className="text-yellow-300 font-bold mt-0.5">
                ${estimatedValue} <span className="text-[9px] text-slate-400">BioCredits</span>
              </div>
            </div>
          </div>

          {/* Progress Bar of Cup Fill */}
          <div className="w-full">
            <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-0.5">
              <span>Collection Progress</span>
              <span className={fillPercent > 0 ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                {currentVolume.toFixed(1)} mL collected
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-slate-100 to-white transition-all duration-200"
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Sell / Deposit Interactive Controls */}
      <div className="mt-3 flex items-center gap-2">
        <button
          id="btn-quick-sell-cup"
          disabled={currentVolume < 0.5}
          onClick={handleSell}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            currentVolume >= 0.5
              ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Deposit & Sell Flask (${estimatedValue})</span>
        </button>
      </div>
    </div>
  );
};
