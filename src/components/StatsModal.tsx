import React from 'react';
import { ExtractionStats } from '../types';
import { BarChart3, X, Volume2, VolumeX, RotateCcw, Award } from 'lucide-react';

interface StatsModalProps {
  stats: ExtractionStats;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClose: () => void;
  onResetData: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  stats,
  soundEnabled,
  onToggleSound,
  onClose,
  onResetData,
}) => {
  return (
    <div
      id="stats-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="stats-modal-card"
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base text-slate-100 font-mono">
              Laboratory Diagnostics & Stats
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
            <span className="text-slate-400 text-[11px] mb-1">Total Extracted</span>
            <span className="text-base font-bold text-cyan-300">
              {stats.totalExtractedMl >= 1000
                ? `${(stats.totalExtractedMl / 1000).toFixed(2)} L`
                : `${stats.totalExtractedMl.toFixed(1)} mL`}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
            <span className="text-slate-400 text-[11px] mb-1">Lifetime Revenue</span>
            <span className="text-base font-bold text-amber-400">
              ${stats.totalCreditsEarned.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
            <span className="text-slate-400 text-[11px] mb-1">Surges Triggered</span>
            <span className="text-base font-bold text-pink-400">
              {stats.totalSurges}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
            <span className="text-slate-400 text-[11px] mb-1">Peak Single Surge</span>
            <span className="text-base font-bold text-emerald-400">
              {stats.highestSurgeMl.toFixed(1)} mL
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
            <span className="text-slate-400 text-[11px] mb-1">Highest Motility</span>
            <span className="text-base font-bold text-purple-300">
              {stats.highestMotility.toFixed(1)}%
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
            <span className="text-slate-400 text-[11px] mb-1">Manual Strokes</span>
            <span className="text-base font-bold text-slate-200">
              {stats.manualStrokes.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Audio Toggle & Reset */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={onToggleSound}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-cyan-400" /> Sound: Enabled
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" /> Sound: Muted
              </>
            )}
          </button>

          <button
            onClick={onResetData}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Lab Data
          </button>
        </div>
      </div>
    </div>
  );
};
