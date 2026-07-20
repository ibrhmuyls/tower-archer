const config = getConfig();

window.ARC_CONFIG = {
  ...config,
  contracts: {
    usdc: config.usdcAddress,
    treasury: config.gameContractAddress,
  },
};

window.WALLET_STATE = {
  connected: false,
  address: null,
  usdcBalance: '0',
  allowance: '0',
  provider: null,
  signer: null,
  chainId: null,
};
