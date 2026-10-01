'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Shield, Unplug } from 'lucide-react';

interface WalletConnectProps {
  onPartyChange?: (party: string | null) => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ onPartyChange }) => {
  const [party, setParty] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletAvailable, setWalletAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for CIP-0103 window.canton provider on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cantonProvider = (window as unknown as { canton?: unknown }).canton;
      setWalletAvailable(!!cantonProvider);
    }
  }, []);

  const connectCantonWallet = async () => {
    setConnecting(true);
    setError(null);

    try {
      if (typeof window === 'undefined') {
        throw new Error('Window is not available');
      }

      const win = window as unknown as {
        canton?: {
          request: (args: { method: string; params?: unknown }) => Promise<string[] | { party: string }>;
        };
      };

      if (win.canton) {
        // Standard CIP-0103 request
        const accounts = await win.canton.request({
          method: 'canton_requestAccounts',
        });

        let connectedParty: string;
        if (Array.isArray(accounts) && accounts.length > 0) {
          connectedParty = accounts[0];
        } else if (typeof accounts === 'object' && accounts && 'party' in accounts) {
          connectedParty = accounts.party;
        } else {
          throw new Error('No accounts returned from Canton wallet');
        }

        setParty(connectedParty);
        if (onPartyChange) onPartyChange(connectedParty);
      } else {
        // Fallback for LocalNet development when extension is not installed in current browser profile
        // Prompt for Canton Party identifier (e.g. Alice::1220...)
        const inputParty = prompt(
          'CIP-0103 Canton Wallet extension (e.g. Loop, Cantor8, Bron) not detected.\n\nFor LocalNet development, enter your Canton Party identifier (e.g., Alice or Alice::1220...):'
        );

        if (inputParty && inputParty.trim().length > 0) {
          const cleanParty = inputParty.trim();
          setParty(cleanParty);
          if (onPartyChange) onPartyChange(cleanParty);
        } else {
          setError('No Canton party provided. Wallet connection aborted.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to connect Canton wallet: ${msg}`);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setParty(null);
    setError(null);
    if (onPartyChange) onPartyChange(null);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      {error && (
        <span className="text-xs text-rose-300 bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-800/60 font-mono">
          {error}
        </span>
      )}

      {party ? (
        <div className="flex items-center space-x-2.5 bg-neutral-900 border border-emerald-800/50 rounded-xl px-3 py-1.5 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="text-left">
            <span className="text-[10px] uppercase font-mono text-neutral-400 block leading-tight">
              Connected Party
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-300 truncate max-w-[160px] sm:max-w-[220px] block leading-tight">
              {party}
            </span>
          </div>
          <button
            onClick={disconnectWallet}
            title="Disconnect Canton wallet"
            className="text-neutral-500 hover:text-neutral-300 p-1 rounded transition"
          >
            <Unplug className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={connectCantonWallet}
          disabled={connecting}
          className="inline-flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-750 text-white font-medium text-xs px-3.5 py-2 rounded-xl transition-colors border border-neutral-700/80 shadow-sm disabled:opacity-50"
        >
          <Wallet className="w-3.5 h-3.5 text-neutral-300" />
          <span>{connecting ? 'Connecting...' : 'Connect Canton Wallet (CIP-0103)'}</span>
        </button>
      )}
    </div>
  );
};
