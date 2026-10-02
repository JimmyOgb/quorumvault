// Canton Ledger Client & Session Management
// Communicates directly with Canton HTTP JSON API and CIP-0103 Provider

import { cantonConfig } from "../config";

export interface CantonParty {
  partyId: string;
  displayName: string;
  isLocal: boolean;
}

export interface CantonWalletSession {
  connected: boolean;
  party: CantonParty | null;
  providerName: string;
}

export interface CantonQueryResponse<T> {
  status: number;
  result: Array<{
    contractId: string;
    templateId: string;
    payload: T;
    signatories: string[];
    observers: string[];
  }>;
}

export interface CantonCreateResponse<T> {
  status: number;
  result: {
    contractId: string;
    templateId: string;
    payload: T;
  };
  transactionId?: string;
}

export interface CantonExerciseResponse<T> {
  status: number;
  result: {
    exerciseResult: T;
    events: Array<{
      created?: {
        contractId: string;
        templateId: string;
        payload: unknown;
      };
      archived?: {
        contractId: string;
        templateId: string;
      };
    }>;
  };
  transactionId?: string;
}

export class CantonClient {
  private static instance: CantonClient;
  private session: CantonWalletSession = {
    connected: false,
    party: null,
    providerName: "CIP-0103 / PartyLayer",
  };

  private constructor() {}

  public static getInstance(): CantonClient {
    if (!CantonClient.instance) {
      CantonClient.instance = new CantonClient();
    }
    return CantonClient.instance;
  }

  public getSession(): CantonWalletSession {
    return this.session;
  }

  public async connectParty(partyId: string, displayName?: string): Promise<CantonWalletSession> {
    if (!partyId || partyId.trim().length === 0) {
      throw new Error("Party ID must be a non-empty Canton party string");
    }

    this.session = {
      connected: true,
      party: {
        partyId: partyId.trim(),
        displayName: displayName || partyId.split("::")[0] || partyId,
        isLocal: true,
      },
      providerName: "Canton Participant Node",
    };

    return this.session;
  }

  public disconnect(): void {
    this.session = {
      connected: false,
      party: null,
      providerName: "CIP-0103 / PartyLayer",
    };
  }
}

export const cantonClient = CantonClient.getInstance();

function getApiBasePath(): string {
  const isDev = cantonConfig.network.includes("devnet") || cantonConfig.network.includes("hackcanton") || cantonConfig.ledgerApiUrl.includes("hackcanton");
  const version = cantonConfig.apiVersion || (isDev ? "v2" : "v1");
  return `${cantonConfig.ledgerApiUrl}/${version}`;
}

/**
 * Queries active contracts of a specific Daml template from Canton Ledger API
 */
export async function queryContractsByTemplate<T>(
  templateId: string,
  token?: string
): Promise<Array<{ contractId: string; payload: T }>> {
  const url = `${getApiBasePath()}/query`;
  const authToken = token || cantonConfig.authToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      templateIds: [templateId],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Canton query failed (HTTP ${response.status}): ${errorBody || response.statusText}`
    );
  }

  const data: CantonQueryResponse<T> = await response.json();
  if (!data.result || !Array.isArray(data.result)) {
    return [];
  }

  return data.result.map((item) => ({
    contractId: item.contractId,
    payload: item.payload,
  }));
}

/**
 * Submits a create contract command to the Canton HTTP JSON API
 */
export async function submitCreateCommand<TPayload, TResult = unknown>(
  templateId: string,
  payload: TPayload,
  token?: string
): Promise<{ contractId: string; payload: TResult; transactionId?: string }> {
  const url = `${getApiBasePath()}/create`;
  const authToken = token || cantonConfig.authToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      templateId,
      payload,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Canton create command rejected (HTTP ${response.status}): ${errorBody || response.statusText}`
    );
  }

  const data: CantonCreateResponse<TResult> = await response.json();
  return {
    contractId: data.result.contractId,
    payload: data.result.payload,
    transactionId: data.transactionId,
  };
}

/**
 * Submits an exercise choice command to the Canton HTTP JSON API
 */
export async function submitExerciseCommand<TArg, TResult = unknown>(
  templateId: string,
  contractId: string,
  choice: string,
  argument: TArg,
  token?: string
): Promise<CantonExerciseResponse<TResult>["result"] & { transactionId?: string }> {
  const url = `${getApiBasePath()}/exercise`;
  const authToken = token || cantonConfig.authToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      templateId,
      contractId,
      choice,
      argument,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Canton choice '${choice}' execution rejected (HTTP ${response.status}): ${errorBody || response.statusText}`
    );
  }

  const data: CantonExerciseResponse<TResult> = await response.json();
  return {
    ...data.result,
    transactionId: data.transactionId,
  };
}
