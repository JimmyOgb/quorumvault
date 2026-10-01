'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Hero } from '@/components/Hero';
import { StatsFooter } from '@/components/StatsFooter';
import { WalletConnect } from '@/components/WalletConnect';
import { VaultCard } from '@/components/VaultCard';
import { queryVaults } from '@/lib/vault/queries';
import { checkNetworkStatus, NetworkStatus } from '@/lib/canton/network';
import { getNetworkDisplayLabel } from '@/lib/config';
import { VaultContract } from '@/lib/vault/types';
import {
  Shield,
  PlusCircle,
  Activity,
  Layers,
  RefreshCw,
  AlertCircle,
  Server,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  const [party, setParty] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [vaults, setVaults] = useState<VaultContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);

  const fetchLedgerState = async () => {
    setLoading(true);
    setQueryError(null);

    // 1. Probe network status
    const netStatus = await checkNetworkStatus();
    setNetwork(netStatus);

    // 2. Query real on-chain vaults if network is authenticated
    if (netStatus.connected) {
      try {
        const liveVaults = await queryVaults();
        setVaults(liveVaults);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setQueryError(`Failed to fetch on-chain vaults from Canton ledger: ${msg}`);
        setVaults([]);
      }
    } else if (netStatus.reachable && netStatus.authRequired) {
      setQueryError(`Five North DevNet validator node is reachable at ${netStatus.endpoint}, but protected Canton Ledger API access (/parties, /query) requires OAuth2 Machine-to-Machine authentication. Live ACS contract queries are gated pending credential provisioning.`);
      setVaults([]);
    } else {
      const isDevNet = netStatus.network.includes("devnet") || netStatus.endpoint.includes("fivenorth.io");
      if (isDevNet) {
        setQueryError(`Unable to reach the Five North DevNet validator node at ${netStatus.endpoint}. Please verify network connectivity.`);
      } else {
        setQueryError(`Unable to connect to Canton LocalNet at ${netStatus.endpoint}. Please ensure your local participant node HTTP JSON API is running.`);
      }
      setVaults([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchLedgerState();
  }, []);

  const envDisplay = getNetworkDisplayLabel(network?.network);

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Intro Hero Section with Visual Hierarchy, Mechanism Preview & Background Video */}
      <Hero />

      {/* Factual Product Mechanics / Architecture Stats */}
      <StatsFooter />

      {/* Real Canton Ledger Operations Section */}
      <section className="space-y-6 max-w-5xl mx-auto pt-4 border-t border-neutral-800/80">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-indigo-400 mb-1">
              <Server className="w-3.5 h-3.5" />
              <span>Real Ledger State</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Active On-Chain Treasury Vaults
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Source of Truth: Canton Ledger Active Contract Set (ACS)
            </p>
          </div>

          <Link
            href="/create"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-750 px-3.5 py-2 rounded-xl transition-colors border border-neutral-700/80 self-start sm:self-auto shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Deploy Vault</span>
          </Link>
        </div>

        {/* Network & Wallet Status Bar */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-300">Canton Node:</span>
              {network ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
                      network.connected
                        ? 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-400'
                        : network.reachable
                        ? 'bg-sky-950/70 border border-sky-800/60 text-sky-300'
                        : 'bg-rose-950/70 border border-rose-800/60 text-rose-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        network.connected
                          ? 'bg-emerald-400 animate-pulse'
                          : network.reachable
                          ? 'bg-sky-400'
                          : 'bg-rose-400'
                      }`}
                    />
                    {network.statusLabel}
                  </span>

                  {network.authRequired && (
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-950/70 border border-amber-800/60 text-amber-300"
                      title="Protected Ledger API requires OAuth2 Bearer token"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
                      AUTHENTICATION REQUIRED
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-neutral-500 font-mono">Querying node...</span>
              )}
            </div>

            <button
              onClick={fetchLedgerState}
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition"
              title="Refresh on-chain state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <WalletConnect onPartyChange={setParty} />
        </div>

        {/* Ledger Query Error Banner (when node is offline or auth-gated) */}
        {queryError && (
          <div className="p-4 bg-amber-950/40 border border-amber-800/50 rounded-xl text-xs text-amber-300 flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-200">
                {network?.authRequired
                  ? "HACKCANTON DEVNET · AUTHENTICATION REQUIRED"
                  : network?.reachable === false
                  ? (network?.network.includes("devnet") || network?.endpoint.includes("fivenorth.io")
                      ? "HACKCANTON DEVNET · CONNECTIVITY NOTICE"
                      : "CANTON LOCALNET · CONNECTIVITY NOTICE")
                  : "Canton Connectivity Notice"}
              </p>
              <p className="mt-0.5 text-neutral-300">{queryError}</p>
              <p className="mt-1 text-neutral-400 font-mono text-[11px]">
                {network?.authRequired
                  ? "OAuth2 client credentials (KEYCLOAK_CLIENT_ID / KEYCLOAK_CLIENT_SECRET) must be provisioned by the Five North / HackCanton infrastructure team. Zero simulated state is displayed."
                  : (network?.network.includes("devnet") || network?.endpoint.includes("fivenorth.io"))
                  ? `Five North validator endpoint: ${network?.endpoint}`
                  : "To connect to live Canton LocalNet, ensure the local participant node HTTP JSON API is running (scripts/localnet/start-localnet.ps1)."}
              </p>
            </div>
          </div>
        )}

        {/* Live Vault Cards or Truthful Empty State */}
        {loading ? (
          <div className="text-center py-14 bg-neutral-900/40 rounded-2xl border border-neutral-800/60 text-neutral-400 text-xs font-mono">
            Querying Canton Active Contract Set (ACS)...
          </div>
        ) : vaults.length === 0 ? (
          <div className="text-center py-14 px-6 bg-neutral-900/40 rounded-2xl border border-dashed border-neutral-800/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800/60 border border-neutral-750 flex items-center justify-center mx-auto text-neutral-400">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              No On-Chain Vaults Found
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              There are currently no active Vault contracts on the Canton ledger. QuorumVault strictly reflects live ledger state and never displays simulated or fake vault data.
            </p>
            <div className="pt-3">
              <Link
                href="/create"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <span>Deploy your first vault on Canton</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {vaults.map((vault) => (
              <VaultCard key={vault.contractId} vault={vault} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
