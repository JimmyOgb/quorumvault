# Real 2-of-2 Multi-Operator Lifecycle Verification on HackCanton DevNet

This document preserves the audit trail and verifiable evidence of the real 2-of-2 multi-operator withdrawal lifecycle executed on the live HackCanton DevNet Canton ledger.

All records below represent actual on-chain ledger transactions, verified contracts, and real execution responses from the HackCanton DevNet environment.

---

## 1. Identities

Two independently authenticated Keycloak subjects and distinct Canton participant parties were utilized for this test run:

| Identity Role | Keycloak Subject | Canton Party Identifier |
| :--- | :--- | :--- |
| **Operator 1** | `4d809018-bff4-43bf-ae81-08a9d77bd84f` (`jimmyogb`) | `4d809018-bff4-43bf-ae81-08a9d77bd84f::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e` |
| **Operator 2** | `30c98bd0-8b8a-4785-a40b-77eb62f3d8cc` (`quorumvault-test`) | `30c98bd0-8b8a-4785-a40b-77eb62f3d8cc::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e` |

**Distinct Identity Confirmation**:
Operator 1 and Operator 2 are distinct identities and distinct Canton parties. Each was issued independent JWT credentials by the Keycloak identity provider, possessing dedicated authorization rights (`CanActAs` / `CanReadAs`) on the Canton participant node.

---

## 2. Package

* **Package Name**: `quorumvault`
* **Package ID**: `c8ac685dd4671ced2983869ef6a118d9698a4280db05fd0e6eef6a67cacdf249`
* **Ledger Endpoint**: `https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services`

---

## 3. Vault Creation

A real 2-of-2 multi-signature vault was instantiated on the HackCanton DevNet ledger with the following parameters:

* **Vault ID**: `devnet-qv-2of2-57ddfd37`
* **Initial Balance**: `100 CBTC` (`100.0`)
* **Threshold**: `2`
* **Operators**:
  1. `4d809018-bff4-43bf-ae81-08a9d77bd84f::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e`
  2. `30c98bd0-8b8a-4785-a40b-77eb62f3d8cc::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e`
* **Max Single Withdrawal**: `25.0 CBTC`
* **Create Command ID**: `cmd-create-b9a89389-dc0c-44ce-9d19-5ba6d4bc0c10`
* **Create Update ID**: `1220af141040c44da1de49953a2f2427beb2b9c946de1fc1dbb72183140f8e9e5d65`
* **Vault Contract ID (CID)**:
  ```text
  00a0b5e2961fcef90b98811f9edf15b3ed73382bbb98adb3059315c4089f83a944ca12122039b6b7b91cc640d4b1a695be508052747329837fdbe6bb02ee4bcc5bb300980e
  ```

---

## 4. Proposal

Operator 1 initiated a formal withdrawal proposal for 10 CBTC:

* **Amount**: `10 CBTC` (`10.0`)
* **Recipient**: Operator 1 (`4d809018-bff4-43bf-ae81-08a9d77bd84f::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e`)
* **Proposal Command ID**: `cmd-propose-03697fb7-2453-4b5c-97f1-85a1674a3206`
* **Proposal Update ID**: `1220660a2385dfa27cea8ed0f3bb4c574e749af796fcead73df178300a9c42017bbb`
* **Proposal CID**:
  ```text
  0006b7d33d9f2d19ff40695c8f1b5663fea551cf3b1580f5274076e50d01995442ca121220982785863af8dbae446e7ef45f0a9586212b2662d87239acf54a45866f5c5087
  ```
* **Initial Confirmation Count**: `1/2` (proposer Operator 1 recorded as first confirmation)

---

## 5. Security Test: Under-Threshold Rejection

To verify that multi-signature rules are enforced deterministically at the ledger engine level, an immediate execution was attempted while the proposal held only 1 of 2 confirmations.

* **Execution Command ID**: `cmd-exec-fail-35056f2d-8297-4857-ab2f-7cc466d9f811`
* **HTTP Status Code**: `400 Bad Request`
* **Error Code**: `DAML_FAILURE`
* **Exact Meaningful Reason**: `"Threshold not met: insufficient confirmations"`
* **Raw Ledger Engine Diagnostic**:
  ```json
  {
    "code": "DAML_FAILURE",
    "cause": "Interpretation error: Error: User failure: UNHANDLED_EXCEPTION/DA.Exception.AssertionFailed:AssertionFailed (error category 9): Threshold not met: insufficient confirmations",
    "correlationId": "48b0be3c-a507-4619-bb6b-870cb554a4fa",
    "traceId": "5a5e35b7eb25c58c98f2f6f460f41dd4"
  }
  ```
* **Security Finding**:
  This demonstrates rigorous contract-level enforcement, not merely frontend validation. The Canton ledger engine rejected the state transition because the Daml smart contract invariant `assertMsg "Threshold not met: insufficient confirmations" (length proposal.confirmations >= threshold)` failed during on-chain command interpretation.

---

## 6. Second Approval

Operator 2 exercised the `ConfirmWithdrawal` choice using their own independent bearer credentials:

* **Operator 2 ConfirmWithdrawal Command ID**: `cmd-approve-2ee42c22-4d91-495f-b7a6-0269a21fe73d`
* **Update ID**: `12206b217d2ec4a6c78f67bb39761a5a73552abd19afcd94e0c57aec1f1fb334cb23`
* **Resulting Proposal CID**:
  ```text
  000ab06d1284636047558d9a97910be7f14a314fbe6115ab242dfdc3cf5bedb568ca121220f3e8b5d327e4c9bd96d56bc1b02a88ea8e892c737b6767bb49fd372d19cd3d48
  ```
* **Recorded Confirmations**:
  Both distinct Canton parties were recorded on-chain:
  1. `30c98bd0-8b8a-4785-a40b-77eb62f3d8cc::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e`
  2. `4d809018-bff4-43bf-ae81-08a9d77bd84f::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e`
* **Confirmation Status**: `2/2` threshold achieved.

---

## 7. Successful Execution

With 2 of 2 distinct signatures confirmed on-chain, Operator 1 executed the `ExecuteWithdrawal` choice:

* **Execute Command ID**: `cmd-exec-success-9d71d18e-cbd1-478f-b269-4e59791d4d75`
* **Update ID**: `1220916c89139e06ce37844f48e289c96c6fd516bcebd28277d8e14ad5b7015a9f08`
* **Contract Lifecycle**: The pending `WithdrawProposal` contract (`000ab06d...`) was consumed and archived by the Daml choice execution. The previous `Vault` contract was archived and replaced with a newly created `Vault` reflecting the debited balance.

---

## 8. Balance Progression

* **Balance Before**: `100 CBTC` (`100.0000000000`)
* **Withdrawal Amount**: `10 CBTC` (`10.0000000000`)
* **Balance After**: `90 CBTC` (`90.0000000000`)
* **New Active Vault CID**:
  ```text
  0088f5c2aa5f3fb37d11a1867fc842ac89f7510cc4d6e178632a7ded78be8a2cabca1212204a481148de3369286ebd8e4a25e1de48157307d034986693d1bfe1336d0ad825
  ```

---

## 9. Receipt Verification

An immutable audit receipt contract (`Vault:WithdrawReceipt`) was minted on-chain during execution:

* **WithdrawReceipt CID**:
  ```text
  00828728ae4bf13ebf42ee28a01b9d07b2c56687be9c89e1a70c51e3d73d08feb1ca121220a7452ee607e6c18f626bcf56b46c818ea09eb729b8a10c240c302437e5084ed9
  ```
* **Amount**: `10 CBTC` (`10.0000000000`)
* **Remaining Balance**: `90 CBTC` (`90.0000000000`)
* **Recipient**: Operator 1 (`4d809018-bff4-43bf-ae81-08a9d77bd84f::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e`)
* **Recorded Signers**: Both operators (`Operator 1` and `Operator 2`) are permanently recorded on the receipt.

---

## 10. Final ACS Verification

A direct Active Contract Set (ACS) query against `/v2/state/active-contracts` was performed at ledger end offset:

* **Ledger End Offset**: `2194723`
* **Active Vault**: Present at `90 CBTC` (CID: `0088f5c2aa5f3fb37d11a1867fc842ac89f7510cc4d6e178632a7ded78be8a2cabca1212204a481148de3369286ebd8e4a25e1de48157307d034986693d1bfe1336d0ad825`)
* **Active WithdrawReceipt**: Present at `10 CBTC` (CID: `00828728ae4bf13ebf42ee28a01b9d07b2c56687be9c89e1a70c51e3d73d08feb1ca121220a7452ee607e6c18f626bcf56b46c818ea09eb729b8a10c240c302437e5084ed9`)
* **WithdrawProposal Status**: Absent/archived (consumed during execution, not present in ACS).

---

## 11. Integrity Statement

"This verification was executed against HackCanton DevNet using two independently authenticated Canton parties. No mock balances, synthetic transactions, fabricated contract IDs, or simulated approvals were used."

"Live 2-of-2 authorization has now been verified on HackCanton DevNet for the tested CBTC withdrawal lifecycle. This is testnet/devnet evidence and is not a claim of production/mainnet deployment."
