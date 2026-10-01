# QuorumVault Architecture

## Overview

QuorumVault is an *m-of-n* threshold-governed treasury and custody application built for the Canton Network. It targets the BitSafe "Decentralizing Apps on Canton" contribution pool by establishing a multi-operator custody architecture where no single entity can unilaterally debit or transfer treasury assets.

## System Components

```
+-------------------------------------------------------------+
|                  Canton CIP-0103 Wallets                    |
|             (e.g., Loop, Bron, Cantor8, Nightly)            |
+-------------------------------------------------------------+
                               |
                               | CIP-0103 Provider Standard
                               v
+-------------------------------------------------------------+
|                  QuorumVault Next.js dApp                   |
|  - WalletConnect (CIP-0103 / PartyLayerKit Provider)        |
|  - queries.ts (Canton Ledger ACS queries)                   |
|  - commands.ts (Daml Command Submission)                    |
|  - TransactionStatus (Multi-stage execution lifecycle)      |
+-------------------------------------------------------------+
                               |
                               | JSON-RPC / Ledger API
                               v
+-------------------------------------------------------------+
|                  Canton Network Ledger API                  |
|  - Participant Node / JSON API Endpoint                     |
+-------------------------------------------------------------+
                               |
                               | Daml-LF Execution
                               v
+-------------------------------------------------------------+
|                     Daml Smart Contracts                    |
|  - Vault (Signatory: owner, Observer: operators)            |
|  - WithdrawProposal (Confirmations collected)               |
|  - WithdrawReceipt (Immutable audit trail)                  |
+-------------------------------------------------------------+
```

## Contract Lifecycle

1. **Vault Creation**:
   - The `owner` party defines `operators = [O_1, O_2, ..., O_n]`, `threshold = m` ($1 \le m \le n$), and `maxSingleWithdrawal`.
   - Initial balance is established.

2. **Withdrawal Proposal**:
   - Any authorized operator $O_i \in \text{operators}$ exercises `ProposeWithdrawal` on `Vault`.
   - A `WithdrawProposal` contract is created with `confirmations = [O_i]`.
   - The vault balance remains **100% untouched** at this stage.

3. **Operator Confirmations**:
   - Other authorized operators exercise `ConfirmWithdrawal` on `WithdrawProposal`.
   - Duplicate confirmations from the same operator are strictly prohibited (`assertMsg (operator notElem confirmations)`).

4. **Execution**:
   - Once $|\text{confirmations}| \ge m$, an operator exercises `ExecuteWithdrawal` on `Vault`, referencing the proposal contract.
   - The proposal contract is archived.
   - The vault balance is atomically debited: `balance' = balance - amount`.
   - An immutable `WithdrawReceipt` is issued recording the recipient, amount, confirmations, and remaining balance.

5. **Cancellation**:
   - Any authorized operator can exercise `CancelProposal` on a pending proposal before execution.
