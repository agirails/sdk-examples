/**
 * Example 04: Event Monitoring
 *
 * This example demonstrates real-time blockchain event monitoring:
 * 1. Watch for new transaction creation
 * 2. Monitor state changes on specific transaction
 * 3. Use event-driven patterns for automated workflows
 *
 * Use cases:
 * - Provider bots monitoring for new jobs
 * - Dashboard real-time updates
 * - Automated payment processing
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
  shortAddress,
  handleNetworkError
} from '../src/utils/helpers';

async function main() {
  try {
    logSection('AGIRAILS SDK - Event Monitoring Example');

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

    // 2. Set up global event listeners
    logSection('Setting Up Event Listeners');

    log('👂', 'Subscribing to TransactionCreated events...');
    const unsubscribeCreated = client.events.onTransactionCreated((tx) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`\n🆕 [${timestamp}] New Transaction Created!`);
      console.log(`   ID: ${shortTxId(tx.txId)}`);
      console.log(`   Provider: ${shortAddress(tx.provider)}`);
      console.log(`   Requester: ${shortAddress(tx.requester)}`);
      console.log(`   Amount: ${formatUSDC(tx.amount)}`);
    });

    log('👂', 'Subscribing to StateChanged events...');
    const unsubscribeStateChanged = client.events.onStateChanged((txId, from, to) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`\n🔄 [${timestamp}] State Changed!`);
      console.log(`   Transaction: ${shortTxId(txId)}`);
      console.log(`   ${formatState(from)} → ${formatState(to)}`);
    });

    log('👂', 'Subscribing to EscrowReleased events...');
    const unsubscribeEscrowReleased = client.events.onEscrowReleased((txId, amount) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`\n💸 [${timestamp}] Escrow Released!`);
      console.log(`   Transaction: ${shortTxId(txId)}`);
      console.log(`   Amount: ${formatUSDC(amount)}`);
    });

    console.log('\n✅ Event listeners active. Watching blockchain...\n');

    // 3. Create test transaction to trigger events
    logSection('Creating Test Transaction');

    const config = client.getNetworkConfig();
    const usdcBalance = await client.escrow.getTokenBalance(config.contracts.usdc, myAddress);

    if (usdcBalance < parseUnits('5', 6)) {
      console.warn('⚠️  Insufficient USDC for test transaction');
      console.log('Event listeners will remain active for any other transactions...');
      console.log('Press Ctrl+C to exit');
      await new Promise(() => {}); // Keep alive
      return;
    }

    log('📝', 'Creating transaction (will trigger TransactionCreated event)...');

    const amount = parseUnits('5', 6);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const disputeWindow = 300;

    const txId = await client.kernel.createTransaction({
      requester: myAddress,
      provider: myAddress,
      amount,
      deadline,
      disputeWindow
    });

    console.log(`\nTransaction created: ${shortTxId(txId)}`);
    console.log('Waiting for event to be emitted...\n');

    // Wait a moment for event to propagate
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. Watch specific transaction
    logSection('Watching Specific Transaction');

    log('👁️', `Monitoring transaction ${shortTxId(txId)}...`);

    const unsubscribeWatch = client.events.watchTransaction(txId, (state) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`\n🎯 [${timestamp}] Transaction ${shortTxId(txId)} changed to ${formatState(state)}`);

      // Auto-respond to state changes (example automation)
      if (state === State.COMMITTED) {
        console.log('   → Funds locked! Provider can start work.');
      } else if (state === State.DELIVERED) {
        console.log('   → Work delivered! Requester can review.');
      } else if (state === State.SETTLED) {
        console.log('   → Payment complete! Transaction finalized.');
      }
    });

    // 5. Trigger state changes to demonstrate monitoring
    log('🔨', 'Funding transaction (will trigger state change)...');
    await client.fundTransaction(txId);

    await new Promise(resolve => setTimeout(resolve, 2000));

    log('📦', 'Delivering work...');
    await client.kernel.transitionState(txId, State.DELIVERED);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Use waitForState pattern
    logSection('Wait For State Pattern');

    console.log('Example: Wait for transaction to reach DELIVERED state');
    console.log('(This transaction is already DELIVERED, so this will resolve immediately)\n');

    try {
      await client.events.waitForState(txId, State.DELIVERED, 10000);
      log('✅', 'Transaction reached DELIVERED state!');
    } catch (error: any) {
      log('⏱️', 'Timeout waiting for state (this is expected for demo)');
    }

    // 7. Demonstrate timeout
    console.log('\nExample: Wait for SETTLED with short timeout (will timeout)');

    try {
      await client.events.waitForState(txId, State.SETTLED, 5000);
    } catch (error: any) {
      log('⏱️', 'Timeout reached (as expected - we did not settle)');
    }

    // 8. Get transaction history
    logSection('Transaction History');

    log('📜', 'Fetching transaction history for your address...');

    const asRequester = await client.events.getTransactionHistory(myAddress, 'requester');
    const asProvider = await client.events.getTransactionHistory(myAddress, 'provider');

    console.log(`\nTransactions as Requester: ${asRequester.length}`);
    asRequester.slice(0, 5).forEach((tx, index) => {
      console.log(`  ${index + 1}. ${shortTxId(tx.txId)} - ${formatState(tx.state)} - ${formatUSDC(tx.amount)}`);
    });

    console.log(`\nTransactions as Provider: ${asProvider.length}`);
    asProvider.slice(0, 5).forEach((tx, index) => {
      console.log(`  ${index + 1}. ${shortTxId(tx.txId)} - ${formatState(tx.state)} - ${formatUSDC(tx.amount)}`);
    });

    // 9. Cleanup
    logSection('Cleanup');

    log('🧹', 'Unsubscribing from all event listeners...');

    unsubscribeCreated();
    unsubscribeStateChanged();
    unsubscribeEscrowReleased();
    unsubscribeWatch();

    log('✅', 'All listeners removed');

    // 10. Summary
    logSection('Summary');

    console.log('Event Monitoring Patterns Demonstrated:');
    console.log('✅ Global event listeners (onTransactionCreated, onStateChanged, onEscrowReleased)');
    console.log('✅ Specific transaction monitoring (watchTransaction)');
    console.log('✅ Wait for state pattern (waitForState with timeout)');
    console.log('✅ Transaction history queries (getTransactionHistory)');
    console.log('✅ Proper cleanup (unsubscribe functions)');
    console.log('');
    console.log('Use Cases:');
    console.log('• Provider bot: Listen for new jobs matching criteria');
    console.log('• Dashboard: Real-time transaction status updates');
    console.log('• Automation: Auto-settle after dispute window expires');
    console.log('• Analytics: Track all transactions for reporting');

    log('🎉', 'Event monitoring example complete!');

  } catch (error: any) {
    logError(error);
    process.exit(1);
  }
}

// Run example
main();
