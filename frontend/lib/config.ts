// Canton Network & QuorumVault Configuration

export interface CantonConfig {
  network: string;
  ledgerApiUrl: string;
  scanApiUrl?: string;
  vaultPackageId: string;
  vaultTemplateId: string;
  proposalTemplateId: string;
  receiptTemplateId: string;
  authToken?: string;
  apiVersion?: string;
  templates: {
    vault: string;
    withdrawProposal: string;
    withdrawReceipt: string;
  };
}

const rawNetwork = (process.env.NEXT_PUBLIC_CANTON_NETWORK || process.env.CANTON_NETWORK || '').trim().toLowerCase();
const rawApiUrl = (process.env.NEXT_PUBLIC_CANTON_LEDGER_API || process.env.CANTON_LEDGER_API || '').trim();

// Auto-detect DevNet if configured network or endpoint is HackCanton DevNet
const isExplicitDevNet = rawNetwork === 'devnet' || rawNetwork.includes('devnet') || rawNetwork.includes('hackcanton');
const isUrlDevNet = rawApiUrl.includes('devnet') || rawApiUrl.includes('hackcanton');

const network = rawNetwork ? rawNetwork : (isUrlDevNet ? 'devnet' : 'localnet');

const defaultLedgerApi = (isExplicitDevNet || isUrlDevNet || network.includes('devnet') || network.includes('hackcanton'))
  ? 'https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services'
  : 'http://localhost:7575';

const ledgerApiUrl = rawApiUrl || defaultLedgerApi;

const packageId = process.env.NEXT_PUBLIC_VAULT_PACKAGE_ID || 
  process.env.NEXT_PUBLIC_DAMLC_PACKAGE_ID || 
  'c8ac685dd4671ced2983869ef6a118d9698a4280db05fd0e6eef6a67cacdf249';

const vaultTmpl = packageId ? `${packageId}:Vault:Vault` : 'Vault:Vault';
const proposalTmpl = packageId ? `${packageId}:Vault:WithdrawProposal` : 'Vault:WithdrawProposal';
const receiptTmpl = packageId ? `${packageId}:Vault:WithdrawReceipt` : 'Vault:WithdrawReceipt';

const isDevNet = network === 'devnet' || network.includes('devnet') || network.includes('hackcanton') || ledgerApiUrl.includes('hackcanton');

export const cantonConfig: CantonConfig = {
  network,
  ledgerApiUrl,
  scanApiUrl: process.env.NEXT_PUBLIC_CANTON_SCAN_API || undefined,
  vaultPackageId: packageId,
  vaultTemplateId: vaultTmpl,
  proposalTemplateId: proposalTmpl,
  receiptTemplateId: receiptTmpl,
  authToken: process.env.NEXT_PUBLIC_CANTON_AUTH_TOKEN || process.env.CANTON_AUTH_TOKEN || undefined,
  apiVersion: process.env.NEXT_PUBLIC_CANTON_API_VERSION || (isDevNet ? 'v2' : 'v1'),
  templates: {
    vault: vaultTmpl,
    withdrawProposal: proposalTmpl,
    withdrawReceipt: receiptTmpl,
  },
};

export function getNetworkDisplayLabel(networkName?: string): string {
  const net = (networkName || cantonConfig.network || 'localnet').trim().toLowerCase();
  if (net === 'devnet' || net.includes('devnet') || net.includes('hackcanton')) {
    return 'HACKCANTON DEVNET';
  }
  if (net === 'localnet' || net.includes('local')) {
    return 'LOCALNET';
  }
  if (net === 'testnet') {
    return 'CANTON TESTNET';
  }
  if (net === 'mainnet') {
    return 'CANTON MAINNET';
  }
  return net.toUpperCase();
}
