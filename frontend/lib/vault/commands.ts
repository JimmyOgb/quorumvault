import { cantonConfig } from "../config";
import { TransactionProgress } from "./types";
import { updateProgress, StatusListener } from "../canton/transactions";

export type { StatusListener };

function getApiBasePath(): string {
  const version = cantonConfig.apiVersion || (cantonConfig.network.includes("devnet") ? "v2" : "v1");
  return `${cantonConfig.ledgerApiUrl}/${version}`;
}

/**
 * Real data boundary for Canton Ledger API commands.
 * Submits Daml commands directly to Canton participant endpoint.
 * Accurately reports wallet signing vs true ledger execution stages.
 * Never mocks or fakes a successful submission or synthetic contract IDs.
 */

export interface CreateVaultParams {
  custodian?: string;
  owner?: string;
  vaultId?: string;
  operators: string[];
  threshold: number;
  initialBalance?: number;
  balance?: string | number;
  asset: string;
  maxSingleWithdrawal: number | string;
}

export async function createVaultCommand(
  params: CreateVaultParams,
  tokenOrProgress?: string | StatusListener,
  onProgress?: StatusListener
): Promise<{ contractId: string; transactionId?: string }> {
  const listener = typeof tokenOrProgress === "function" ? tokenOrProgress : onProgress;
  const token = typeof tokenOrProgress === "string" ? tokenOrProgress : undefined;

  listener?.(updateProgress("preparing", "none", "Validating vault parameters"));

  const adminParty = params.owner || params.custodian || "";
  const vId = params.vaultId || `vault-${adminParty}`;
  const numBalance = typeof params.balance === "number" ? params.balance : params.initialBalance ?? parseFloat(String(params.balance || 0));
  const numMax = typeof params.maxSingleWithdrawal === "number" ? params.maxSingleWithdrawal : parseFloat(String(params.maxSingleWithdrawal || 0));

  if (params.threshold < 1) {
    throw new Error("Threshold must be at least 1");
  }
  if (params.threshold > params.operators.length) {
    throw new Error("Threshold cannot exceed operator count");
  }
  if (numMax <= 0) {
    throw new Error("Max single withdrawal must be positive");
  }

  listener?.(updateProgress("awaiting_wallet", "wallet_approval", "Requesting signature from creator party"));

  const templateId = cantonConfig.templates?.vault || cantonConfig.vaultTemplateId || "Vault:Vault";

  const payload = {
    templateId,
    payload: {
      owner: adminParty,
      vaultId: vId,
      operators: params.operators,
      threshold: params.threshold,
      balance: numBalance,
      asset: params.asset,
      maxSingleWithdrawal: numMax,
    },
  };

  listener?.(updateProgress("submitted", "ledger_execution", "Submitting transaction to Canton participant..."));

  const endpoint = `${getApiBasePath()}/create`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const failureMsg = `Canton ledger rejected create: HTTP ${response.status} - ${errorText}`;
    listener?.(updateProgress("failed", "ledger_execution", failureMsg, { error: failureMsg }));
    throw new Error(failureMsg);
  }

  const result = await response.json();
  const contractId = result?.result?.contractId || result?.contractId;
  if (!contractId) {
    const failureMsg = `Canton ledger response did not include contractId: ${JSON.stringify(result)}`;
    listener?.(updateProgress("failed", "ledger_execution", failureMsg, { error: failureMsg }));
    throw new Error(failureMsg);
  }

  const txId = result?.transactionId || result?.result?.transactionId;

  listener?.(
    updateProgress("executed", "ledger_execution", "Vault contract committed to Canton ledger", {
      transactionId: txId,
    })
  );

  return { contractId, transactionId: txId };
}

export const createVault = createVaultCommand;

export interface ProposeWithdrawalParams {
  vaultContractId?: string;
  vaultCid?: string;
  proposerParty?: string;
  proposer?: string;
  recipientParty?: string;
  recipient?: string;
  amount: number | string;
  memo: string;
}

export async function proposeWithdrawalCommand(
  params: ProposeWithdrawalParams,
  tokenOrProgress?: string | StatusListener,
  onProgress?: StatusListener
): Promise<{ proposalContractId: string; transactionId?: string }> {
  const listener = typeof tokenOrProgress === "function" ? tokenOrProgress : onProgress;
  const token = typeof tokenOrProgress === "string" ? tokenOrProgress : undefined;

  listener?.(updateProgress("preparing", "none", "Validating withdrawal proposal"));

  const numAmount = typeof params.amount === "number" ? params.amount : parseFloat(String(params.amount));
  const vCid = params.vaultContractId || params.vaultCid || "";
  const prop = params.proposerParty || params.proposer || "";
  const rcpt = params.recipientParty || params.recipient || "";

  if (numAmount <= 0) {
    throw new Error("Withdrawal amount must be greater than 0");
  }

  listener?.(updateProgress("awaiting_wallet", "wallet_approval", "Requesting signature from proposer"));

  const templateId = cantonConfig.templates?.vault || cantonConfig.vaultTemplateId || "Vault:Vault";

  const payload = {
    templateId,
    contractId: vCid,
    choice: "ProposeWithdrawal",
    argument: {
      proposer: prop,
      recipient: rcpt,
      amount: numAmount,
      memo: params.memo,
    },
  };

  listener?.(updateProgress("submitted", "ledger_execution", "Submitting proposal exercise to Canton..."));

  const endpoint = `${getApiBasePath()}/exercise`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const failureMsg = `Proposal failed on ledger: HTTP ${response.status} - ${errorText}`;
    listener?.(updateProgress("failed", "ledger_execution", failureMsg, { error: failureMsg }));
    throw new Error(failureMsg);
  }

  const result = await response.json();
  const proposalContractId = result?.result?.exerciseResult || result?.exerciseResult;
  if (!proposalContractId) {
    const failureMsg = `Ledger did not return proposal contractId: ${JSON.stringify(result)}`;
    listener?.(updateProgress("failed", "ledger_execution", failureMsg, { error: failureMsg }));
    throw new Error(failureMsg);
  }

  const txId = result?.transactionId || result?.result?.transactionId;

  listener?.(
    updateProgress("executed", "ledger_execution", "Withdrawal proposal recorded on Canton ledger", {
      transactionId: txId,
    })
  );

  return { proposalContractId, transactionId: txId };
}

export const proposeWithdrawal = proposeWithdrawalCommand;

export interface ConfirmWithdrawalParams {
  proposalContractId?: string;
  proposalCid?: string;
  contractId?: string;
  operatorParty?: string;
  operator?: string;
}

export async function confirmWithdrawalCommand(
  params: ConfirmWithdrawalParams,
  tokenOrProgress?: string | StatusListener,
  onProgress?: StatusListener
): Promise<{ newProposalContractId: string; transactionId?: string }> {
  const listener = typeof tokenOrProgress === "function" ? tokenOrProgress : onProgress;
  const token = typeof tokenOrProgress === "string" ? tokenOrProgress : undefined;

  listener?.(updateProgress("awaiting_wallet", "wallet_approval", "Requesting signature from operator"));

  const pCid = params.proposalContractId || params.proposalCid || params.contractId || "";
  const op = params.operatorParty || params.operator || "";

  const templateId =
    cantonConfig.templates?.withdrawProposal ||
    cantonConfig.proposalTemplateId ||
    "Vault:WithdrawProposal";

  const payload = {
    templateId,
    contractId: pCid,
    choice: "ConfirmWithdrawal",
    argument: {
      operator: op,
    },
  };

  listener?.(updateProgress("submitted", "ledger_execution", "Submitting approval to Canton..."));

  const endpoint = `${getApiBasePath()}/exercise`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const failureMsg = `Approval rejected by ledger: HTTP ${response.status} - ${errorText}`;
    listener?.(updateProgress("failed", "ledger_execution", failureMsg, { error: failureMsg }));
    throw new Error(failureMsg);
  }

  const result = await response.json();
  const newProposalContractId = result?.result?.exerciseResult || result?.exerciseResult;
  if (!newProposalContractId) {
    const failureMsg = `Ledger did not return updated proposal contractId: ${JSON.stringify(result)}`;
    listener?.(updateProgress("failed", "ledger_execution", failureMsg, { error: failureMsg }));
    throw new Error(failureMsg);
  }

  const txId = result?.transactionId || result?.result?.transactionId;

  listener?.(
    updateProgress("executed", "ledger_execution", "Operator confirmation committed to ledger", {
      transactionId: txId,
    })
  );

  return { newProposalContractId, transactionId: txId };
}

export const confirmWithdrawal = confirmWithdrawalCommand;

export interface CancelWithdrawalParams {
  proposalContractId?: string;
  proposalCid?: string;
  contractId?: string;
  operatorParty?: string;
  operator?: string;
}

export async function cancelWithdrawalCommand(
  params: CancelWithdrawalParams,
  tokenOrProgress?: string | StatusListener,
  onProgress?: StatusListener
): Promise<{ transactionId?: string }> {
  const listener = typeof tokenOrProgress === "function" ? tokenOrProgress : onProgress;
  const token = typeof tokenOrProgress === "string" ? tokenOrProgress : undefined;

  listener?.(updateProgress("awaiting_wallet", "wallet_approval", "Requesting cancellation authorization"));

  const pCid = params.proposalContractId || params.proposalCid || params.contractId || "";
  const op = params.operatorParty || params.operator || "";

  const templateId =
    cantonConfig.templates?.withdrawProposal ||
    cantonConfig.proposalTemplateId ||
    "Vault:WithdrawProposal";

  const payload = {
    templateId,
    contractId: pCid,
    choice: "CancelProposal",
    argument: {
      operator: op,
    },
  };

  listener?.(updateProgress("submitted", "ledger_execution", "Submitting cancellation to Canton..."));

  const endpoint = `${getApiBasePath()}/exercise`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const failureMsg = `Cancellation rejected: HTTP ${response.status} - ${errorText}`;
    listener?.(updateProgress("failed", "ledger_execution", failureMsg, { error: failureMsg }));
    throw new Error(failureMsg);
  }

  const result = await response.json();
  const txId = result?.transactionId || result?.result?.transactionId;

  listener?.(
    updateProgress("executed", "ledger_execution", "Proposal archived from ledger", {
      transactionId: txId,
    })
  );

  return { transactionId: txId };
}

export const cancelWithdrawal = cancelWithdrawalCommand;

export interface ExecuteWithdrawalParams {
  vaultContractId?: string;
  vaultCid?: string;
  proposalContractId?: string;
  proposalCid?: string;
  executorParty?: string;
  executor?: string;
}

export async function executeWithdrawalCommand(
  params: ExecuteWithdrawalParams,
  tokenOrProgress?: string | StatusListener,
  onProgress?: StatusListener
): Promise<{ newVaultContractId: string; receiptContractId: string; transactionId?: string }> {
  const listener = typeof tokenOrProgress === "function" ? tokenOrProgress : onProgress;
  const token = typeof tokenOrProgress === "string" ? tokenOrProgress : undefined;

  listener?.(updateProgress("awaiting_wallet", "wallet_approval", "Authorizing withdrawal execution"));

  const vCid = params.vaultContractId || params.vaultCid || "";
  const pCid = params.proposalContractId || params.proposalCid || "";
  const exec = params.executorParty || params.executor || "";

  const templateId = cantonConfig.templates?.vault || cantonConfig.vaultTemplateId || "Vault:Vault";

  const payload = {
    templateId,
    contractId: vCid,
    choice: "ExecuteWithdrawal",
    argument: {
      proposalCid: pCid,
      executor: exec,
    },
  };

  listener?.(updateProgress("submitted", "ledger_execution", "Executing withdrawal on Canton..."));

  const endpoint = `${getApiBasePath()}/exercise`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const failureMsg = `Execution rejected: HTTP ${response.status} - ${errorText}`;
    listener?.(updateProgress("failed", "ledger_execution", failureMsg, { error: failureMsg }));
    throw new Error(failureMsg);
  }

  const result = await response.json();
  const exerciseResult = result?.result?.exerciseResult || result?.exerciseResult;
  if (!exerciseResult || !Array.isArray(exerciseResult) || exerciseResult.length < 2) {
    const failureMsg = `Ledger did not return expected (Vault, WithdrawReceipt) contract IDs: ${JSON.stringify(result)}`;
    listener?.(updateProgress("failed", "ledger_execution", failureMsg, { error: failureMsg }));
    throw new Error(failureMsg);
  }

  const [newVaultContractId, receiptContractId] = exerciseResult;
  const txId = result?.transactionId || result?.result?.transactionId;

  listener?.(
    updateProgress("executed", "ledger_execution", "Withdrawal executed and WithdrawReceipt created", {
      transactionId: txId,
    })
  );

  return { newVaultContractId, receiptContractId, transactionId: txId };
}

export const executeWithdrawal = executeWithdrawalCommand;
