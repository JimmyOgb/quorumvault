'use client';

import React, { useState } from 'react';
import { VaultPayload, Party } from '@/lib/vault/types';
import { proposeWithdrawal } from '@/lib/vault/commands';
import { StatusListener } from '@/lib/canton/transactions';
import { Send, AlertCircle, FileText } from 'lucide-react';

interface WithdrawalProposalProps {
  vaultCid: string;
  vaultPayload: VaultPayload;
  connectedParty: Party | null;
  onStatusChange: StatusListener;
  onSuccess: () => void;
}

export const WithdrawalProposal: React.FC<WithdrawalProposalProps> = ({
  vaultCid,
  vaultPayload,
  connectedParty,
  onStatusChange,
  onSuccess,
}) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!connectedParty) {
      setValidationError('Please connect an authorized Canton operator wallet first.');
      return;
    }

    if (!vaultPayload.operators.includes(connectedParty)) {
      setValidationError(
        `Party '${connectedParty}' is not an authorized operator of this vault.`
      );
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError('Withdrawal amount must be greater than 0.');
      return;
    }

    const maxSingle = Number(String(vaultPayload.maxSingleWithdrawal));
    if (numAmount > maxSingle) {
      setValidationError(
        `Amount (${numAmount}) exceeds maximum single withdrawal limit (${maxSingle} ${vaultPayload.asset}).`
      );
      return;
    }

    const currentBalance = Number(String(vaultPayload.balance));
    if (numAmount > currentBalance) {
      setValidationError(
        `Amount (${numAmount}) exceeds available vault balance (${currentBalance} ${vaultPayload.asset}).`
      );
      return;
    }

    if (!recipient.trim()) {
      setValidationError('Recipient Canton party identifier is required.');
      return;
    }

    setSubmitting(true);
    try {
      await proposeWithdrawal(
        {
          vaultCid,
          proposer: connectedParty,
          recipient: recipient.trim(),
          amount: amount.trim(),
          memo: memo.trim() || 'Treasury withdrawal proposal',
        },
        undefined,
        onStatusChange
      );

      setRecipient('');
      setAmount('');
      setMemo('');
      onSuccess();
    } catch (err: unknown) {
      console.error('Propose withdrawal failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl shadow-xl p-6 backdrop-blur-md">
      <div className="flex items-center space-x-2 mb-3">
        <Send className="w-4 h-4 text-indigo-400" />
        <h3 className="text-base font-bold text-white tracking-tight">
          Propose Treasury Withdrawal
        </h3>
      </div>

      <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
        Only authorized operators can submit proposals. Creating a proposal does{' '}
        <strong className="text-neutral-200">not</strong> debit the treasury balance until the required {vaultPayload.threshold}{' '}
        operator confirmations are reached and executed.
      </p>

      {validationError && (
        <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
            Recipient Canton Party
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Recipient or Recipient::1220..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full text-xs font-mono px-3 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Amount ({vaultPayload.asset})
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. 10.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <span className="text-[10px] text-neutral-500 mt-1 block font-mono">
              Max single: {vaultPayload.maxSingleWithdrawal} {vaultPayload.asset}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Memo / Purpose
            </label>
            <input
              type="text"
              placeholder="e.g. Protocol vendor invoice"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting || !connectedParty}
            className="inline-flex items-center space-x-2 bg-white hover:bg-neutral-100 text-neutral-950 font-bold text-xs px-5 py-2.5 rounded-full transition-all shadow-md disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{submitting ? 'Submitting...' : 'Create Proposal on Ledger'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
