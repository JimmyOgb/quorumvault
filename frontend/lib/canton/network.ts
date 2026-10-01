// Canton Network Connection Utilities

import { cantonConfig } from "../config";

export interface NetworkHealth {
  connected: boolean;
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

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // 1. Try v2/version (standard on Canton 3.5+ DevNet)
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
        let data: any = {};
        try {
          data = await v2Resp.json();
        } catch {
          data = { status: v2Resp.status };
        }
        return {
          connected: true,
          network,
          endpoint,
          apiVersion: "v2",
          version: data.version || "3.5+",
          details: data,
        };
      }
    } catch {
      // Continue to v1
    }

    // 2. Try v1/version (LocalNet JSON API standard)
    const controller1 = new AbortController();
    const timeoutId1 = setTimeout(() => controller1.abort(), 3000);
    const v1Resp = await fetch(`${endpoint}/v1/version`, {
      method: "GET",
      headers,
      signal: controller1.signal,
    }).catch(() => null);
    clearTimeout(timeoutId1);

    if (v1Resp && (v1Resp.ok || v1Resp.status === 401 || v1Resp.status === 403)) {
      let data: any = {};
      try {
        data = await v1Resp.json();
      } catch {
        data = { status: v1Resp.status };
      }

      return {
        connected: true,
        network,
        endpoint,
        apiVersion: "v1",
        version: data.version,
        details: data,
      };
    }

    // 3. Fallback: try parties endpoints
    for (const prefix of ["/v2/parties", "/v1/parties"]) {
      const partiesResp = await fetch(`${endpoint}${prefix}`, {
        method: "GET",
        headers,
      }).catch(() => null);

      if (partiesResp && (partiesResp.ok || partiesResp.status === 401 || partiesResp.status === 403)) {
        return {
          connected: true,
          network,
          endpoint,
          apiVersion: prefix.startsWith("/v2") ? "v2" : "v1",
          details: `Canton HTTP API responding at ${prefix} (HTTP ${partiesResp.status})`,
        };
      }
    }

    return {
      connected: false,
      network,
      endpoint,
      error: `Canton participant unreachable at ${endpoint}. Ensure Canton participant node is running or network is reachable.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      network,
      endpoint,
      error: errorMsg,
    };
  }
}

export const checkNetworkStatus = checkCantonNetwork;
