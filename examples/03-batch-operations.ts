/**
 * Example 03: Batch Operations
 *
 * This example demonstrates how to create multiple transactions in parallel
 * for improved efficiency. Use this pattern when:
 * - Processing multiple payments simultaneously
 * - Batch funding multiple transactions
 * - Managing multiple providers
 *
 * Gas optimization: Parallel execution saves time vs sequential.
 */

import 'dotenv/config';
import { ACTPClient, State } from '@agirails/sdk';
import { parseUnits } from 'ethers';
import {
  logSection,
  log,
  formatState,
  formatUSDC,
  logError,
  shortTxId,
  handleNetworkError
} from '../src/utils/helpers';

async function main() {
  try {
    logSection('AGIRAILS SDK - Batch Operations Example');

    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in .env file');
    }

    // 1. Initialize client
    log('🔧', 'Initializing ACTP Client...');
    let client;
    try {
      client = await ACTPClient.create({
        network: 'base-sepolia',
        privateKey: process.env.PRIVATE_KEY
      });
    } catch (error) {
      handleNetworkError(error);
    }

    const myAddress = await client.getAddress();
    log('✅', `Connected as: ${myAddress}`);

    const config = client.getNetworkConfig();

    // 2. Check USDC balance
    const usdcBalance = await client.escrow.getTokenBalance(config.contracts.usdc, myAddress);
    console.log(`USDC Balance: ${formatUSDC(usdcBalance)}`);

    const totalRequired = parseUnits('30', 6); // Need 30 USDC for 3x 10 USDC transactions
    if (usdcBalance < totalRequired) {
      console.warn(`\n⚠️  Need at least ${formatUSDC(totalRequired)} for this example.`);
      return;
    }

    // 3. Create multiple transactions in parallel
    logSection('Step 1: Batch Create Transactions');

    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const disputeWindow = 7200;

    // Define batch of transactions
    const batchParams = [
      { amount: parseUnits('10', 6), description: 'Data analysis service' },
      { amount: parseUnits('15', 6), description: 'API integration' },
      { amount: parseUnits('5', 6), description: 'Code review' }
    ];

    log('📝', `Creating ${batchParams.length} transactions in parallel...`);

    const startTime = Date.now();

    // Use Promise.all for parallel execution
    const txIds = await Promise.all(
      batchParams.map(params =>
        client.kernel.createTransaction({
          requester: myAddress,
          provider: myAddress, // Self-test
          amount: params.amount,
          deadline,
          disputeWindow
        })
      )
    );

    const createTime = Date.now() - startTime;
    log('✅', `${txIds.length} transactions created in ${createTime}ms`);

    // Display created transactions
    console.log('\nCreated Transactions:');
    txIds.forEach((txId, index) => {
      console.log(`  ${index + 1}. ${shortTxId(txId)} - ${formatUSDC(batchParams[index].amount)} (${batchParams[index].description})`);
    });

    // 4. Batch fund transactions
    logSection('Step 2: Batch Fund Transactions');

    log('💳', 'Funding all transactions in parallel...');

    const fundStartTime = Date.now();

    const escrowIds = await Promise.all(
      txIds.map(txId => client.fundTransaction(txId))
    );

    const fundTime = Date.now() - fundStartTime;
    log('✅', `${escrowIds.length} transactions funded in ${fundTime}ms`);

    // Verify all states
    const transactions = await Promise.all(
      txIds.map(txId => client.kernel.getTransaction(txId))
    );

    console.log('\nFunded Transactions:');
    transactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${shortTxId(tx.txId)} - ${formatState(tx.state)} - ${formatUSDC(tx.amount)}`);
    });

    // 5. Batch state transitions
    logSection('Step 3: Batch State Transitions');

    log('🔨', 'Transitioning all to IN_PROGRESS...');

    const progressStartTime = Date.now();

    await Promise.all(
      txIds.map(txId =>
        client.kernel.transitionState(txId, State.IN_PROGRESS)
      )
    );

    const progressTime = Date.now() - progressStartTime;
    log('✅', `${txIds.length} transitions completed in ${progressTime}ms`);

    // 6. Batch deliver
    log('📦', 'Transitioning all to DELIVERED...');

    await Promise.all(
      txIds.map(txId =>
        client.kernel.transitionState(txId, State.DELIVERED)
      )
    );

    log('✅', 'All transactions delivered');

    // Verify final states
    const finalTransactions = await Promise.all(
      txIds.map(txId => client.kernel.getTransaction(txId))
    );

    console.log('\nFinal States:');
    finalTransactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${shortTxId(tx.txId)} - ${formatState(tx.state)}`);
    });

    // 7. Performance summary
    logSection('Performance Summary');

    const totalTime = Date.now() - startTime;
    const avgTimePerTx = totalTime / txIds.length;

    console.log('Batch Operation Stats:');
    console.log(`  Total Transactions: ${txIds.length}`);
    console.log(`  Total Time: ${totalTime}ms`);
    console.log(`  Average Time per TX: ${avgTimePerTx.toFixed(0)}ms`);
    console.log('');
    console.log('Breakdown:');
    console.log(`  Create (parallel): ${createTime}ms`);
    console.log(`  Fund (parallel): ${fundTime}ms`);
    console.log(`  Transitions (parallel): ${progressTime}ms`);
    console.log('');
    console.log('Performance Benefits:');
    console.log('  Parallel execution saves wall-clock time (not gas cost).');
    console.log('  All transactions submit concurrently and may confirm in same block.');
    console.log('  Total gas cost is the same as sequential execution.');
    console.log('');

    // 8. Calculate total value
    const totalAmount = batchParams.reduce((sum, p) => sum + p.amount, 0n);
    console.log(`Total Transaction Value: ${formatUSDC(totalAmount)}`);

    // Get economic params for fee calculation
    const economicParams = await client.kernel.getEconomicParams();
    const totalFee = (totalAmount * BigInt(economicParams.baseFeeNumerator)) / BigInt(economicParams.baseFeeDenominator);
    console.log(`Total Platform Fees: ${formatUSDC(totalFee)}`);

    log('🎉', 'Batch operations complete!');

  } catch (error: any) {
    logError(error);
    process.exit(1);
  }
}

// Run example
main();
