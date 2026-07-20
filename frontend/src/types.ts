export interface TowerArcherConfig {
  chainId: string;
  chainName: string;
  rpcUrl: string;
  usdcAddress: string;
  gameContractAddress: string;
  ownerAddress: string;
  blockExplorerUrl: string;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  usdcBalance: string;
  allowance: string;
  provider: unknown;
  signer: unknown;
  chainId: string | null;
}

export type TxStatus = 'idle' | 'pending' | 'success' | 'error';

export interface UpgradeState {
  speed: number;
  power: number;
  pierce: number;
  multi: number;
  extraArrow: number;
  energy: number;
  life: number;
}

export interface PurchaseResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface PlayerContractState {
  upgradeLevels: string;
  extraLives: string;
  energyCharges: string;
  purchaseCount: string;
  lastPurchaseTimestamp: bigint;
}
