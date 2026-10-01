'use client';

import React from 'react';
import { TransactionStep, TransactionStatusState } from '@/lib/vault/types';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Wallet,
  Send,
  Layers,
} from 'lucide-react';

interface TransactionStatusProps {
  step: TransactionStep;
  onReset?: () => void;
}

const statusConfig: Record<
  TransactionStatusState,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  idle: {
    label: 'Ready',
    color: 'text-neutral-400',
    bg: 'bg-neutral-900 border-neutral-800',
    icon: <Clock className="w-5 h-5 text-neutral-400" />,
  },
  preparing: {
    label: 'Preparing Command',
    color: 'text-blue-400',
    bg: 'bg-blue-950/60 border-blue-800/60',
    icon: <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />,
  },
  awaiting_wallet: {
    label: 'Awaiting Wallet Approval',
    color: 'text-amber-400',
    bg: 'bg-amber-950/60 border-amber-800/60',
    icon: <Wallet className="w-5 h-5 text-amber-400 animate-bounce" />,
  },
  submitted: {
    label: 'Submitted to Participant Node',
    color: 'text-purple-400',
    bg: 'bg-purple-950/60 border-purple-800/60',
    icon: <Send className="w-5 h-5 text-purple-400 animate-pulse" />,
  },
  pending: {
    label: 'Sequencing on Synchronizer',
    color: 'text-indigo-400',
    bg: 'bg-indigo-950/60 border-indigo-800/60',
    icon: <Layers className="w-5 h-5 text-indigo-400 animate-spin" />,
  },
  executed: {
    label: 'Confirmed on Ledger',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/60 border-emerald-800/60',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
  },
  failed: {
    label: 'Transaction Rejected',
    color: 'text-rose-400',
    bg: 'bg-rose-950/60 border-rose-800/60',
    icon: <XCircle className="w-5 h-5 text-rose-400" />,
  },
};

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  step,
  onReset,
}) => {
  if (step.status === 'idle') return null;

  const current = statusConfig[step.status];

  return (
    <div
      className={`rounded-2xl border p-4.5 mb-5 transition-all duration-200 backdrop-blur-md ${current.bg}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="mt-0.5">{current.icon}</div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono font-bold tracking-wider uppercase ${current.color}`}>
                {current.label}
              </span>
              {step.status === 'awaiting_wallet' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700/60 font-medium">
                  Approval ≠ Ledger Success
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-neutral-200 mt-1">
              {step.message || 'Processing transaction...'}
            </p>
            {step.error && (
              <div className="mt-2 text-xs font-mono text-rose-300 bg-neutral-950 p-2.5 rounded-xl border border-rose-900/60 break-all">
                {step.error}
              </div>
            )}
            <div className="mt-2 text-xs text-neutral-400">
              {step.status === 'awaiting_wallet' && (
                <span>Please confirm in your Canton wallet extension (CIP-0103).</span>
              )}
              {step.status === 'submitted' && (
                <span>Wallet signature received. Ledger sequencing in progress...</span>
              )}
              {step.status === 'executed' && (
                <span className="text-emerald-400 font-medium font-mono text-xs">
                  Verified in Canton Active Contract Set (ACS).
                </span>
              )}
            </div>
          </div>
        </div>

        {(step.status === 'executed' || step.status === 'failed') && onReset && (
          <button
            onClick={onReset}
            className="text-xs font-medium text-neutral-400 hover:text-white underline ml-4"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};
