'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { WalletConnect } from '@/components/WalletConnect';
import { VaultBalance } from '@/components/VaultBalance';
import { WithdrawalProposal } from '@/components/WithdrawalProposal';
import { ConfirmationPanel } from '@/components/ConfirmationPanel';
import { TransactionStatus } from '@/components/TransactionStatus';
import {
  queryVaults,
  queryWithdrawProposals,
  queryWithdrawReceipts,
} from '@/lib/vault/queries';
import {
  VaultContract,
  WithdrawProposalContract,
  WithdrawReceiptContract,
  TransactionStep,
  Party,
} from '@/lib/vault/types';
import { checkNetworkStatus, NetworkStatus } from '@/lib/canton/network';
import { cantonConfig } from '@/lib/config';
import {
  Shield,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Server,
  PlusCircle,
} from 'lucide-react';
import Link from 'next/link';

function VaultDashboardContent() {
  const searchParams = useSearchParams();
  const urlCid = searchParams.get('cid');

  const [connectedParty, setConnectedParty] = useState<Party | null>(null);
  const [vaults, setVaults] = useState<VaultContract[]>([]);
  const [selectedVaultCid, setSelectedVaultCid] = useState<string | null>(urlCid);
  const [proposals, setProposals] = useState<WithdrawProposalContract[]>([]);
  const [receipts, setReceipts] = useState<WithdrawReceiptContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);

  // Transaction tracking
  const [txStep, setTxStep] = useState<TransactionStep>({ status: 'idle' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Probe network status first
    const netStatus = await checkNetworkStatus();
    setNetwork(netStatus);

    // If not connected (e.g. unauthenticated or offline), do not attempt raw queries
    if (!netStatus.connected) {
      setVaults([]);
      setProposals([]);
      setReceipts([]);
      if (netStatus.reachable && netStatus.authRequired) {
        setError(
          `Five North DevNet validator node is reachable at ${netStatus.endpoint}, but protected Canton Ledger API access (/v2/parties, /v2/query) requires OAuth2 Machine-to-Machine authentication. Live ACS contract queries are gated pending credential provisioning.`
        );
      } else if (!netStatus.reachable) {
        const isDevNet = netStatus.network.includes('devnet') || netStatus.endpoint.includes('fivenorth.io');
        setError(
          isDevNet
            ? `Unable to reach the Five North DevNet validator node at ${netStatus.endpoint}. Please verify network connectivity.`
            : `Unable to connect to Canton LocalNet at ${netStatus.endpoint}. Please ensure your local participant node HTTP JSON API is running.`
        );
      } else {
        setError(netStatus.error || 'Canton ledger connection unavailable.');
      }
      setLoading(false);
      return;
    }

    try {
      const activeVaults = await queryVaults();
      setVaults(activeVaults);

      let targetCid = selectedVaultCid;
      if (!targetCid && activeVaults.length > 0) {
        targetCid = activeVaults[0].contractId;
        setSelectedVaultCid(targetCid);
      }

      if (targetCid) {
        const [activeProposals, activeReceipts] = await Promise.all([
          queryWithdrawProposals(targetCid),
          queryWithdrawReceipts(targetCid),
        ]);
        setProposals(activeProposals);
        setReceipts(activeReceipts);
      } else {
        setProposals([]);
        setReceipts([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('UNAUTHENTICATED')) {
        setError(
          `Five North DevNet validator node is reachable, but protected Ledger API requires authentication (HTTP 401 UNAUTHENTICATED). Machine-to-machine OAuth2 credentials are required for live on-chain queries.`
        );
      } else {
        setError(`Unable to query Canton ledger: ${msg}`);
      }
      setVaults([]);
      setProposals([]);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedVaultCid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedVault = vaults.find((v) => v.contractId === selectedVaultCid);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition"
            title="Back to Overview"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-mono text-[10px] uppercase tracking-wider">
              <Server className="w-3 h-3" />
              <span>Canton Ledger ACS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Canton Vault Dashboard
            </h1>
            <span className="text-xs text-neutral-400">
              Live On-Chain State from Canton Network
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadData}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 border border-neutral-700/80 px-3.5 py-2 rounded-xl hover:bg-neutral-750 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh State</span>
          </button>
          <WalletConnect onPartyChange={setConnectedParty} />
        </div>
      </div>

      <TransactionStatus
        step={txStep}
        onReset={() => setTxStep({ status: 'idle' })}
      />

      {error && (
        <div className={`p-4 rounded-xl text-xs flex items-start space-x-2.5 ${
          network?.authRequired
            ? 'bg-amber-950/40 border border-amber-800/50 text-amber-300'
            : 'bg-red-950/40 border border-red-800/50 text-red-300'
        }`}>
          <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
            network?.authRequired ? 'text-amber-400' : 'text-red-400'
          }`} />
          <div>
            <p className={`font-semibold ${
              network?.authRequired ? 'text-amber-200' : 'text-red-200'
            }`}>
              {network?.authRequired
                ? 'HACKCANTON DEVNET · AUTHENTICATION REQUIRED'
                : (network?.network?.includes('devnet') || network?.endpoint?.includes('fivenorth.io'))
                ? 'HACKCANTON DEVNET · CONNECTIVITY NOTICE'
                : 'CANTON LOCALNET · STATE NOTICE'}
            </p>
            <p className="mt-0.5 text-neutral-300">{error}</p>
            {network?.authRequired ? (
              <p className="mt-1 text-neutral-400 font-mono text-[11px]">
                Protected endpoints (/v2/parties, /v2/query) return HTTP 401 until OAuth2 credentials are configured in the environment. Zero mock contracts are displayed.
              </p>
            ) : (!network?.network?.includes('devnet') && !network?.endpoint?.includes('fivenorth.io')) ? (
              <p className="mt-1 text-neutral-400 font-mono text-[11px]">
                If LocalNet is not active, ensure the Canton participant node JSON API is running.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Vault Selector */}
      {vaults.length > 1 && (
        <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md">
          <span className="text-xs font-semibold text-neutral-300">Select Vault Contract:</span>
          <select
            value={selectedVaultCid || ''}
            onChange={(e) => setSelectedVaultCid(e.target.value)}
            className="text-xs font-mono bg-neutral-950/80 border border-neutral-750 text-white rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500"
          >
            {vaults.map((v) => (
              <option key={v.contractId} value={v.contractId}>
                {v.contractId.slice(0, 16)}... ({v.payload.balance} {v.payload.asset})
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && !selectedVault ? (
        <div className="text-center py-16 bg-neutral-900/40 rounded-2xl border border-neutral-800/60 text-neutral-400 text-xs font-mono">
          Loading live vault state from Canton ledger...
        </div>
      ) : !selectedVault ? (
        <div className="text-center py-16 px-6 bg-neutral-900/40 rounded-2xl border border-dashed border-neutral-800/80 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800/60 border border-neutral-750 flex items-center justify-center mx-auto text-neutral-400">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            No Active Vault Selected
          </h2>
          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
            No active QuorumVault contracts were found on the Canton ledger. QuorumVault never displays mock or simulated contracts.
          </p>
          <div className="pt-3">
            <Link
              href="/create"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-white text-neutral-950 px-5 py-2.5 rounded-full hover:bg-neutral-100 transition shadow"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Deploy First Vault</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Balance & Threshold Cards */}
          <VaultBalance payload={selectedVault.payload} />

          {/* Proposal Creation & Confirmation Management */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <WithdrawalProposal
                vaultCid={selectedVault.contractId}
                vaultPayload={selectedVault.payload}
                connectedParty={connectedParty}
                onStatusChange={(step) => setTxStep(step)}
                onSuccess={loadData}
              />
            </div>

            <div className="lg:col-span-2">
              <ConfirmationPanel
                vaultCid={selectedVault.contractId}
                vaultPayload={selectedVault.payload}
                proposals={proposals}
                receipts={receipts}
                connectedParty={connectedParty}
                onStatusChange={(step) => setTxStep(step)}
                onRefresh={loadData}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VaultPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16 text-neutral-500 text-xs font-mono">
          Loading QuorumVault dashboard...
        </div>
      }
    >
      <VaultDashboardContent />
    </Suspense>
  );
}
