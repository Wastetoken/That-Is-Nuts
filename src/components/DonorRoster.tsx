import React from 'react';
import { DonorProfile } from '../types';
import { User, Lock, CheckCircle, Activity, Waves, Gauge } from 'lucide-react';

interface DonorRosterProps {
  donors: DonorProfile[];
  activeDonorId: string;
  lifetimeCredits: number;
  onSelectDonor: (donor: DonorProfile) => void;
}

export const DonorRoster: React.FC<DonorRosterProps> = ({
  donors,
  activeDonorId,
  lifetimeCredits,
  onSelectDonor,
}) => {
  return (
    <div id="donor-roster-container" className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 font-mono">
          <User className="w-4 h-4 text-cyan-400" />
          Clinical Donors & Volunteer Program
        </h3>
        <span className="text-xs font-mono text-slate-400">
          Lifetime: ${lifetimeCredits.toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {donors.map((donor) => {
          const isUnlocked = lifetimeCredits >= donor.unlockedAtCredits;
          const isSelected = activeDonorId === donor.id;

          return (
            <div
              key={donor.id}
              id={`donor-card-${donor.id}`}
              onClick={() => isUnlocked && onSelectDonor(donor)}
              className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                  : isUnlocked
                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: donor.avatarColor }}
                    />
                    <h4 className="text-sm font-bold text-slate-100">{donor.name}</h4>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono tracking-wide">
                    {donor.codename}
                  </span>
                </div>

                {isSelected ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                    <CheckCircle className="w-3 h-3" /> ACTIVE
                  </span>
                ) : !isUnlocked ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                    <Lock className="w-3 h-3" /> Req. ${donor.unlockedAtCredits.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-slate-400">Select</span>
                )}
              </div>

              <p className="text-xs text-slate-300 line-clamp-2 mb-2.5 leading-relaxed">
                {donor.description}
              </p>

              {/* Bio Metric Parameters */}
              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-slate-500 flex items-center gap-0.5">
                    <Waves className="w-2.5 h-2.5" /> Target Cadence
                  </span>
                  <span className="text-cyan-300 font-semibold">{donor.optimalFrequency} Hz</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 flex items-center gap-0.5">
                    <Gauge className="w-2.5 h-2.5" /> Target Vacuum
                  </span>
                  <span className="text-cyan-300 font-semibold">{donor.optimalVacuum} kPa</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 flex items-center gap-0.5">
                    <Activity className="w-2.5 h-2.5" /> Base Surge
                  </span>
                  <span className="text-cyan-300 font-semibold">{donor.baseVolume} mL</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
