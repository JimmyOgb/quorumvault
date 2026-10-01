# QuorumVault Security Model

## Core Philosophy: The Contract is the Security Boundary

In decentralized Canton applications, client-side validation in the frontend is purely for user ergonomics. **The Daml ledger and smart-contract signatories/controllers are the sole authoritative security boundary.**

Even if an attacker modifies client code, intercepts network requests, or uses raw Ledger API calls, the Canton ledger guarantees that no unauthorized action can commit.

---

## Security Invariants Enforced by Daml

### 1. Threshold Enforcement
* **Rule**: A withdrawal can **only** execute if the number of unique operator confirmations is at least `threshold` ($m$).
* **Mechanism**: In `Vault.daml`, `ExecuteWithdrawal` asserts:
  ```daml
  assertMsg "Threshold not met: insufficient confirmations" (length (dedup proposal.confirmations) >= threshold)
  ```
* **Test**: Verified by `testScenarioA_UnderThreshold` and `testScenarioB_ThresholdReached`.

### 2. Authorization & Controller Boundaries
* **Rule**: Only parties listed in `operators` can propose, confirm, or execute withdrawals.
* **Mechanism**:
  - `ProposeWithdrawal`: `controller proposer` with `assertMsg "Proposer must be an authorized operator" (proposer elem operators)`
  - `ConfirmWithdrawal`: `controller operator` with `assertMsg "Only authorized operators can confirm" (operator elem operators)`
  - `ExecuteWithdrawal`: `controller executor` with `assertMsg "Executor must be an authorized operator" (executor elem operators)`
  - `CancelProposal`: `controller operator` with `assertMsg "Only authorized operators can cancel" (operator elem operators)`
* **Test**: Verified by `testScenarioC_UnauthorizedParty` where non-operator `Eve` cannot propose, confirm, or execute.

### 3. Anti-Replay & Double-Spending Protection
* **Single Execution**: When `ExecuteWithdrawal` runs, it immediately exercises `archive proposalCid`. In Daml, an archived contract can never be referenced in another choice. This guarantees a proposal cannot be executed twice.
* **No Duplicate Confirmations**: `ConfirmWithdrawal` asserts `assertMsg "Operator has already confirmed" (operator notElem confirmations)`. An operator cannot submit multiple confirmations to artificially inflate the quorum count.
* **Vault Association**: `ExecuteWithdrawal` verifies `assertMsg "Proposal does not belong to this vault" (proposal.vaultCid == self)`. A proposal cannot be used against a different vault instance.

### 4. Treasury Rate-Limiting & Solvency
* **Maximum Single Withdrawal**: `assertMsg "Amount exceeds maximum single withdrawal limit" (amount <= maxSingleWithdrawal)` prevents drain attacks by capping the loss from any single compromised transaction.
* **Test**: Verified by `testScenarioD_MaxWithdrawalExceeded`.
* **Solvency Guarantee**: `assertMsg "Amount exceeds available vault balance" (proposal.amount <= balance)` ensures the treasury cannot enter a negative balance.

### 5. Audit Trail Immutability
* Every executed withdrawal atomically produces a `WithdrawReceipt` template contract.
* The receipt records:
  - `recipient`: The party receiving funds
  - `amount`: Transferred quantity
  - `asset`: Asset type (e.g. CBTC)
  - `confirmations`: Explicit list of operator parties who approved the action
  - `remainingBalance`: Balance of the treasury immediately post-execution
* `WithdrawReceipt` has NO consuming choices, making it a permanent on-ledger record.
