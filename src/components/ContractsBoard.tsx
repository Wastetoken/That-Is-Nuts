import React from 'react';
import { ClinicalOrder } from '../types';
import { FileCheck, Clock, CheckCircle2, ChevronRight, DollarSign } from 'lucide-react';

interface ContractsBoardProps {
  orders: ClinicalOrder[];
  storedSpecimenMl: number;
  onFulfillOrder: (orderId: string) => void;
}

export const ContractsBoard: React.FC<ContractsBoardProps> = ({
  orders,
  storedSpecimenMl,
  onFulfillOrder,
}) => {
  return (
    <div id="contracts-board-container" className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 font-mono">
          <FileCheck className="w-4 h-4 text-cyan-400" />
          Clinical Research Orders & Contracts
        </h3>
        <span className="text-xs font-mono text-cyan-300">
          Stored Cryo-Vault: {storedSpecimenMl.toFixed(1)} mL
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {orders.map((order) => {
          const canFulfill = storedSpecimenMl >= order.targetVolume && !order.completed;

          return (
            <div
              key={order.id}
              id={`contract-card-${order.id}`}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                order.completed
                  ? 'bg-slate-950/60 border-slate-800 opacity-60'
                  : canFulfill
                  ? 'bg-slate-900/90 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                    {order.client}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    Min Grade: {order.minGrade}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-100 mb-1">{order.title}</h4>

                <div className="flex items-center justify-between text-xs font-mono text-slate-400 my-2">
                  <span>Quota: {order.targetVolume} mL</span>
                  <span className="text-amber-400 font-bold flex items-center">
                    <DollarSign className="w-3 h-3" />
                    {order.rewardCredits.toLocaleString()}
                  </span>
                </div>
              </div>

              {order.completed ? (
                <div className="w-full py-2 bg-slate-800 text-slate-400 text-xs font-mono rounded-lg flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Contract Fulfilled
                </div>
              ) : (
                <button
                  disabled={!canFulfill}
                  onClick={() => onFulfillOrder(order.id)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1 border transition-all ${
                    canFulfill
                      ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-800/60 text-slate-400 border-slate-800 cursor-not-allowed'
                  }`}
                >
                  <span>{canFulfill ? 'Deliver Specimen & Collect Grant' : `Need ${order.targetVolume} mL in Vault`}</span>
                  {canFulfill && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
