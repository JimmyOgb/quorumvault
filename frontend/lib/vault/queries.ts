import { cantonConfig } from "../config";
import { queryContractsByTemplate } from "../canton/client";
import {
  VaultContract,
  VaultPayload,
  WithdrawProposalContract,
  WithdrawProposalPayload,
  WithdrawReceiptContract,
  WithdrawReceiptPayload,
} from "./types";

/**
 * Real data boundary for Canton Ledger API queries.
 * Queries active contracts from the connected participant node.
 * Strictly returns actual ledger data or throws explicit errors if unreachable.
 * Never returns mock or simulated data.
 */

export async function fetchVaultContracts(partyId?: string): Promise<VaultContract[]> {
  const templateId = cantonConfig.templates?.vault || cantonConfig.vaultTemplateId || "Vault:Vault";

  try {
    const contracts = await queryContractsByTemplate<any>(templateId);

    return contracts.map((item) => {
      const payload = item.payload || {};
      const ownerParty = payload.owner || payload.custodian || "";
      const vaultData: VaultContract = {
        contractId: item.contractId,
        custodian: ownerParty,
        owner: ownerParty,
        vaultId: payload.vaultId || item.contractId,
        operators: payload.operators || [],
        threshold: Number(payload.threshold || 0),
        balance: Number(payload.balance || 0),
        asset: payload.asset || "CBTC",
        maxSingleWithdrawal: Number(payload.maxSingleWithdrawal || 0),
        payload: {
          owner: ownerParty,
          custodian: ownerParty,
          vaultId: payload.vaultId || item.contractId,
          operators: payload.operators || [],
          threshold: Number(payload.threshold || 0),
          balance: Number(payload.balance || 0),
          asset: payload.asset || "CBTC",
          maxSingleWithdrawal: Number(payload.maxSingleWithdrawal || 0),
        },
      };
      return vaultData;
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to fetch real Vault contracts: ${message}`);
  }
}

export const queryVaults = fetchVaultContracts;

export async function queryVaultById(contractId: string): Promise<VaultContract | null> {
  const vaults = await fetchVaultContracts();
  return vaults.find((v) => v.contractId === contractId || v.vaultId === contractId) || null;
}

export async function fetchWithdrawalProposals(vaultId?: string): Promise<WithdrawProposalContract[]> {
  const templateId =
    cantonConfig.templates?.withdrawProposal ||
    cantonConfig.proposalTemplateId ||
    "Vault:WithdrawProposal";

  try {
    const contracts = await queryContractsByTemplate<any>(templateId);

    return contracts
      .filter((item) => !vaultId || item.payload?.vaultId === vaultId || item.payload?.vaultCid === vaultId)
      .map((item) => {
        const payload = item.payload || {};
        const ownerParty = payload.owner || payload.custodian || "";
        const confs = payload.confirmations || payload.approvals || [];
        const proposalData: WithdrawProposalContract = {
          contractId: item.contractId,
          vaultCid: payload.vaultCid || "",
          custodian: ownerParty,
          owner: ownerParty,
          vaultId: payload.vaultId || "",
          operators: payload.operators || [],
          threshold: Number(payload.threshold || 0),
          maxSingleWithdrawal: Number(payload.maxSingleWithdrawal || 0),
          proposer: payload.proposer || "",
          recipient: payload.recipient || "",
          amount: Number(payload.amount || 0),
          memo: payload.memo || "",
          approvals: confs,
          confirmations: confs,
          payload: {
            vaultCid: payload.vaultCid || "",
            owner: ownerParty,
            custodian: ownerParty,
            vaultId: payload.vaultId || "",
            operators: payload.operators || [],
            threshold: Number(payload.threshold || 0),
            maxSingleWithdrawal: Number(payload.maxSingleWithdrawal || 0),
            proposer: payload.proposer || "",
            recipient: payload.recipient || "",
            amount: Number(payload.amount || 0),
            memo: payload.memo || "",
            approvals: confs,
            confirmations: confs,
          },
        };
        return proposalData;
      });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to fetch real Withdrawal Proposals: ${message}`);
  }
}

export const queryWithdrawProposals = fetchWithdrawalProposals;

export async function fetchWithdrawReceipts(vaultId?: string): Promise<WithdrawReceiptContract[]> {
  const templateId =
    cantonConfig.templates?.withdrawReceipt ||
    cantonConfig.receiptTemplateId ||
    "Vault:WithdrawReceipt";

  try {
    const contracts = await queryContractsByTemplate<any>(templateId);

    return contracts
      .filter((item) => !vaultId || item.payload?.vaultId === vaultId)
      .map((item) => {
        const payload = item.payload || {};
        const ownerParty = payload.owner || payload.custodian || "";
        const confs = payload.confirmations || payload.approvals || [];
        const receiptData: WithdrawReceiptContract = {
          contractId: item.contractId,
          custodian: ownerParty,
          owner: ownerParty,
          vaultId: payload.vaultId || "",
          recipient: payload.recipient || "",
          amount: Number(payload.amount || 0),
          asset: payload.asset || "CBTC",
          approvals: confs,
          confirmations: confs,
          memo: payload.memo || "",
          remainingBalance: Number(payload.remainingBalance || 0),
          payload: {
            owner: ownerParty,
            custodian: ownerParty,
            vaultId: payload.vaultId || "",
            recipient: payload.recipient || "",
            amount: Number(payload.amount || 0),
            asset: payload.asset || "CBTC",
            approvals: confs,
            confirmations: confs,
            memo: payload.memo || "",
            remainingBalance: Number(payload.remainingBalance || 0),
          },
        };
        return receiptData;
      });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to fetch real Withdraw Receipts: ${message}`);
  }
}

export const queryWithdrawReceipts = fetchWithdrawReceipts;
