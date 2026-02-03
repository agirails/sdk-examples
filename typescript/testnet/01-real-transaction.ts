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
 * Contract addresses are loaded from SDK's getNetwork('base-sepolia').
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

  // Step 6: Transition to IN_PROGRESS
  console.log('');
  console.log('[6/9] Transitioning to IN_PROGRESS...');
  try {
    await client.standard.transitionState(txId, 'IN_PROGRESS');
    console.log('      State: IN_PROGRESS');
  } catch (error: any) {
    console.log('      Transition failed:', error.message);
    console.log('      (This is expected if escrow was not linked)');
  }

  // Step 7: Transition to DELIVERED (requires proof on-chain)
  console.log('');
  console.log('[7/9] Transitioning to DELIVERED...');
  console.log('      NOTE: On-chain DELIVERED requires dispute window proof');
  try {
    // IMPORTANT: For testnet/mainnet, DELIVERED requires a proof parameter
    // The proof encodes the dispute window: abi.encode(['uint256'], [disputeWindowSeconds])
    const disputeWindowSeconds = 3600; // Must match what was set in createTransaction
    const proof = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [disputeWindowSeconds]);

    await client.standard.transitionState(txId, 'DELIVERED', proof);
    console.log('      State: DELIVERED');
    console.log(`      Dispute window: ${disputeWindowSeconds}s (${disputeWindowSeconds / 60} min)`);
  } catch (error: any) {
    console.log('      Transition failed:', error.message);
  }

  // Step 8: Dispute window info
  console.log('');
  console.log('[8/9] Dispute window active...');
  console.log('      In production, wait for dispute window to expire before settling.');
  console.log('      For demo purposes, we skip ahead.');

  // Step 9: Final state
  console.log('');
  console.log('[9/9] Final transaction state...');
  const finalTx = await client.standard.getTransaction(txId);
  console.log('      State:', finalTx?.state || 'Unknown');
  console.log('      Escrow ID:', finalTx?.escrowId || 'Not linked');

  console.log('');
  console.log('  NEXT STEPS (after dispute window expires):');
  console.log('  - Call client.standard.releaseEscrow(escrowId) to settle');
  console.log('  - Funds will be released to provider');

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Transaction lifecycle demo on Base Sepolia!');
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
