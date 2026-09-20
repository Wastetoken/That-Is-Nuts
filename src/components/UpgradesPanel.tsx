import React, { useState } from 'react';
import { UpgradeItem } from '../types';
import { Gauge, Droplets, Thermometer, Bot, ArrowUpCircle } from 'lucide-react';

interface UpgradesPanelProps {
  upgrades: UpgradeItem[];
  credits: number;
  onPurchaseUpgrade: (upgradeId: string) => void;
}

export const UpgradesPanel: React.FC<UpgradesPanelProps> = ({
  upgrades,
  credits,
  onPurchaseUpgrade,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'pneumatics' | 'fluidics' | 'thermals' | 'automation'>('all');

  const filteredUpgrades = upgrades.filter(
    (u) => activeCategory === 'all' || u.category === activeCategory
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pneumatics':
        return <Gauge className="w-4 h-4 text-cyan-400" />;
      case 'fluidics':
        return <Droplets className="w-4 h-4 text-blue-400" />;
      case 'thermals':
        return <Thermometer className="w-4 h-4 text-amber-400" />;
      case 'automation':
        return <Bot className="w-4 h-4 text-purple-400" />;
      default:
        return <ArrowUpCircle className="w-4 h-4 text-cyan-400" />;
    }
  };

  const calculateCost = (upgrade: UpgradeItem): number => {
    return Math.round(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
  };

  return (
    <div id="upgrades-panel-container" className="w-full flex flex-col gap-3">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-mono">
        {(['all', 'pneumatics', 'fluidics', 'thermals', 'automation'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg border whitespace-nowrap capitalize transition-all ${
              activeCategory === cat
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Upgrades List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
        {filteredUpgrades.map((upgrade) => {
          const isMaxed = upgrade.level >= upgrade.maxLevel;
          const currentCost = calculateCost(upgrade);
          const canAfford = credits >= currentCost && !isMaxed;

          return (
            <div
              key={upgrade.id}
              id={`upgrade-card-${upgrade.id}`}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                isMaxed
                  ? 'bg-slate-950/60 border-slate-800/60 opacity-70'
                  : canAfford
                  ? 'bg-slate-900/90 border-slate-700/80 hover:border-cyan-500/50 shadow-md'
                  : 'bg-slate-900/40 border-slate-800/80'
              }`}
            >
              <div>
                {/* Header: Icon, Name, Category Badge */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                      {getCategoryIcon(upgrade.category)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100 leading-tight">
                        {upgrade.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                        {upgrade.category}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                    Lv. {upgrade.level} / {upgrade.maxLevel}
                  </span>
                </div>

                {/* Description & Effect */}
                <p className="text-xs text-slate-300 line-clamp-2 my-1.5 leading-relaxed">
                  {upgrade.description}
                </p>
                <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 rounded px-2 py-1 mb-2">
                  ⚡ {upgrade.effectDescription}
                </div>
              </div>

              {/* Purchase Button / Cost */}
              <button
                disabled={!canAfford}
                onClick={() => onPurchaseUpgrade(upgrade.id)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-between border transition-all ${
                  isMaxed
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    : canAfford
                    ? 'bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-800/60 text-slate-400 border-slate-800 cursor-not-allowed'
                }`}
              >
                <span>{isMaxed ? 'MAX LEVEL' : 'UPGRADE'}</span>
                {!isMaxed && (
                  <span className={canAfford ? 'text-slate-950 font-black' : 'text-slate-400'}>
                    ${currentCost.toLocaleString()}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
