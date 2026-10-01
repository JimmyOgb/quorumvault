# QuorumVault Frontend

A production-minded, Canton-native Next.js + TypeScript interface for **QuorumVault**, an *m-of-n* threshold-governed custody vault built for **HackCanton Season 3**.

---

## Key Principles & Design Philosophy

1. **Zero Simulation / Real Data Only**:
   - No mock vaults, no fake balances, no simulated transaction hashes.
   - All state is derived directly from the Canton Active Contract Set (ACS) via the Canton HTTP JSON Ledger API or CIP-0103 provider.
   - When no contracts exist or the network is offline, the interface explicitly shows empty / not connected states.

2. **Canton-Native Architecture (CIP-0103)**:
   - Built around the **CIP-0103** dApp standard (`window.canton` provider object) and **PartyLayer** integration.
   - Does not assume Ethereum, MetaMask, or EVM transaction formats.

3. **Strict Transaction Lifecycle**:
   - Explicitly distinguishes between **wallet signature approval** and **ledger consensus/execution**.
   - A wallet approval is never presented as a successful transaction until committed to the ledger ACS.

---

## Directory Structure

```text
frontend/
├── app/
│   ├── layout.tsx             # Root layout with navigation & branding
│   ├── page.tsx               # Home / ACS vault list / network status
│   ├── create/
│   │   └── page.tsx           # Deploy new QuorumVault with validation
│   └── vault/
│       └── page.tsx           # Active proposals, confirmations, and audit receipts
│
├── components/
│   ├── WalletConnect.tsx      # CIP-0103 Canton wallet connection
│   ├── VaultCard.tsx          # Summary card for active vault contracts
│   ├── VaultBalance.tsx       # Live treasury balance and limit displays
│   ├── WithdrawalProposal.tsx # Proposal creation form with Daml constraints
│   ├── ConfirmationPanel.tsx  # Multi-operator confirmations and execution
│   └── TransactionStatus.tsx  # Multi-stage transaction lifecycle component
│
├── lib/
│   ├── canton/
│   │   ├── client.ts          # Canton HTTP JSON API client
│   │   ├── network.ts         # Network health probe and status
│   │   └── transactions.ts    # Transaction execution and state tracking
│   ├── vault/
│   │   ├── queries.ts         # Query real Canton ACS contracts
│   │   ├── commands.ts        # Daml create and choice execution commands
│   │   └── types.ts           # TypeScript interfaces matching Daml models
│   └── config.ts              # Network and Daml template ID configuration
│
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Getting Started

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure:
```env
NEXT_PUBLIC_CANTON_NETWORK=localnet
NEXT_PUBLIC_CANTON_LEDGER_API=http://localhost:7575
NEXT_PUBLIC_VAULT_PACKAGE_ID=<your-built-package-id>
```

### 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### 4. Typecheck and Build

```bash
npm run typecheck
npm run build
```
