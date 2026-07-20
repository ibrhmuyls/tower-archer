import { buyUpgrade, fetchPlayerState, getConfig, purchaseOnChain } from './blockchain';
import type { UpgradeState, PlayerContractState, PurchaseResult, TxStatus, WalletState } from './types';

class GameService {
  private wallet: WalletState | null = null;
  private config = getConfig();
  private playerState: PlayerContractState | null = null;
  private txStatus: TxStatus = 'idle';

  async connect(): Promise<WalletState> {
    this.txStatus = 'pending';
    const response = await fetch('/api/wallet/connect', { method: 'POST' });
    const data = (await response.json()) as WalletState;
    this.wallet = data;
    this.txStatus = data.connected ? 'success' : 'error';
    return data;
  }

  async disconnect(): Promise<void> {
    this.wallet = null;
    this.playerState = null;
    this.txStatus = 'idle';
  }

  async loadPlayerState(address: string): Promise<PlayerContractState | null> {
    if (!this.wallet?.provider) return null;
    this.playerState = await fetchPlayerState(this.wallet.provider, this.config, address);
    return this.playerState;
  }

  async purchaseUpgrade(upgradeIndex: number, currentLevel: number): Promise<PurchaseResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    this.txStatus = 'pending';
    return purchaseOnChain(
      this.wallet.provider,
      this.wallet,
      this.config,
      'upgrade',
      upgradeIndex,
      0n,
      0n,
      (status) => {
        this.txStatus = status;
      },
    );
  }

  async buyExtraLife(): Promise<PurchaseResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    this.txStatus = 'pending';
    return purchaseOnChain(
      this.wallet.provider,
      this.wallet,
      this.config,
      'life',
      255,
      1n,
      0n,
      (status) => {
        this.txStatus = status;
      },
    );
  }

  async buyEnergy(): Promise<PurchaseResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    this.txStatus = 'pending';
    return purchaseOnChain(
      this.wallet.provider,
      this.wallet,
      this.config,
      'energy',
      255,
      0n,
      1n,
      (status) => {
        this.txStatus = status;
      },
    );
  }

  getTxStatus(): TxStatus {
    return this.txStatus;
  }

  getConfig() {
    return this.config;
  }
}

export const gameService = new GameService();
