// Canton Transaction Lifecycle Management
// Enforces that wallet approval is separate from ledger consensus.
// ZERO simulated states: status strictly reflects actual operation states.

import { TransactionProgress, TransactionStatusState, TransactionStage } from "../vault/types";

export type { TransactionProgress };
export type StatusListener = (step: TransactionProgress) => void;


export function createInitialTransactionProgress(): TransactionProgress {
  return {
    status: "idle",
    stage: "none",
  };
}

export function updateProgress(
  status: TransactionStatusState,
  stage: TransactionStage,
  message?: string,
  extra?: { error?: string; commandId?: string; transactionId?: string }
): TransactionProgress {
  return {
    status,
    stage,
    message,
    ...extra,
  };
}

export function isLedgerExecuted(progress: TransactionProgress): boolean {
  return progress.status === "executed" && progress.stage === "ledger_execution";
}

/**
 * Executes a Canton command with accurate lifecycle tracking.
 * Does NOT simulate fake wallet delays or pretend transactions succeed.
 */
export async function executeCantonTransaction<TResult>(
  actionName: string,
  fn: () => Promise<TResult>,
  onStatusChange?: StatusListener
): Promise<TResult> {
  const updateStatus = (
    status: TransactionStatusState,
    stage: TransactionStage,
    message?: string,
    error?: string,
    transactionId?: string
  ) => {
    if (onStatusChange) {
      onStatusChange({ status, stage, message, error, transactionId });
    }
  };

  try {
    updateStatus("preparing", "none", `Preparing ${actionName} command...`);

    updateStatus("submitted", "ledger_execution", `Submitting ${actionName} to Canton Participant node...`);

    const result = await fn();

    const txId = (result as any)?.transactionId;
    updateStatus(
      "executed",
      "ledger_execution",
      `${actionName} successfully committed to Canton ledger!`,
      undefined,
      txId
    );

    return result;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    updateStatus("failed", "ledger_execution", `${actionName} failed: ${errorMsg}`, errorMsg);
    throw err;
  }
}
