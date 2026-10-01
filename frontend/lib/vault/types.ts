// QuorumVault Daml Type Definitions

export type Party = string;

export interface VaultPayload {
  owner: Party;
  custodian?: Party;
  vaultId: string;
  operators: Party[];
  threshold: number;
  balance: number;
  asset: string;
  maxSingleWithdrawal: number;
}

export interface VaultContract {
  contractId: string;
  custodian: string;
  owner: string;
  vaultId: string;
  operators: string[];
  threshold: number;
  balance: number;
  asset: string;
  maxSingleWithdrawal: number;
  payload: VaultPayload;
}

export interface WithdrawProposalPayload {
  vaultCid: string;
  owner: Party;
  custodian?: Party;
  vaultId: string;
  operators: Party[];
  threshold: number;
  maxSingleWithdrawal: number;
  proposer: Party;
  recipient: Party;
  amount: number;
  memo: string;
  approvals: Party[];
  confirmations: Party[];
}

export interface WithdrawProposalContract {
  contractId: string;
  vaultCid: string;
  custodian: string;
  owner: string;
  vaultId: string;
  operators: string[];
  threshold: number;
  maxSingleWithdrawal: number;
  proposer: string;
  recipient: string;
  amount: number;
  memo: string;
  approvals: string[];
  confirmations: string[];
  payload: WithdrawProposalPayload;
}

export interface WithdrawReceiptPayload {
  owner: Party;
  custodian?: Party;
  vaultId: string;
  recipient: Party;
  amount: number;
  asset: string;
  approvals: Party[];
  confirmations: Party[];
  memo: string;
  remainingBalance: number;
}

export interface WithdrawReceiptContract {
  contractId: string;
  custodian: string;
  owner: string;
  vaultId: string;
  recipient: string;
  amount: number;
  asset: string;
  approvals: string[];
  confirmations: string[];
  memo: string;
  remainingBalance: number;
  payload: WithdrawReceiptPayload;
}

// Transaction execution lifecycle states
export type TransactionStatusState =
  | "idle"
  | "preparing"
  | "awaiting_wallet"
  | "submitted"
  | "pending"
  | "executed"
  | "failed";

export type TransactionStage = "none" | "wallet_approval" | "ledger_execution";

export interface TransactionProgress {
  status: TransactionStatusState;
  stage?: TransactionStage;
  message?: string;
  error?: string;
  commandId?: string;
  transactionId?: string;
}

export type TransactionStep = TransactionProgress;
