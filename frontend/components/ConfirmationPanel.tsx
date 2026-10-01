'use client';

import React, { useState } from 'react';
import {
  WithdrawProposalContract,
  WithdrawReceiptContract,
  VaultPayload,
  Party,
} from '@/lib/vault/types';
import { confirmWithdrawal, executeWithdrawal, cancelWithdrawal } from '@/lib/vault/commands';
import { StatusListener } from '@/lib/canton/transactions';
import {
  CheckCircle2,
  Clock,
  Check,
  Play,
  Trash2,
  FileCheck,
  Users,
} from 'lucide-react';

interface ConfirmationPanelProps {
  vaultCid: string;
  vaultPayload: VaultPayload;
  proposals: WithdrawProposalContract[];
  receipts: WithdrawReceiptContract[];
  connectedParty: Party | null;
  onStatusChange: StatusListener;
  onRefresh: () => void;
}

export const ConfirmationPanel: React.FC<ConfirmationPanelProps> = ({
  vaultCid,
  vaultPayload,
  proposals,
  receipts,
  connectedParty,
  onStatusChange,
  onRefresh,
}) => {
  const [actingCid, setActingCid] = useState<string | null>(null);

  const handleConfirm = async (proposalCid: string) => {
    if (!connectedParty) return;
    setActingCid(proposalCid);
    try {
      await confirmWithdrawal(
        { proposalCid, operator: connectedParty },
        undefined,
        onStatusChange
      );
      onRefresh();
    } catch (err: unknown) {
      console.error('Confirmation failed:', err);
    } finally {
      setActingCid(null);
    }
  };

  const handleExecute = async (proposalCid: string) => {
    if (!connectedParty) return;
    setActingCid(proposalCid);
    try {
      await executeWithdrawal(
        { vaultCid, proposalCid, executor: connectedParty },
        undefined,
        onStatusChange
      );
      onRefresh();
    } catch (err: unknown) {
      console.error('Execution failed:', err);
    } finally {
      setActingCid(null);
    }
  };

  const handleCancel = async (proposalCid: string) => {
    if (!connectedParty) return;
    setActingCid(proposalCid);
    try {
      await cancelWithdrawal(
        { proposalCid, operator: connectedParty },
        undefined,
        onStatusChange
      );
      onRefresh();
    } catch (err: unknown) {
      console.error('Cancellation failed:', err);
    } finally {
      setActingCid(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Proposals Section */}
      <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl shadow-xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Active Withdrawal Proposals ({proposals.length})
            </h3>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            Quorum Required: {vaultPayload.threshold} of {vaultPayload.operators.length}
          </span>
        </div>

        {proposals.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-xs border border-dashed border-neutral-800 rounded-xl font-mono">
            No pending withdrawal proposals found on ledger.
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => {
              const { contractId, payload } = proposal;
              const hasConfirmed = connectedParty && payload.confirmations.includes(connectedParty);
              const isOperator = connectedParty && vaultPayload.operators.includes(connectedParty);
              const thresholdMet = payload.confirmations.length >= payload.threshold;
              const isActing = actingCid === contractId;

              return (
                <div
                  key={contractId}
                  className={`rounded-xl border p-4.5 transition-colors ${
                    thresholdMet
                      ? 'border-emerald-700/60 bg-emerald-950/30'
                      : 'border-neutral-800 bg-neutral-950/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-850">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-bold text-white font-mono">
                          {payload.amount} {vaultPayload.asset}
                        </span>
                        <span className="text-xs text-neutral-400">&rarr;</span>
                        <span className="text-xs font-mono font-semibold text-neutral-200 bg-neutral-800/90 px-2 py-0.5 rounded border border-neutral-700/50 truncate max-w-[180px]">
                          {payload.recipient}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 italic">
                        &quot;{payload.memo}&quot;
                      </p>
                      <span className="text-[10px] text-neutral-500 font-mono block mt-1">
                        Proposer: {payload.proposer} | Contract: {contractId.slice(0, 14)}...
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {payload.confirmations.length} / {payload.threshold} Confirmations
                        </span>
                      </div>
                      {thresholdMet && (
                        <span className="text-[11px] font-bold text-emerald-400 block mt-1 font-mono">
                          ✓ Quorum Reached - Ready to Execute
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Operator confirmation list */}
                  <div className="mt-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block mb-1">
                      Signatures Collected:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {payload.confirmations.map((conf, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-mono bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>{conf}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-neutral-850 flex flex-wrap items-center justify-end gap-2">
                    {/* Confirm Button */}
                    {isOperator && !hasConfirmed && (
                      <button
                        onClick={() => handleConfirm(contractId)}
                        disabled={isActing}
                        className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isActing ? 'Confirming...' : 'Sign Confirmation'}</span>
                      </button>
                    )}

                    {/* Execute Button */}
                    {isOperator && thresholdMet && (
                      <button
                        onClick={() => handleExecute(contractId)}
                        disabled={isActing}
                        className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{isActing ? 'Executing...' : 'Execute Outflow'}</span>
                      </button>
                    )}

                    {/* Cancel Button */}
                    {isOperator && (
                      <button
                        onClick={() => handleCancel(contractId)}
                        disabled={isActing}
                        className="inline-flex items-center space-x-1 text-neutral-400 hover:text-rose-400 text-xs px-2.5 py-1.5 transition-colors disabled:opacity-50"
                        title="Cancel proposal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Withdrawals / Audit Receipts */}
      <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl shadow-xl p-6 backdrop-blur-md">
        <div className="flex items-center space-x-2 mb-4">
          <FileCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white tracking-tight">
            Immutable Audit Receipts ({receipts.length})
          </h3>
        </div>

        {receipts.length === 0 ? (
          <div className="text-center py-6 text-neutral-500 text-xs border border-dashed border-neutral-800 rounded-xl font-mono">
            No executed withdrawals recorded on ledger yet.
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((receipt) => {
              const { contractId, payload } = receipt;
              return (
                <div
                  key={contractId}
                  className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-850">
                    <div>
                      <span className="font-bold text-emerald-400 font-mono text-sm">
                        -{payload.amount} {payload.asset}
                      </span>
                      <span className="text-neutral-400 ml-2">&rarr; recipient:</span>
                      <span className="font-mono font-medium text-neutral-200 ml-1">
                        {payload.recipient}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      Receipt ID: {contractId.slice(0, 14)}...
                    </span>
                  </div>

                  <div className="mt-2 text-neutral-400 italic">
                    Memo: &quot;{payload.memo}&quot;
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-850">
                    <div>
                      <span>Approving Operators: </span>
                      <span className="font-mono text-neutral-300">
                        {payload.confirmations.join(', ')}
                      </span>
                    </div>
                    <div>
                      <span>Remaining Balance: </span>
                      <span className="font-bold font-mono text-white">
                        {payload.remainingBalance} {payload.asset}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
