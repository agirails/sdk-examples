/**
 * Advanced API Example 01: Transaction Lifecycle
 *
 * Demonstrates the complete ACTP transaction lifecycle using ACTPClient.
 * This gives you full control over each step of the process.
 *
 * Transaction States:
 * INITIATED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED
 *
 * This example demonstrates:
 * - ACTPClient creation and configuration
 * - Three API levels: basic, standard, advanced
 * - Full transaction lifecycle control
 * - Escrow management
 *
 * Run: npx ts-node advanced/01-transaction-lifecycle.ts
 */

import 'dotenv/config';
import { ACTPClient, IMockRuntime } from '@agirails/sdk';
import { log, logSection, formatState } from '../src/utils/helpers';

async function main() {
  logSection('AGIRAILS Advanced API - Transaction Lifecycle');

  // 1. Create ACTPClient in mock mode
  log('🔧', 'Creating ACTPClient...');

  const client = await ACTPClient.create({
    mode: 'mock', // Use 'testnet' or 'mainnet' for real blockchain
    requesterAddress: '0x1111111111111111111111111111111111111111',
  });

  const myAddress = client.getAddress();
  log('✅', `Client ready: ${myAddress}`);
  console.log(`   Mode: ${client.getMode()}`);

  // 2. Mint some test tokens (mock mode only)
  log('💰', 'Minting test tokens...');
  await client.mintTokens(myAddress, '100000000'); // 100 USDC
  const balance = await client.getBalance(myAddress);
  console.log(`   Balance: ${Number(balance) / 1_000_000} USDC`);

  // =====================================================
  // METHOD 1: Basic API (simplest)
  // =====================================================
  logSection('Method 1: Basic API');

  log('📝', 'Using basic.pay() - one call does everything');

  const basicResult = await client.basic.pay({
    to: '0x2222222222222222222222222222222222222222',
    amount: '10', // $10 USDC
    deadline: '+2h', // 2 hours from now
    disputeWindow: 3600, // 1 hour minimum
  });

  console.log(`   Transaction ID: ${basicResult.txId.substring(0, 16)}...`);
  console.log(`   Amount: ${basicResult.amount}`);
  console.log(`   State: ${basicResult.state}`); // Already COMMITTED!

  // =====================================================
  // METHOD 2: Standard API (more control)
  // =====================================================
  logSection('Method 2: Standard API');

  log('📝', 'Step 1: Create transaction');

  const txId = await client.standard.createTransaction({
    provider: '0x3333333333333333333333333333333333333333',
    amount: '25', // $25 USDC
    deadline: '+3h',
    disputeWindow: 3600, // 1 hour minimum
  });

  console.log(`   Transaction ID: ${txId.substring(0, 16)}...`);

  // Get transaction details
  let tx = await client.standard.getTransaction(txId);
  if (!tx) throw new Error('Transaction not found');
  console.log(`   State: ${formatState(tx.state)}`);

  log('💳', 'Step 2: Link escrow (locks funds)');
  await client.standard.linkEscrow(txId);

  tx = await client.standard.getTransaction(txId);
  console.log(`   State: ${formatState(tx!.state)}`); // COMMITTED

  log('🔨', 'Step 3: Transition to IN_PROGRESS');
  await client.standard.transitionState(txId, 'IN_PROGRESS');

  tx = await client.standard.getTransaction(txId);
  console.log(`   State: ${formatState(tx!.state)}`);

  log('📦', 'Step 4: Transition to DELIVERED');
  await client.standard.transitionState(txId, 'DELIVERED');

  tx = await client.standard.getTransaction(txId);
  console.log(`   State: ${formatState(tx!.state)}`);

  // Wait for dispute window (use time manipulation in mock mode)
  log('⏳', 'Advancing time past dispute window (mock mode)...');
  const runtime = client.advanced as IMockRuntime;
  await runtime.time.advanceTime(3700); // Advance 1 hour + 100 seconds

  log('💸', 'Step 5: Release escrow');
  await client.standard.releaseEscrow(tx!.escrowId!);

  tx = await client.standard.getTransaction(txId);
  console.log(`   State: ${formatState(tx!.state)}`); // SETTLED

  // =====================================================
  // METHOD 3: Advanced API (full protocol access)
  // =====================================================
  logSection('Method 3: Advanced API');

  log('📝', 'Direct runtime access for full control');

  // runtime already declared above, reuse it

  // Create transaction with all parameters
  const advTxId = await runtime.createTransaction({
    provider: '0x4444444444444444444444444444444444444444',
    requester: myAddress,
    amount: '50000000', // 50 USDC in wei (6 decimals)
    deadline: Math.floor(Date.now() / 1000) + 7200, // 2 hours
    disputeWindow: 3600, // 1 hour (minimum allowed)
    serviceDescription: JSON.stringify({
      service: 'advanced-demo',
      input: { data: 'test' },
    }),
  });

  console.log(`   Transaction ID: ${advTxId.substring(0, 16)}...`);

  // Link escrow
  const escrowId = await runtime.linkEscrow(advTxId, '50000000');
  console.log(`   Escrow ID: ${escrowId.substring(0, 16)}...`);

  // Get transaction via advanced API
  const advTx = await runtime.getTransaction(advTxId);
  console.log(`   State: ${formatState(advTx!.state)}`);

  // Time manipulation (mock mode only)
  log('⏰', 'Time manipulation (mock mode)');
  console.log(`   Current time: ${runtime.time.now()}`);

  // =====================================================
  // Summary
  // =====================================================
  logSection('Summary');

  console.log('Transactions created in this demo:');
  console.log(`  - Basic API: ${basicResult.txId.substring(0, 12)}...`);
  console.log(`  - Standard API: ${txId.substring(0, 12)}...`);
  console.log(`  - Advanced API: ${advTxId.substring(0, 12)}...`);

  // Check final balance
  const finalBalance = await client.getBalance(myAddress);
  console.log(`\nFinal balance: ${Number(finalBalance) / 1_000_000} USDC`);

  log('🎉', 'Transaction lifecycle demo complete!');
}

main().catch(console.error);
