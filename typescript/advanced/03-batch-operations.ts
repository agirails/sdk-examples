/**
 * Advanced API Example 03: Batch Operations
 *
 * Demonstrates processing multiple transactions in parallel.
 * Useful for high-throughput agent scenarios.
 *
 * This example demonstrates:
 * - Creating multiple transactions concurrently
 * - Parallel state transitions
 * - Batch status checking
 * - Error handling in batch operations
 *
 * Run: npx ts-node advanced/03-batch-operations.ts
 */

import 'dotenv/config';
import { ACTPClient } from '@agirails/sdk';
import { log, logSection, formatState } from '../src/utils/helpers';

async function main() {
  logSection('AGIRAILS Advanced API - Batch Operations');

  const requesterAddress = '0x1111111111111111111111111111111111111111';

  log('🔧', 'Creating client...');
  const client = await ACTPClient.create({
    mode: 'mock',
    requesterAddress,
  });

  // Mint tokens for batch operations
  await client.mintTokens(requesterAddress, '1000000000'); // 1000 USDC
  log('✅', 'Client ready with 1000 USDC');

  // =====================================================
  // Batch Create Transactions
  // =====================================================
  logSection('Step 1: Batch Create Transactions');

  const providers = [
    '0x2222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333',
    '0x4444444444444444444444444444444444444444',
    '0x5555555555555555555555555555555555555555',
    '0x6666666666666666666666666666666666666666',
  ];

  log('📝', `Creating ${providers.length} transactions in parallel...`);
  const startCreate = Date.now();

  const createPromises = providers.map((provider, index) =>
    client.intermediate.createTransaction({
      provider,
      amount: String(10 + index * 5), // $10, $15, $20, $25, $30
      deadline: '+2h',
      disputeWindow: 3600, // 1 hour (minimum)
    })
  );

  const txIds = await Promise.all(createPromises);
  const createTime = Date.now() - startCreate;

  console.log(`   Created ${txIds.length} transactions in ${createTime}ms`);
  txIds.forEach((id, i) => {
    console.log(`   ${i + 1}. ${id.substring(0, 16)}... → Provider ${i + 1}`);
  });

  // =====================================================
  // Batch Link Escrow
  // =====================================================
  logSection('Step 2: Batch Link Escrow');

  log('💳', 'Linking escrow for all transactions...');
  const startLink = Date.now();

  const linkPromises = txIds.map((txId) => client.intermediate.linkEscrow(txId));

  await Promise.all(linkPromises);
  const linkTime = Date.now() - startLink;

  console.log(`   Linked ${txIds.length} escrows in ${linkTime}ms`);

  // =====================================================
  // Batch Status Check
  // =====================================================
  logSection('Step 3: Batch Status Check');

  log('🔍', 'Checking all transaction statuses...');

  const statusPromises = txIds.map((txId) => client.intermediate.getTransaction(txId));
  const transactions = await Promise.all(statusPromises);

  console.log('   Status report:');
  transactions.forEach((tx, i) => {
    console.log(`   ${i + 1}. ${formatState(tx!.state)} - $${Number(tx!.amount) / 1_000_000} USDC`);
  });

  // Count by state
  const stateCounts: Record<string, number> = {};
  transactions.forEach((tx) => {
    stateCounts[tx!.state] = (stateCounts[tx!.state] || 0) + 1;
  });
  console.log('\n   State distribution:', stateCounts);

  // =====================================================
  // Batch State Transitions
  // =====================================================
  logSection('Step 4: Batch State Transitions');

  log('🔨', 'Transitioning all to IN_PROGRESS...');
  const startTransition = Date.now();

  const progressPromises = txIds.map((txId) =>
    client.intermediate.transitionState(txId, 'IN_PROGRESS')
  );

  await Promise.all(progressPromises);
  const transitionTime = Date.now() - startTransition;

  console.log(`   Transitioned ${txIds.length} transactions in ${transitionTime}ms`);

  log('📦', 'Transitioning all to DELIVERED...');

  const deliverPromises = txIds.map((txId) =>
    client.intermediate.transitionState(txId, 'DELIVERED')
  );

  await Promise.all(deliverPromises);
  console.log(`   All transactions delivered`);

  // =====================================================
  // Error Handling in Batch
  // =====================================================
  logSection('Step 5: Error Handling');

  log('⚠️', 'Demonstrating batch error handling...');

  // Try to create transactions with one invalid provider
  const mixedProviders = [
    '0x7777777777777777777777777777777777777777', // Valid
    '0x8888888888888888888888888888888888888888', // Valid
    'invalid-address', // Invalid - will fail
  ];

  console.log('   Creating batch with one invalid address...');

  const results = await Promise.allSettled(
    mixedProviders.map((provider) =>
      client.intermediate.createTransaction({
        provider,
        amount: '5',
        deadline: '+1h',
        disputeWindow: 3600, // 1 hour minimum
      })
    )
  );

  let successCount = 0;
  let failCount = 0;

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      successCount++;
      console.log(`   ✅ Transaction ${i + 1}: ${result.value.substring(0, 16)}...`);
    } else {
      failCount++;
      console.log(`   ❌ Transaction ${i + 1}: ${result.reason.message}`);
    }
  });

  console.log(`\n   Results: ${successCount} succeeded, ${failCount} failed`);

  // =====================================================
  // Performance Summary
  // =====================================================
  logSection('Performance Summary');

  console.log('Batch operation timings:');
  console.log(`  Create ${txIds.length} transactions: ${createTime}ms`);
  console.log(`  Link ${txIds.length} escrows: ${linkTime}ms`);
  console.log(`  Transition ${txIds.length} states: ${transitionTime}ms`);
  console.log('');
  console.log('Tips for production:');
  console.log('  - Use Promise.allSettled() for error resilience');
  console.log('  - Batch size 10-50 for optimal performance');
  console.log('  - Implement retry logic for failed operations');
  console.log('  - Monitor gas costs when batching on-chain');

  // Final status
  console.log(`\nTotal transactions created: ${txIds.length}`);

  log('🎉', 'Batch operations demo complete!');
}

main().catch(console.error);
