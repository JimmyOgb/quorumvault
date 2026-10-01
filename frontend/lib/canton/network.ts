// Canton Network Connection Utilities

import { cantonConfig, getNetworkDisplayLabel } from "../config";

export type LedgerAccessStatus =
  | "connected"
  | "node_reachable"
  | "offline";

export interface NetworkHealth {
  connected: boolean;
  reachable: boolean;
  authenticated: boolean;
  authRequired: boolean;
  status: LedgerAccessStatus;
  statusLabel: string;
  authStatusLabel?: string;
  network: string;
  endpoint: string;
  apiVersion?: string;
  version?: string;
  error?: string;
  details?: Record<string, unknown> | string;
}

export type NetworkStatus = NetworkHealth;

export async function checkCantonNetwork(): Promise<NetworkHealth> {
  const endpoint = cantonConfig.ledgerApiUrl;
  const network = cantonConfig.network;
  const token = cantonConfig.authToken;
  const networkLabel = getNetworkDisplayLabel(network);

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let reachable = false;
    let nodeVersion: string | undefined;
    let detectedApiVersion = cantonConfig.apiVersion || (network.includes("devnet") ? "v2" : "v1");
    let versionDetails: any = null;

    // 1. Probe node reachability via /v2/version or /v1/version
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const v2Resp = await fetch(`${endpoint}/v2/version`, {
        method: "GET",
        headers,
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (v2Resp && (v2Resp.ok || v2Resp.status === 401 || v2Resp.status === 403)) {
        reachable = true;
        detectedApiVersion = "v2";
        try {
          versionDetails = await v2Resp.json();
          nodeVersion = versionDetails.version || "3.5+";
        } catch {
          nodeVersion = "3.5+";
        }
      }
    } catch {
      // Continue to v1 probe
    }

    if (!reachable) {
      try {
        const controller1 = new AbortController();
        const timeoutId1 = setTimeout(() => controller1.abort(), 3000);
        const v1Resp = await fetch(`${endpoint}/v1/version`, {
          method: "GET",
          headers,
          signal: controller1.signal,
        }).catch(() => null);
        clearTimeout(timeoutId1);

        if (v1Resp && (v1Resp.ok || v1Resp.status === 401 || v1Resp.status === 403)) {
          reachable = true;
          detectedApiVersion = "v1";
          try {
            versionDetails = await v1Resp.json();
            nodeVersion = versionDetails.version;
          } catch {
            nodeVersion = undefined;
          }
        }
      } catch {
        // Fallback to parties probe below
      }
    }

    // Fallback: test parties endpoint for reachability if /version did not respond
    if (!reachable) {
      for (const prefix of ["/v2/parties", "/v1/parties"]) {
        const testResp = await fetch(`${endpoint}${prefix}`, {
          method: "GET",
          headers,
        }).catch(() => null);

        if (testResp && (testResp.ok || testResp.status === 401 || testResp.status === 403)) {
          reachable = true;
          detectedApiVersion = prefix.startsWith("/v2") ? "v2" : "v1";
          break;
        }
      }
    }

    // If node is unreachable, return offline state
    if (!reachable) {
      return {
        connected: false,
        reachable: false,
        authenticated: false,
        authRequired: false,
        status: "offline",
        statusLabel: "OFFLINE / UNREACHABLE",
        network,
        endpoint,
        error: `Canton participant unreachable at ${endpoint}. Ensure Canton participant node is running or network is reachable.`,
      };
    }

    // 2. Probe protected Ledger API to verify if access is authenticated or requires OAuth
    let authRequired = false;
    let authenticated = false;

    try {
      const controllerAuth = new AbortController();
      const timeoutAuth = setTimeout(() => controllerAuth.abort(), 4000);
      const partiesResp = await fetch(`${endpoint}/${detectedApiVersion}/parties`, {
        method: "GET",
        headers,
        signal: controllerAuth.signal,
      }).catch(() => null);
      clearTimeout(timeoutAuth);

      if (partiesResp) {
        if (partiesResp.status === 401 || partiesResp.status === 403) {
          authRequired = true;
          authenticated = false;
        } else if (partiesResp.ok) {
          let partiesData: any = null;
          try {
            partiesData = await partiesResp.json();
          } catch {
            partiesData = null;
          }

          // If Canton returns HTTP 200 with gRPC unauthenticated error payload
          if (partiesData && partiesData.grpcCodeValue && partiesData.grpcCodeValue !== 0) {
            authRequired = true;
            authenticated = false;
          } else {
            authRequired = false;
            authenticated = true;
          }
        } else {
          // Other HTTP code
          if (network.includes("devnet") && !token) {
            authRequired = true;
            authenticated = false;
          }
        }
      } else {
        if (network.includes("devnet") && !token) {
          authRequired = true;
          authenticated = false;
        }
      }
    } catch {
      if (network.includes("devnet") && !token) {
        authRequired = true;
        authenticated = false;
      }
    }

    // 3. Return differentiated states
    if (authenticated) {
      return {
        connected: true,
        reachable: true,
        authenticated: true,
        authRequired: false,
        status: "connected",
        statusLabel: `${networkLabel} · CONNECTED`,
        network,
        endpoint,
        apiVersion: detectedApiVersion,
        version: nodeVersion,
        details: versionDetails,
      };
    } else if (authRequired) {
      return {
        connected: false,
        reachable: true,
        authenticated: false,
        authRequired: true,
        status: "node_reachable",
        statusLabel: `${networkLabel} · NODE REACHABLE`,
        authStatusLabel: "AUTHENTICATION REQUIRED",
        network,
        endpoint,
        apiVersion: detectedApiVersion,
        version: nodeVersion,
        details: versionDetails,
      };
    } else {
      return {
        connected: false,
        reachable: true,
        authenticated: false,
        authRequired: false,
        status: "node_reachable",
        statusLabel: `${networkLabel} · NODE REACHABLE`,
        network,
        endpoint,
        apiVersion: detectedApiVersion,
        version: nodeVersion,
        details: versionDetails,
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      reachable: false,
      authenticated: false,
      authRequired: false,
      status: "offline",
      statusLabel: "OFFLINE / UNREACHABLE",
      network,
      endpoint,
      error: errorMsg,
    };
  }
}

export const checkNetworkStatus = checkCantonNetwork;
