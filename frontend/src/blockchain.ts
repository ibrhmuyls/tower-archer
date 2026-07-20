import type {
  TowerArcherConfig,
  WalletState,
  PlayerContractState,
  PurchaseResult,
  TxStatus,
} from './types';
import { approveUSDC, readUSDCBalance, readAllowance, switchToArc } from './wallet';

export function getConfig(): TowerArcherConfig {
  const chainId = (import.meta as unknown as { env: Record<string, string | undefined> }).env
    .VITE_ARC_CHAIN_ID;

  if (!chainId) {
    throw new Error('VITE_ARC_CHAIN_ID is not set');
  }

  const gameContractAddress = (import.meta as unknown as { env: Record<string, string | undefined> }).env
    .VITE_GAME_CONTRACT_ADDRESS;

  if (!gameContractAddress) {
    throw new Error('VITE_GAME_CONTRACT_ADDRESS is not set');
  }

  if (!gameContractAddress || gameContractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('VITE_GAME_CONTRACT_ADDRESS must be set to a deployed contract address');
  }

  if (!ownerAddress || ownerAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('VITE_OWNER_ADDRESS must be set');
  }

  return {
      chainId,
      chainName: (import.meta as unknown as { env: Record<string, string | undefined> }).env
          .VITE_ARC_CHAIN_NAME ?? 'Arc Testnet',
      rpcUrl: (import.meta as unknown as { env: Record<string, string | undefined> }).env
          .VITE_ARC_RPC_URL ?? 'https://rpc.testnet.arc.network',
      usdcAddress: (import.meta as unknown as { env: Record<string, string | undefined> }).env
          .VITE_USDC_ADDRESS ?? '0x3600000000000000000000000000000000000000',
      gameContractAddress,
      ownerAddress,
    blockExplorerUrl: 'https://testnet.arcscan.app',
  };
}

function buildSelector(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(8, '0');
}

async function send(
  provider: { request: (args: { method: string; params?: unknown[] }) => Promise<string> },
  to: string,
  data: string,
  from: string,
): Promise<string> {
  return provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to,
        data,
      },
    ],
  });
}

function pad256(value: bigint | number | string): string {
  return BigInt(value).toString(16).padStart(64, '0');
}

export async function ensureCorrectChain(
  provider: { request: (args: { method: string; params?: unknown[] }) => Promise<string> },
  config: TowerArcherConfig,
): Promise<void> {
  const expected = `0x${Number(config.chainId).toString(16)}`;
  const current = await provider.request({ method: 'eth_chainId' });

  if (current !== expected) {
    await switchToArc(provider, config);
  }
}

export async function fetchPlayerState(
  provider: { request: (args: { method: string; params?: unknown[] }) => Promise<string> },
  config: TowerArcherConfig,
  address: string,
): Promise<PlayerContractState> {
  const encoded = '0x62961ad5' + address.slice(2).padStart(64, '0');
  const raw = await provider.request({
    method: 'eth_call',
    params: [{ to: config.gameContractAddress, data: encoded }, 'latest'],
  });

  const trimmed = raw.replace(/^0x/, '');
  const chunks = trimmed.match(/.{1,64}/g) ?? [];
  const toBigInt = (index: number) => BigInt('0x' + (chunks[index] ?? '0'));
  const toString = (index: number) => toBigInt(index).toString();

  return {
    upgradeLevels: toString(0),
    extraLives: toString(1),
    energyCharges: toString(2),
    purchaseCount: toString(4),
    lastPurchaseTimestamp: toBigInt(3),
  };
}

export type PurchaseAction = 'upgrade' | 'life' | 'energy';

export async function purchaseOnChain(
  provider: { request: (args: { method: string; params?: unknown[] }) => Promise<string> },
  wallet: WalletState,
  config: TowerArcherConfig,
  action: PurchaseAction,
  upgradeIndex: number,
  extraLivesAmount: bigint,
  energyAmount: bigint,
  onStatus: (status: TxStatus) => void,
): Promise<PurchaseResult> {
  try {
    await ensureCorrectChain(provider, config);
    const playerAddress = wallet.address!;

    const balance = await readUSDCBalance(provider, config, playerAddress);
    wallet.usdcBalance = balance;

    const allowanceValue = await readAllowance(provider, config, playerAddress, config.gameContractAddress);
    wallet.allowance = allowanceValue;

    const requestedSpend = action === 'upgrade' ? '5.00' : `${Number(extraLivesAmount || energyAmount) * 8 / 1e6}`;

    if (Number(allowanceValue) < Number(requestedSpend)) {
      onStatus('pending');
      const approveHash = await approveUSDC(provider, config, playerAddress, config.gameContractAddress, '9999999');
      console.log('Approval tx:', approveHash);
    }

    onStatus('pending');
    let encoded = '';

    if (action === 'upgrade') {
      encoded =
        buildSelector('buyUpgrade(uint256,uint256,uint256)') +
        pad256(upgradeIndex) +
        pad256(extraLivesAmount) +
        pad256(energyAmount);
    } else if (action === 'life') {
      encoded =
        buildSelector('buyUpgrade(uint256,uint256,uint256)') +
        pad256(255) +
        pad256(extraLivesAmount) +
        pad256(energyAmount);
    } else {
      encoded =
        buildSelector('buyUpgrade(uint256,uint256,uint256)') +
        pad256(255) +
        pad256(extraLivesAmount) +
        pad256(energyAmount);
    }

    const txHash = await send(provider, config.gameContractAddress, encoded, playerAddress);
    onStatus('success');
    return { success: true, txHash };
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Unknown transaction error';
    onStatus('error');
    return { success: false, error: reason };
  }
}
