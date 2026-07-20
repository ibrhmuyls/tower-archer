import { ethers } from 'ethers';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Chain:', (await ethers.provider.getNetwork()).chainId.toString());

  const USDC = new ethers.Contract(
    process.env.USDC_ADDRESS!,
    ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
    deployer
  );

  const decimals = await USDC.decimals();
  const deployerBalance = await USDC.balanceOf(deployer.address);
  console.log(`USDC decimals: ${decimals}`);
  console.log(`Deployer USDC balance: ${ethers.formatUnits(deployerBalance, decimals)}`);

  const TowerArcher = await ethers.getContractFactory('TowerArcher');
  const game = await TowerArcher.deploy(process.env.USDC_ADDRESS, deployer.address);
  await game.waitForDeployment();

  const address = await game.getAddress();
  console.log(`Game contract deployed at: ${address}`);
  console.log(`Save this address to VITE_GAME_CONTRACT_ADDRESS`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
