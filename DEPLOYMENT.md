# DEPLOYMENT.md

## Prerequisites
- GitHub repository ready: `https://github.com/ibrhmuyls/tower-archer`
- Vercel account linked to GitHub
- Arc Testnet contract deployed address
- Optional: Foundry or Hardhat for contract deployment

## Step 1 - Deploy TowerArcher.sol to Arc Testnet

### Option A: Foundry
```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
forge build
forge script script/Deploy.s.sol:DeployScript --rpc-url https://rpc.testnet.arc.network --private-key $PRIVATE_KEY --broadcast --verify
```

### Option B: Hardhat
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
npx hardhat run scripts/deploy.ts --network arcTestnet
```

## Step 2 - Record contract and owner addresses
After deployment, note:
- Game contract address
- Owner address used during deployment

## Step 3 - Connect Vercel to GitHub
1. Open Vercel dashboard
2. Import `ibrhmuyls/tower-archer`
3. Framework preset: `Other`
4. Build command: leave empty
5. Output directory: `.` (root)

## Step 4 - Set Vercel environment variables
Required variables:
- `VITE_ARC_CHAIN_ID` = `0x4D024E2`
- `VITE_ARC_CHAIN_NAME` = `Arc Testnet`
- `VITE_ARC_RPC_URL` = `https://rpc.testnet.arc.network`
- `VITE_USDC_ADDRESS` = `0x3600000000000000000000000000000000000000`
- `VITE_GAME_CONTRACT_ADDRESS` = Paste deployed contract address
- `VITE_OWNER_ADDRESS` = Paste owner address
- `VITE_BACKEND_URL` = `/api`

## Step 5 - Deploy
Trigger deploy from Vercel dashboard.

## Step 6 - Post-deploy verification
1. Open deployed URL on HTTPS.
2. Open browser console and confirm `ARC_CONFIG.contracts.gameContractAddress` is populated.
3. Connect wallet and reject/approve chain switch prompt.
4. Verify upgrade purchase shows wallet states via attached events.

## Notes
- Contract must be deployed before first real purchase.
- Vercel serverless `/api` routes require Vercel Pro for longer timeouts if syncing many addresses.
- For production hardened behavior, follow DEPLOYMENT.md from canonical branch once consolidated.
