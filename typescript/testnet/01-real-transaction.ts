/**
 * Testnet Example 01: Real Transaction on Base Sepolia
 *
 * This example creates an ACTUAL transaction on the Base Sepolia testnet.
 * Real ETH (for gas) and MockUSDC are used.
 *
 * Prerequisites:
 * 1. Set PRIVATE_KEY in .env (wallet with testnet ETH)
 * 2. Set PROVIDER_PRIVATE_KEY in .env (optional, for full flow)
 * 3. Get testnet ETH from https://www.coinbase.com/faucets/base-sepolia-faucet
 * 4. Mint MockUSDC: npx ts-node testnet/mint-usdc.ts
 *
 * Contract Addresses (Base Sepolia):
 * - ACTPKernel:  0xD199070F8e9FB9a127F6Fe730Bc13300B4b3d962
 * - EscrowVault: 0x948b9Ea081C4Cec1E112Af2e539224c531d4d585
 * - MockUSDC:    0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb
 *
 * Run: npx ts-node testnet/01-real-transaction.ts
 */

import 'dotenv/config';
import { ACTPClient, getNetwork, BlockchainRuntime } from '@agirails/sdk';
import { ethers } from 'ethers';

// USDC has 6 decimals
const USDC_DECIMALS = 6;
const formatUSDC = (wei: bigint) => (Number(wei) / 10 ** USDC_DECIMALS).toFixed(2);
const parseUSDC = (amount: string) => BigInt(Math.floor(parseFloat(amount) * 10 ** USDC_DECIMALS));

async function main() {
  console.log('='.repeat(60));
  console.log('AGIRAILS Testnet - Real Transaction on Base Sepolia');
  console.log('='.repeat(60));
  console.log('');

  // Check environment
  const clientKey = process.env.PRIVATE_KEY;
  if (!clientKey) {
    console.log('ERROR: PRIVATE_KEY not set in .env');
    console.log('');
    console.log('To run this example:');
    console.log('1. Create a .env file with PRIVATE_KEY=your_key_here');
    console.log('2. Get testnet ETH from Base Sepolia faucet');
    console.log('3. Run: npx ts-node testnet/mint-usdc.ts');
    process.exit(1);
  }

  const network = getNetwork('base-sepolia');
  const wallet = new ethers.Wallet(clientKey);

  console.log('Network: Base Sepolia (chainId: 84532)');
  console.log('Requester:', wallet.address);
  console.log('');

  // Create ACTPClient in testnet mode
  console.log('[1/6] Creating ACTPClient in testnet mode...');
  const client = await ACTPClient.create({
    mode: 'testnet',
    requesterAddress: wallet.address,
    privateKey: clientKey,
    rpcUrl: process.env.RPC_URL || network.rpcUrl,
  });

  console.log('      Mode:', client.getMode());
  console.log('      Connected to blockchain');
  console.log('');

  // Check ETH balance for gas
  console.log('[2/6] Checking balances...');
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || network.rpcUrl);
  const ethBalance = await provider.getBalance(wallet.address);
  console.log('      ETH Balance:', ethers.formatEther(ethBalance), 'ETH');

  if (ethBalance < ethers.parseEther('0.001')) {
    console.log('');
    console.log('ERROR: Insufficient ETH for gas');
    console.log('Get testnet ETH from: https://www.coinbase.com/faucets/base-sepolia-faucet');
    process.exit(1);
  }

  // Check USDC balance
  const usdc = new ethers.Contract(
    network.contracts.usdc,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  const usdcBalance = await usdc.balanceOf(wallet.address);
  console.log('      USDC Balance:', formatUSDC(usdcBalance), 'USDC');

  if (usdcBalance < parseUSDC('10')) {
    console.log('');
    console.log('ERROR: Insufficient USDC (need at least 10 USDC)');
    console.log('Run: npx ts-node testnet/mint-usdc.ts');
    process.exit(1);
  }
  console.log('');

  // Create a transaction
  console.log('[3/6] Creating transaction on-chain...');
  const providerAddress = process.env.PROVIDER_ADDRESS || '0x2222222222222222222222222222222222222222';
  const amount = '5'; // $5 USDC

  const txId = await client.standard.createTransaction({
    provider: providerAddress,
    amount: amount,
    deadline: '+1h',
    disputeWindow: 3600, // 1 hour minimum
  });

  console.log('      Transaction ID:', txId);
  console.log('      Amount:', amount, 'USDC');
  console.log('      Provider:', providerAddress.substring(0, 10) + '...');
  console.log('');

  // Get transaction from blockchain
  console.log('[4/6] Fetching transaction from blockchain...');
  const tx = await client.standard.getTransaction(txId);
  if (!tx) {
    console.log('ERROR: Transaction not found on-chain');
    process.exit(1);
  }

  console.log('      State:', tx.state);
  console.log('      Created:', new Date(tx.createdAt * 1000).toISOString());
  console.log('      Deadline:', new Date(tx.deadline * 1000).toISOString());
  console.log('');

  // Link escrow (locks funds)
  console.log('[5/6] Linking escrow (locking funds)...');
  console.log('      This requires USDC approval + escrow creation...');

  try {
    await client.standard.linkEscrow(txId);
    console.log('      Escrow linked successfully!');
  } catch (error: any) {
    console.log('      Escrow linking failed:', error.message);
    console.log('');
    console.log('This is expected if:');
    console.log('- USDC allowance not set');
    console.log('- Insufficient USDC balance');
    console.log('');
    console.log('The transaction was created but escrow not linked.');
  }

  // Final state
  console.log('');
  console.log('[6/6] Final transaction state...');
  const finalTx = await client.standard.getTransaction(txId);
  console.log('      State:', finalTx?.state || 'Unknown');
  console.log('      Escrow ID:', finalTx?.escrowId || 'Not linked');

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Transaction created on Base Sepolia!');
  console.log('='.repeat(60));
  console.log('');
  console.log('View on BaseScan:');
  console.log(`https://sepolia.basescan.org/address/${network.contracts.actpKernel}`);
  console.log('');
  console.log('Transaction ID:', txId);
  console.log('');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
