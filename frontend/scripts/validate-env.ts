const required = [
  'VITE_ARC_RPC_URL',
  'VITE_USDC_ADDRESS',
  'VITE_ARC_CHAIN_ID',
  'VITE_ARC_CHAIN_NAME',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('Missing env vars:', missing.join(', '));
  process.exit(1);
}

if (!process.env.VITE_GAME_CONTRACT_ADDRESS) {
  console.warn('VITE_GAME_CONTRACT_ADDRESS is not set; on-chain purchases will be disabled.');
}

console.log('Env validation passed.');
