/**
 * Testnet Helper: Mint MockUSDC
 *
 * MockUSDC on Base Sepolia has OPEN MINTING - anyone can mint!
 * This script mints test USDC to your wallet.
 *
 * Prerequisites:
 * 1. Set PRIVATE_KEY in .env
 * 2. Have testnet ETH for gas
 *
 * Run: npx ts-node testnet/mint-usdc.ts
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { getNetwork } from '@agirails/sdk';

const MINT_AMOUNT = '1000'; // 1000 USDC
const USDC_DECIMALS = 6;

async function main() {
  console.log('Minting MockUSDC on Base Sepolia\n');

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log('ERROR: Set PRIVATE_KEY in .env');
    process.exit(1);
  }

  const network = getNetwork('base-sepolia');
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || network.rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('Wallet:', wallet.address);
  console.log('MockUSDC:', network.contracts.usdc);
  console.log('');

  // Check ETH balance
  const ethBalance = await provider.getBalance(wallet.address);
  console.log('ETH Balance:', ethers.formatEther(ethBalance), 'ETH');

  if (ethBalance < ethers.parseEther('0.0001')) {
    console.log('');
    console.log('ERROR: Need ETH for gas');
    console.log('Get from: https://www.coinbase.com/faucets/base-sepolia-faucet');
    process.exit(1);
  }

  // MockUSDC contract
  const usdc = new ethers.Contract(
    network.contracts.usdc,
    [
      'function mint(address to, uint256 amount) external',
      'function balanceOf(address) view returns (uint256)',
    ],
    wallet
  );

  // Check current balance
  const balanceBefore = await usdc.balanceOf(wallet.address);
  console.log('USDC Before:', (Number(balanceBefore) / 10 ** USDC_DECIMALS).toFixed(2), 'USDC');
  console.log('');

  // Mint
  console.log(`Minting ${MINT_AMOUNT} USDC...`);
  const mintAmount = BigInt(parseFloat(MINT_AMOUNT) * 10 ** USDC_DECIMALS);

  const tx = await usdc.mint(wallet.address, mintAmount);
  console.log('TX Hash:', tx.hash);
  console.log('Waiting for confirmation...');

  await tx.wait();
  console.log('Confirmed!');
  console.log('');

  // Check new balance
  const balanceAfter = await usdc.balanceOf(wallet.address);
  console.log('USDC After:', (Number(balanceAfter) / 10 ** USDC_DECIMALS).toFixed(2), 'USDC');
  console.log('');
  console.log('Done! You can now run testnet examples.');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
