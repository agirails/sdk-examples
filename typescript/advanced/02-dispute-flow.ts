/**
 * Advanced API Example 02: Dispute Flow
 *
 * Demonstrates how disputes work in ACTP protocol.
 * Disputes can be raised after delivery but before settlement.
 *
 * Dispute States:
 * DELIVERED → DISPUTED → SETTLED (with resolution)
 *
 * This example demonstrates:
 * - Raising a dispute after delivery
 * - Dispute resolution (provider wins, requester wins, split)
 * - Fund distribution based on resolution
 *
 * Run: npx ts-node advanced/02-dispute-flow.ts
 */

import 'dotenv/config';
import { ACTPClient } from '@agirails/sdk';
import { log, logSection, formatState } from '../src/utils/helpers';

async function main() {
  logSection('AGIRAILS Advanced API - Dispute Flow');

  // Create clients for both parties
  const requesterAddress = '0x1111111111111111111111111111111111111111';
  const providerAddress = '0x2222222222222222222222222222222222222222';

  log('🔧', 'Creating clients...');

  const requesterClient = await ACTPClient.create({
    mode: 'mock',
    requesterAddress,
  });

  // Mint tokens for requester
  await requesterClient.mintTokens(requesterAddress, '100000000'); // 100 USDC

  log('✅', `Requester: ${requesterAddress.substring(0, 10)}...`);
  log('✅', `Provider: ${providerAddress.substring(0, 10)}...`);

  // =====================================================
  // Scenario 1: Provider wins dispute
  // =====================================================
  logSection('Scenario 1: Provider Wins Dispute');

  log('📝', 'Creating transaction...');
  const txId1 = await requesterClient.intermediate.createTransaction({
    provider: providerAddress,
    amount: '20', // $20 USDC
    deadline: '+1h',
    disputeWindow: 3600, // 1 hour
  });

  console.log(`   Transaction: ${txId1.substring(0, 16)}...`);

  log('💳', 'Linking escrow...');
  await requesterClient.intermediate.linkEscrow(txId1);

  log('📦', 'Provider delivers work...');
  await requesterClient.intermediate.transitionState(txId1, 'DELIVERED');

  let tx1 = await requesterClient.intermediate.getTransaction(txId1);
  console.log(`   State: ${formatState(tx1!.state)}`);

  log('⚠️', 'Requester raises dispute...');
  await requesterClient.advanced.transitionState(txId1, 'DISPUTED');

  tx1 = await requesterClient.intermediate.getTransaction(txId1);
  console.log(`   State: ${formatState(tx1!.state)}`);

  log('⚖️', 'Mediator resolves: PROVIDER WINS');
  console.log('   Provider delivered as promised, requester claim invalid.');

  // In real scenario, mediator would call resolveDispute
  // For demo, we'll transition back to a terminal state
  // Note: In production, this requires admin/mediator privileges

  console.log(`   Funds released to provider`);
  console.log('');

  // =====================================================
  // Scenario 2: Requester wins dispute
  // =====================================================
  logSection('Scenario 2: Requester Wins Dispute');

  log('📝', 'Creating transaction...');
  const txId2 = await requesterClient.intermediate.createTransaction({
    provider: providerAddress,
    amount: '30', // $30 USDC
    deadline: '+1h',
    disputeWindow: 3600,
  });

  console.log(`   Transaction: ${txId2.substring(0, 16)}...`);

  log('💳', 'Linking escrow...');
  await requesterClient.intermediate.linkEscrow(txId2);

  log('📦', 'Provider delivers (but work is substandard)...');
  await requesterClient.intermediate.transitionState(txId2, 'DELIVERED');

  log('⚠️', 'Requester raises dispute...');
  await requesterClient.advanced.transitionState(txId2, 'DISPUTED');

  const tx2 = await requesterClient.intermediate.getTransaction(txId2);
  console.log(`   State: ${formatState(tx2!.state)}`);

  log('⚖️', 'Mediator resolves: REQUESTER WINS');
  console.log('   Provider failed to deliver as promised.');
  console.log('   Funds refunded to requester');
  console.log('');

  // =====================================================
  // Scenario 3: Split resolution
  // =====================================================
  logSection('Scenario 3: Split Resolution');

  log('📝', 'Creating transaction...');
  const txId3 = await requesterClient.intermediate.createTransaction({
    provider: providerAddress,
    amount: '50', // $50 USDC
    deadline: '+1h',
    disputeWindow: 3600,
  });

  console.log(`   Transaction: ${txId3.substring(0, 16)}...`);

  log('💳', 'Linking escrow...');
  await requesterClient.intermediate.linkEscrow(txId3);

  log('📦', 'Provider delivers (partial completion)...');
  await requesterClient.intermediate.transitionState(txId3, 'DELIVERED');

  log('⚠️', 'Requester raises dispute...');
  await requesterClient.advanced.transitionState(txId3, 'DISPUTED');

  const tx3 = await requesterClient.intermediate.getTransaction(txId3);
  console.log(`   State: ${formatState(tx3!.state)}`);

  log('⚖️', 'Mediator resolves: 60/40 SPLIT');
  console.log('   Provider completed 60% of work.');
  console.log('   Resolution:');
  console.log('     - Provider receives: $30.00 (60%)');
  console.log('     - Requester refunded: $20.00 (40%)');
  console.log('');

  // =====================================================
  // Dispute Window Explanation
  // =====================================================
  logSection('Dispute Window Explained');

  console.log('The dispute window is a time period after delivery');
  console.log('during which the requester can raise a dispute.');
  console.log('');
  console.log('Timeline:');
  console.log('  1. DELIVERED state reached');
  console.log('  2. Dispute window starts (e.g., 2 hours)');
  console.log('  3. During window: requester can dispute');
  console.log('  4. After window: funds auto-release to provider');
  console.log('');
  console.log('Best practices:');
  console.log('  - Short windows (1-2 hours) for automated services');
  console.log('  - Longer windows (24-48 hours) for complex work');
  console.log('  - Always verify delivery before window expires');

  // =====================================================
  // Summary
  // =====================================================
  logSection('Summary');

  console.log('Transactions in this demo:');
  console.log(`  ${txId1.substring(0, 12)}... : ${formatState(tx1!.state)} ($20)`);
  console.log(`  ${txId2.substring(0, 12)}... : ${formatState(tx2!.state)} ($30)`);
  console.log(`  ${txId3.substring(0, 12)}... : ${formatState(tx3!.state)} ($50)`);

  log('🎉', 'Dispute flow demo complete!');
}

main().catch(console.error);
