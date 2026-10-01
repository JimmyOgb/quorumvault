# Canton Wallet Integration (CIP-0103 & PartyLayer)

## Overview

QuorumVault uses native Canton Network dApp wallet patterns rather than Ethereum-style EVM providers.

```
+-----------------------------------------------------------+
|                   Canton Native Wallet                    |
|        (e.g., Cantor8, Bron, Loop, Nightly Browser Ext)   |
+-----------------------------------------------------------+
                              |
                              | Window injection: window.canton
                              v
+-----------------------------------------------------------+
|               CIP-0103 Provider Interface                 |
|   - canton_requestAccounts / accountsChanged              |
|   - canton_signMessage / canton_signTransaction           |
+-----------------------------------------------------------+
                              |
                              | Unified Abstraction
                              v
+-----------------------------------------------------------+
|           PartyLayer SDK (@partylayer/react)              |
|   - <PartyLayerKit> Context Provider                      |
|   - useSession() -> { isConnected, account, status }     |
|   - useProvider() -> JSON-RPC & Command Execution         |
+-----------------------------------------------------------+
                              |
                              v
+-----------------------------------------------------------+
|                QuorumVault React Components               |
|   - WalletConnect.tsx                                     |
|   - commands.ts                                           |
+-----------------------------------------------------------+
```

## Why CIP-0103?

* **No Ethereum assumptions**: Canton parties are not Ethereum hex addresses; they are structured participant-qualified identifiers (e.g. `Alice::1220...` or `PartyId`).
* **Multi-Party Privacy**: Transactions on Canton have explicit sub-transaction privacy and multi-party signing semantics.
* **Standard JSON-RPC 2.0**: CIP-0103 defines standard RPC methods (`canton_connect`, `canton_disconnect`, `canton_submitTransaction`) ensuring any compatible Canton wallet works without proprietary dApp code.

## PartyLayer Integration Pattern

In `app/layout.tsx`:
```tsx
import { PartyLayerKit } from '@partylayer/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <PartyLayerKit network="localnet" appName="QuorumVault">
      {children}
    </PartyLayerKit>
  );
}
```

In `components/WalletConnect.tsx`:
```tsx
import { useSession } from '@partylayer/react';

export function WalletConnect() {
  const { isConnected, account, connect, disconnect, status } = useSession();

  return (
    <div>
      {isConnected ? (
        <div>
          <span>Party: {account?.party || account?.address}</span>
          <button onClick={() => disconnect()}>Disconnect</button>
        </div>
      ) : (
        <button onClick={() => connect()}>Connect Canton Wallet</button>
      )}
    </div>
  );
}
```

## Transaction Lifecycle Distinction

Canton dApps must distinguish between two phases:
1. **Wallet Approval**: The user signs the command payload in their wallet extension. This does **not** mean the transaction was accepted by the Canton synchronizer.
2. **Ledger Execution**: The command is submitted to the Canton Participant Ledger API, validated against Daml-LF rules, sequenced through the synchronizer, and committed to the Active Contract Set (ACS).

QuorumVault uses `TransactionStatus.tsx` to explicitly present all states:
- `idle`
- `preparing`
- `awaiting_wallet`
- `submitted`
- `pending`
- `executed`
- `failed`
