'use client';

import React from 'react';
import { VaultPayload } from '@/lib/vault/types';
import { Lock, ShieldCheck } from 'lucide-react';

interface VaultBalanceProps {
  payload: VaultPayload;
}

export const VaultBalance: React.FC<VaultBalanceProps> = ({ payload }) => {
  return (
    <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl shadow-xl p-6 backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-semibold block mb-1">
            Confirmed On-Ledger Treasury Balance
          </span>
          <div className="flex items-baseline space-x-2.5">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
              {payload.balance}
            </h2>
            <span className="text-lg font-bold text-indigo-400 font-mono">{payload.asset}</span>
          </div>
          <span className="text-xs text-neutral-400 mt-1.5 block">
            Guaranteed by Daml signatories on Canton Network. Balance is never debited upon proposal creation.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl px-4 py-2.5">
            <span className="text-[10px] uppercase font-mono text-neutral-400 block">Governance Threshold</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold font-mono text-white">
                {payload.threshold} of {payload.operators.length} Operators
              </span>
            </div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl px-4 py-2.5">
            <span className="text-[10px] uppercase font-mono text-neutral-400 block">Max Single Outflow</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold font-mono text-white">
                {payload.maxSingleWithdrawal} {payload.asset}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
