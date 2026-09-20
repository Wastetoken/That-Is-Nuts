import React from 'react';
import { DollarSign, Beaker, BarChart3, Volume2, VolumeX, Sparkles, Smartphone } from 'lucide-react';

interface HeaderBarProps {
  credits: number;
  storedVolumeMl: number;
  beakerVolumeMl: number;
  activeTab: 'simulator' | 'upgrades' | 'donors' | 'orders';
  onSelectTab: (tab: 'simulator' | 'upgrades' | 'donors' | 'orders') => void;
  onOpenStats: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  hapticsEnabled: boolean;
  onToggleHaptics: () => void;
  onQuickSellFlask: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  credits,
  storedVolumeMl,
  beakerVolumeMl,
  activeTab,
  onSelectTab,
  onOpenStats,
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
  onQuickSellFlask,
}) => {
  return (
    <header id="app-header-bar" className="w-full flex flex-col gap-2 pb-1">
      {/* Top Banner: Logo & Resource Counters */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Brand */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] shrink-0">
            <Beaker className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black tracking-tight text-white flex items-center gap-1 truncate">
              SEMEN EXTRACTOR <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">SIM</span>
            </h1>
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">Bio-Lab v2.5</span>
            </div>
          </div>
        </div>

        {/* Counters & Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* BioCredits Wallet */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 flex items-center gap-1 shadow-sm font-mono">
            <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold text-xs sm:text-sm text-amber-300">
              {credits.toLocaleString()}
            </span>
          </div>

          {/* Cryo-Vault Specimen Counter */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 flex items-center gap-1 shadow-sm font-mono">
            <Beaker className="w-3 h-3 text-cyan-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-400 uppercase leading-none">Vault</span>
              <span className="font-bold text-[11px] sm:text-xs text-cyan-300 leading-tight">
                {storedVolumeMl.toFixed(1)} <span className="text-[9px]">mL</span>
              </span>
            </div>
          </div>

          {/* Haptics Toggle Button */}
          <button
            id="btn-toggle-haptics"
            onClick={onToggleHaptics}
            title={hapticsEnabled ? 'Tactile Haptics Enabled' : 'Tactile Haptics Disabled'}
            aria-label="Toggle haptics"
            className={`p-1.5 sm:p-2 rounded-xl border transition-colors relative ${
              hapticsEnabled
                ? 'bg-slate-900 border-pink-500/50 text-pink-400'
                : 'bg-slate-900/60 border-slate-800 text-slate-600'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {hapticsEnabled && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
            )}
          </button>

          {/* Sound Toggle Button */}
          <button
            id="btn-toggle-sound"
            onClick={onToggleSound}
            aria-label="Toggle sound"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Stats Dialog Button */}
          <button
            id="btn-open-stats"
            onClick={onOpenStats}
            aria-label="Open stats"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center justify-between gap-1 bg-slate-900/90 backdrop-blur p-1 rounded-xl border border-slate-800 font-mono text-xs">
        <button
          onClick={() => onSelectTab('simulator')}
          className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
            activeTab === 'simulator'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Extractor
        </button>

        <button
          onClick={() => onSelectTab('upgrades')}
          className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
            activeTab === 'upgrades'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Upgrades
        </button>

        <button
          onClick={() => onSelectTab('donors')}
          className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
            activeTab === 'donors'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Donors
        </button>

        <button
          onClick={() => onSelectTab('orders')}
          className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
            activeTab === 'orders'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Contracts
        </button>
      </div>

      {/* Quick Deposit / Sell Banner if beaker has liquid */}
      {beakerVolumeMl > 1.0 && (
        <div className="w-full bg-cyan-950/70 border border-cyan-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-mono animate-in fade-in">
          <div className="flex items-center gap-1.5 text-cyan-200">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Flask collected: <b className="text-white">{beakerVolumeMl.toFixed(1)} mL</b></span>
          </div>
          <button
            onClick={onQuickSellFlask}
            className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] shadow transition-all active:scale-95"
          >
            Deposit & Sell
          </button>
        </div>
      )}
    </header>
  );
};
