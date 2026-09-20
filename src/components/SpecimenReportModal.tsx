import React, { useEffect } from 'react';
import { ActiveSpecimenBatch } from '../types';
import confetti from 'canvas-confetti';
import { Award, Check, DollarSign, Activity, Beaker } from 'lucide-react';

interface SpecimenReportModalProps {
  batch: ActiveSpecimenBatch | null;
  onClose: () => void;
}

export const SpecimenReportModal: React.FC<SpecimenReportModalProps> = ({
  batch,
  onClose,
}) => {
  useEffect(() => {
    if (batch && (batch.grade === 'S' || batch.grade === 'MYTHIC' || batch.grade === 'A')) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#818cf8', '#f472b6', '#34d399'],
      });
    }
  }, [batch]);

  if (!batch) return null;

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'MYTHIC':
        return 'bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 text-white border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)]';
      case 'S':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]';
      case 'A':
        return 'bg-emerald-500 text-slate-950 font-black border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.4)]';
      case 'B':
        return 'bg-cyan-500 text-slate-950 font-bold border-cyan-300';
      case 'C':
        return 'bg-slate-700 text-slate-200 border-slate-600';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div
      id="specimen-report-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="specimen-report-card"
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
              <Beaker className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Specimen Analysis Certificate</h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Sample #{batch.id.slice(-6)}
              </span>
            </div>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest border ${getGradeBadge(
              batch.grade
            )}`}
          >
            GRADE {batch.grade}
          </div>
        </div>

        {/* Certificate Metrics */}
        <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
            <span className="text-slate-400 flex items-center gap-1 text-[11px] mb-1">
              <Beaker className="w-3 h-3 text-cyan-400" /> Total Net Yield
            </span>
            <span className="text-lg font-bold text-white">{batch.volumeMl.toFixed(1)} mL</span>
            {batch.yieldBonusPercent > 0 && (
              <span className="text-[10px] text-emerald-400 font-semibold">
                +{batch.yieldBonusPercent}% Satisfaction Bonus
              </span>
            )}
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
            <span className="text-slate-400 flex items-center gap-1 text-[11px] mb-1">
              <Activity className="w-3 h-3 text-emerald-400" /> Cell Motility
            </span>
            <span className="text-lg font-bold text-emerald-400">{batch.motility.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-400">Purity & Swim Velocity</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
            <span className="text-slate-400 flex items-center gap-1 text-[11px] mb-1">
              <Award className="w-3 h-3 text-purple-400" /> Donor Satisfaction
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-pink-400">{Math.round(batch.satisfactionPercent)}%</span>
              <span className="text-[10px] text-pink-300 font-semibold uppercase">[{batch.satisfactionTier}]</span>
            </div>
            <span className="text-[10px] text-slate-400">Milestone Performance</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col">
            <span className="text-slate-400 flex items-center gap-1 text-[11px] mb-1">
              <DollarSign className="w-3 h-3 text-amber-400" /> Market Payout
            </span>
            <span className="text-lg font-bold text-amber-400">
              +${batch.marketValue.toLocaleString()}
            </span>
            <span className="text-[10px] text-amber-300/80">BioCredits Transferred</span>
          </div>
        </div>

        {/* Satisfaction Yield Bonus Detailed Breakdown Banner */}
        {batch.yieldBonusPercent > 0 && (
          <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-pink-950/50 border border-emerald-500/40 rounded-xl p-3 font-mono text-xs flex flex-col gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                ★ YIELD BONUS ACCREDITATION:
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-400/40">
                +{batch.yieldBonusPercent}% EXTRA
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
              <span>Base Volume: <strong className="text-white">{batch.baseVolumeMl.toFixed(1)} mL</strong></span>
              <span>Bonus Gained: <strong className="text-emerald-300">+{batch.bonusVolumeMl.toFixed(1)} mL</strong></span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          id="btn-claim-specimen-payout"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold font-mono text-sm border border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1.5 transition-all"
        >
          <Check className="w-4 h-4" /> Deposit to Cryo-Vault & Collect Payout
        </button>
      </div>
    </div>
  );
};
