import type { WalletState, TowerArcherConfig } from './types';

export async function connectWallet(): Promise<WalletState> {
  if (typeof window === 'undefined' || !(window as unknown as { ethereum?: unknown }).ethereum) {
    throw new Error('No injected wallet found');
  }

  const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  const address = accounts[0] ?? null;
  const chainId = await ethereum.request({ method: 'eth_chainId' });

  return {
    connected: Boolean(address),
    address,
    usdcBalance: '0',
    allowance: '0',
    provider: ethereum,
    signer: null,
    chainId,
  };
}

export async function switchToArc(
  ethereum: { request: (args: { method: string; params?: unknown[] }) => Promise<string> },
  config: TowerArcherConfig,
): Promise<void> {
  const arcChainId = `0x${Number(config.chainId).toString(16)}`;

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: arcChainId }],
    });
  } catch (error: unknown) {
    const code = typeof (error as { code?: number }).code === 'number' ? (error as { code: number }).code : null;
    if (code === 4902 || code === -32603) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: arcChainId,
            chainName: config.chainName,
            rpcUrls: [config.rpcUrl],
            nativeCurrency: {
              name: 'USDC',
              symbol: 'USDC',
              decimals: 6,
            },
            blockExplorerUrls: [config.blockExplorerUrl],
          },
        ],
      });
      return;
    }
    throw error;
  }
}

export async function readUSDCBalance(
  provider: { request: (args: { method: string; params?: unknown[] }) => Promise<string> },
  config: TowerArcherConfig,
  address: string,
): Promise<string> {
  const padded = address.slice(2).padStart(64, '0');
  const data = `0x70a08231${padded}`;
  const result = await provider.request({
    method: 'eth_call',
    params: [{ to: config.usdcAddress, data }, 'latest'],
  });

  if (!result || result === '0x') {
    return '0';
  }

  const raw = BigInt(result);
  const humanized = Number(raw) / 1e6;
  return humanized.toFixed(2);
}

export async function readAllowance(
  provider: { request: (args: { method: string; params?: unknown[] }) => Promise<string> },
  config: TowerArcherConfig,
  owner: string,
  spender: string,
): Promise<string> {
  const paddedOwner = owner.slice(2).padStart(64, '0');
  const paddedSpender = spender.slice(2).padStart(64, '0');
  const data = `0xdd62ed3e${paddedOwner}${paddedSpender}`;

  const result = await provider.request({
    method: 'eth_call',
    params: [{ to: config.usdcAddress, data }, 'latest'],
  });

  if (!result || result === '0x') {
    return '0';
  }

  const raw = BigInt(result);
  return (Number(raw) / 1e6).toFixed(2);
}

export async function approveUSDC(
  provider: { request: (args: { method: string; params?: unknown[] }) => Promise<string> },
  config: TowerArcherConfig,
  owner: string,
  spender: string,
  amount: string,
): Promise<string> {
  const paddedSpender = spender.slice(2).padStart(64, '0');
  const rawAmount = BigInt(Math.round(Number(amount) * 1e6));
  const paddedAmount = rawAmount.toString(16).padStart(64, '0');
  const data = `0x095ea7b3${paddedSpender}${paddedAmount}`;

  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: owner,
        to: config.usdcAddress,
        data,
      },
    ],
  });

  return txHash;
}

export function cleanupWalletState() {
  // future: indexedDB cleanup, event listener teardown, etc.
}
