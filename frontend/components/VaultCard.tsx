'use client';

import React from 'react';
import { VaultContract } from '@/lib/vault/types';
import { Shield, ArrowUpRight, Users, Lock } from 'lucide-react';
import Link from 'next/link';

interface VaultCardProps {
  vault: VaultContract;
}

export const VaultCard: React.FC<VaultCardProps> = ({ vault }) => {
  const { contractId, payload } = vault;

  return (
    <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl shadow-xl p-6 hover:border-neutral-700 transition-all duration-200 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 bg-neutral-800 text-indigo-400 rounded-xl flex-shrink-0 border border-neutral-750">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">
              Canton Vault Contract
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white font-mono truncate" title={contractId}>
              {contractId.slice(0, 16)}...
            </h3>
          </div>
        </div>

        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-neutral-800 text-neutral-300 border border-neutral-700/60 flex-shrink-0">
          {payload.threshold}-of-{payload.operators.length} Quorum
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-b border-neutral-800/80 py-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
            Confirmed Balance
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-white">
            {payload.balance}{' '}
            <span className="text-sm font-semibold text-neutral-400">{payload.asset}</span>
          </span>
        </div>
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
            Max Single Outflow
          </span>
          <span className="text-base sm:text-lg font-semibold font-mono text-neutral-300">
            {payload.maxSingleWithdrawal} {payload.asset}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1.5">
          Authorized Signatories ({payload.operators.length})
        </span>
        <div className="flex flex-wrap gap-1.5">
          {payload.operators.map((op, idx) => (
            <span
              key={idx}
              className="text-[11px] font-mono bg-neutral-800/80 text-neutral-300 px-2 py-0.5 rounded-md border border-neutral-700/50 truncate max-w-[180px]"
              title={op}
            >
              {op}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-2 border-t border-neutral-850 flex justify-end">
        <Link
          href={`/vault?cid=${encodeURIComponent(contractId)}`}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white hover:text-indigo-300 bg-neutral-800 hover:bg-neutral-750 px-3.5 py-2 rounded-lg transition-colors border border-neutral-700/60"
        >
          <span>Open Dashboard</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
