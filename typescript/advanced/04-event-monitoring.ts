/**
 * Advanced API Example 04: Event Monitoring
 *
 * Demonstrates real-time event monitoring for blockchain transactions.
 * Essential for building responsive applications.
 *
 * This example demonstrates:
 * - Transaction state change monitoring
 * - Event filtering and handling
 * - Building a simple transaction watcher
 *
 * Note: Event monitoring is primarily useful in testnet/mainnet mode.
 * In mock mode, we simulate the event pattern.
 *
 * Run: npx ts-node advanced/04-event-monitoring.ts
 */

import 'dotenv/config';
import { ACTPClient } from '@agirails/sdk';
import { log, logSection, formatState, sleep } from '../src/utils/helpers';

// Transaction watcher utility
class TransactionWatcher {
  private watching: Map<string, NodeJS.Timeout> = new Map();

  constructor(private client: ACTPClient) {}

  async watch(
    txId: string,
    onStateChange: (txId: string, oldState: string, newState: string) => void,
    pollInterval: number = 1000
  ): Promise<void> {
    let lastState = '';

    const interval = setInterval(async () => {
      try {
        const tx = await this.client.standard.getTransaction(txId);
        if (tx && tx.state !== lastState) {
          const oldState = lastState;
          lastState = tx.state;
          if (oldState) {
            onStateChange(txId, oldState, tx.state);
          }
        }
      } catch (error) {
        // Transaction might not exist yet
      }
    }, pollInterval);

    this.watching.set(txId, interval);
  }

  unwatch(txId: string): void {
    const interval = this.watching.get(txId);
    if (interval) {
      clearInterval(interval);
      this.watching.delete(txId);
    }
  }

  unwatchAll(): void {
    for (const [txId] of this.watching) {
      this.unwatch(txId);
    }
  }
}

async function main() {
  logSection('AGIRAILS Advanced API - Event Monitoring');

  const requesterAddress = '0x1111111111111111111111111111111111111111';
  const providerAddress = '0x2222222222222222222222222222222222222222';

  log('🔧', 'Creating client...');
  const client = await ACTPClient.create({
    mode: 'mock',
    requesterAddress,
  });

  await client.mintTokens(requesterAddress, '100000000');
  log('✅', 'Client ready');

  // =====================================================
  // Simple Polling Watcher
  // =====================================================
  logSection('Method 1: Polling Watcher');

  const watcher = new TransactionWatcher(client);

  log('📝', 'Creating transaction...');
  const txId = await client.standard.createTransaction({
    provider: providerAddress,
    amount: '25',
    deadline: '+1h',
    disputeWindow: 3600, // 1 hour (minimum)
  });

  console.log(`   Transaction: ${txId.substring(0, 16)}...`);

  // Set up watcher
  log('👁️', 'Starting transaction watcher...');
  const stateChanges: string[] = [];

  watcher.watch(txId, (id, oldState, newState) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`   [${timestamp}] State changed: ${formatState(oldState)} → ${formatState(newState)}`);
    stateChanges.push(`${oldState}→${newState}`);
  });

  // Perform state transitions
  log('🔄', 'Performing state transitions...');

  await sleep(500);
  await client.standard.linkEscrow(txId);

  await sleep(500);
  await client.standard.transitionState(txId, 'IN_PROGRESS');

  await sleep(500);
  await client.standard.transitionState(txId, 'DELIVERED');

  await sleep(500);

  // Stop watching
  watcher.unwatchAll();

  console.log(`\n   Captured ${stateChanges.length} state changes`);

  // =====================================================
  // Wait for Specific State
  // =====================================================
  logSection('Method 2: Wait for State');

  log('📝', 'Creating another transaction...');
  const txId2 = await client.standard.createTransaction({
    provider: providerAddress,
    amount: '15',
    deadline: '+1h',
    disputeWindow: 3600, // 1 hour (minimum)
  });

  console.log(`   Transaction: ${txId2.substring(0, 16)}...`);

  // Function to wait for a specific state
  async function waitForState(
    client: ACTPClient,
    txId: string,
    targetState: string,
    timeout: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 500;

    while (Date.now() - startTime < timeout) {
      const tx = await client.standard.getTransaction(txId);
      if (tx && tx.state === targetState) {
        return true;
      }
      await sleep(pollInterval);
    }

    return false;
  }

  // Start background transitions
  log('⏳', 'Waiting for COMMITTED state...');

  // Trigger transition in background
  setTimeout(async () => {
    await client.standard.linkEscrow(txId2);
  }, 1000);

  const reached = await waitForState(client, txId2, 'COMMITTED', 5000);
  console.log(`   State reached: ${reached ? 'Yes' : 'Timeout'}`);

  // =====================================================
  // Transaction History Query
  // =====================================================
  logSection('Method 3: Transaction History');

  log('📋', 'Querying transaction history...');

  // Manually query both transactions (getAllTransactions not available in this adapter)
  const transactionIds = [txId, txId2];
  const allTransactions = await Promise.all(
    transactionIds.map(id => client.standard.getTransaction(id))
  );

  console.log(`   Total transactions: ${allTransactions.length}`);
  console.log('');
  console.log('   Transaction History:');
  console.log('   ' + '-'.repeat(60));

  for (const tx of allTransactions) {
    if (!tx) continue;
    const amount = Number(tx.amount) / 1_000_000;
    const created = new Date(tx.createdAt * 1000).toLocaleTimeString();
    const updated = new Date(tx.updatedAt * 1000).toLocaleTimeString();

    console.log(`   ${tx.id.substring(0, 12)}...`);
    console.log(`     State: ${formatState(tx.state)}`);
    console.log(`     Amount: $${amount.toFixed(2)} USDC`);
    console.log(`     Created: ${created}, Updated: ${updated}`);
    console.log('');
  }

  // =====================================================
  // Blockchain Event Monitoring (testnet/mainnet)
  // =====================================================
  logSection('Blockchain Events (testnet/mainnet)');

  console.log('In testnet/mainnet mode, you can monitor blockchain events:');
  console.log('');
  console.log('  // Access EventMonitor via BlockchainRuntime');
  console.log('  const runtime = client.advanced as BlockchainRuntime;');
  console.log('  const events = runtime.getEvents();');
  console.log('');
  console.log('  // Watch for TransactionCreated events');
  console.log('  events.onTransactionCreated((txId, requester, provider) => {');
  console.log('    console.log("New transaction:", txId);');
  console.log('  });');
  console.log('');
  console.log('  // Watch for StateChanged events');
  console.log('  events.onStateChanged((txId, oldState, newState) => {');
  console.log('    console.log("State changed:", oldState, "→", newState);');
  console.log('  });');
  console.log('');
  console.log('  // Watch for EscrowReleased events');
  console.log('  events.onEscrowReleased((escrowId, recipient, amount) => {');
  console.log('    console.log("Escrow released:", amount, "to", recipient);');
  console.log('  });');

  log('🎉', 'Event monitoring demo complete!');
}

main().catch(console.error);
