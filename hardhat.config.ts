import { defineConfig, network } from 'hardhat';
import { config as dotenvConfig } from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { resolve } from 'path';

const expanded = dotenvExpand.expand(dotenvConfig({ path: resolve(__dirname, '../.env') }));
if (!expanded.parsed) {
  throw new Error('Could not parse .env');
}

export default {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    arcTestnet: {
      url: process.env.ARC_RPC_URL ?? 'https://rpc.testnet.arc.network',
      chainId: Number(process.env.ARC_CHAIN_ID ?? '5042002'),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    customChains: [
      {
        network: 'arcTestnet',
        chainId: Number(process.env.ARC_CHAIN_ID ?? '5042002'),
        urls: {
          apiURL: 'https://testnet.arcscan.app/api',
          browserURL: 'https://testnet.arcscan.app',
        },
      },
    ],
  },
};
