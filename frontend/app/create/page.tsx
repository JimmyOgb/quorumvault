'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WalletConnect } from '@/components/WalletConnect';
import { TransactionStatus } from '@/components/TransactionStatus';
import { createVault } from '@/lib/vault/commands';
import { TransactionStep, Party } from '@/lib/vault/types';
import { PlusCircle, Trash2, Shield, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function CreateVaultPage() {
  const router = useRouter();
  const [connectedParty, setConnectedParty] = useState<Party | null>(null);

  // Form fields
  const [operators, setOperators] = useState<string[]>(['', '', '']);
  const [threshold, setThreshold] = useState<number>(2);
  const [initialBalance, setInitialBalance] = useState<string>('100.0');
  const [asset, setAsset] = useState<string>('CBTC');
  const [maxSingleWithdrawal, setMaxSingleWithdrawal] = useState<string>('50.0');

  // Transaction tracking
  const [txStep, setTxStep] = useState<TransactionStep>({ status: 'idle' });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createdCid, setCreatedCid] = useState<string | null>(null);

  const handleAddOperator = () => {
    setOperators([...operators, '']);
  };

  const handleRemoveOperator = (index: number) => {
    if (operators.length <= 1) return;
    const newOps = operators.filter((_, i) => i !== index);
    setOperators(newOps);
    if (threshold > newOps.length) {
      setThreshold(newOps.length);
    }
  };

  const handleOperatorChange = (index: number, value: string) => {
    const newOps = [...operators];
    newOps[index] = value;
    setOperators(newOps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setCreatedCid(null);

    if (!connectedParty) {
      setValidationError('Please connect your Canton wallet before deploying a vault.');
      return;
    }

    const cleanOperators = operators.map((o) => o.trim()).filter(Boolean);

    // Validation rules per Section 7 & Daml contract ensure block
    if (cleanOperators.length < 1) {
      setValidationError('At least one operator party is required.');
      return;
    }

    // Check for duplicate operators
    const uniqueOperators = Array.from(new Set(cleanOperators));
    if (uniqueOperators.length !== cleanOperators.length) {
      setValidationError('Duplicate operator parties are not allowed.');
      return;
    }

    if (threshold < 1) {
      setValidationError('Threshold must be at least 1.');
      return;
    }

    if (threshold > cleanOperators.length) {
      setValidationError(`Threshold (${threshold}) cannot exceed the number of operators (${cleanOperators.length}).`);
      return;
    }

    const maxSingle = parseFloat(maxSingleWithdrawal);
    if (isNaN(maxSingle) || maxSingle <= 0) {
      setValidationError('Maximum single withdrawal must be greater than 0.');
      return;
    }

    const balanceNum = parseFloat(initialBalance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      setValidationError('Initial balance cannot be negative.');
      return;
    }

    try {
      const result = await createVault(
        {
          owner: connectedParty,
          operators: cleanOperators,
          threshold,
          maxSingleWithdrawal: maxSingleWithdrawal.trim(),
          balance: initialBalance.trim(),
          asset: asset.trim(),
        },
        undefined,
        (step) => setTxStep(step)
      );

      setCreatedCid(result.contractId);
    } catch (err: unknown) {
      console.error('Failed to create vault:', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Overview</span>
        </Link>
        <WalletConnect onPartyChange={setConnectedParty} />
      </div>

      <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-md">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-neutral-800 text-indigo-400 rounded-xl border border-neutral-750">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Deploy QuorumVault</h1>
            <p className="text-xs text-neutral-400">
              Deploy an m-of-n threshold-governed custody contract directly to Canton Network.
            </p>
          </div>
        </div>

        <TransactionStatus
          step={txStep}
          onReset={() => setTxStep({ status: 'idle' })}
        />

        {createdCid && (
          <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
            <p className="font-bold text-sm text-emerald-200">
              Vault Successfully Deployed to Canton!
            </p>
            <p className="mt-1 font-mono text-[11px] text-neutral-300 break-all">
              Contract ID: {createdCid}
            </p>
            <div className="mt-3">
              <Link
                href={`/vault?cid=${encodeURIComponent(createdCid)}`}
                className="font-semibold text-emerald-400 underline hover:text-emerald-300"
              >
                Go to Vault Dashboard &rarr;
              </Link>
            </div>
          </div>
        )}

        {validationError && (
          <div className="mb-6 p-4 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset & Balances */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Asset Name
              </label>
              <input
                type="text"
                required
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Initial Balance
              </label>
              <input
                type="number"
                step="any"
                required
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Max Single Outflow Limit
              </label>
              <input
                type="number"
                step="any"
                required
                value={maxSingleWithdrawal}
                onChange={(e) => setMaxSingleWithdrawal(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Required Quorum Confirmations (m)
            </label>
            <input
              type="number"
              min={1}
              max={operators.length}
              required
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
              className="w-full sm:w-48 text-xs font-mono px-3 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <span className="text-[11px] text-neutral-500 mt-1.5 block">
              Requires {threshold} of {operators.length} operator approvals to execute any withdrawal.
            </span>
          </div>

          {/* Operators */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-neutral-300">
                Authorized Signatory Operators (n)
              </label>
              <button
                type="button"
                onClick={handleAddOperator}
                className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Operator</span>
              </button>
            </div>

            <div className="space-y-2">
              {operators.map((op, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <span className="text-xs text-neutral-500 w-6 text-right font-mono">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    required
                    placeholder={`Operator Canton party (e.g. Operator_${idx + 1} or Party::1220...)`}
                    value={op}
                    onChange={(e) => handleOperatorChange(idx, e.target.value)}
                    className="flex-1 text-xs font-mono px-3 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  {operators.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOperator(idx)}
                      className="text-neutral-500 hover:text-rose-400 p-1.5 transition"
                      title="Remove operator"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex justify-end">
            <button
              type="submit"
              disabled={txStep.status === 'preparing' || txStep.status === 'awaiting_wallet' || txStep.status === 'submitted' || txStep.status === 'pending'}
              className="inline-flex items-center space-x-2 bg-white hover:bg-neutral-100 text-neutral-950 font-bold text-xs px-7 py-3.5 rounded-full transition-all shadow-md disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Deploy Vault to Canton</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
