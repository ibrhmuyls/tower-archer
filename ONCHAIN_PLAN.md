# Tower Archer On-Chain Upgrade Plan

## Current blockers
 Missing ABI / contract address
 No frontend on-chain purchase flow
 No allowance/buy sequencing
 No treasury route except local backend fallback

## Smart contract
 File: contracts/TowerArcher.sol
 Needed: ABI JSON, deployment script/output, address on Arc Testnet

## Frontend
 Files: wallet.js, game.js, ui.js, config.js
 Needed: approve flow, buyUpgrade toggle, tx status, post-tx refresh

## Backend
 File: backend/server.mjs
 Needed: change local-simulation hint to optional fallback after chain confirmation

## Environment
 Variables: VITE_ARC_RPC_URL, VITE_USDC_ADDRESS, VITE_GAME_CONTRACT_ADDRESS, VITE_OWNER_ADDRESS

## Next steps
 1) Compile TowerArcher.sol and capture ABI + address.
 2) Wire frontend to contract calls.
 3) Disable simulated-only purchase path after first real transaction.
