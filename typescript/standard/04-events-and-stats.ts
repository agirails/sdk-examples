/**
 * Standard API Example 04: Events and Statistics
 *
 * Demonstrates Agent event system and statistics tracking.
 * Events allow reactive programming patterns for monitoring.
 *
 * This example demonstrates:
 * - Agent events: job:received, job:completed, job:failed, payment:received
 * - Lifecycle events: starting, started, stopping, stopped, paused, resumed
 * - Statistics: jobsCompleted, totalEarned, averageJobTime, successRate
 * - Real-time monitoring pattern
 *
 * Run: npx ts-node standard/04-events-and-stats.ts
 */

import { Agent, request, serviceDirectory } from '@agirails/sdk';

async function main() {
  console.log('AGIRAILS Standard API - Events and Statistics\n');

  // Create agent
  const agent = new Agent({
    name: 'MonitoredAgent',
    network: 'mock',
  });

  // === LIFECYCLE EVENTS ===
  console.log('Setting up lifecycle event listeners...');

  agent.on('starting', () => {
    console.log('  [EVENT] Agent is starting...');
  });

  agent.on('started', () => {
    console.log('  [EVENT] Agent started successfully!');
  });

  agent.on('paused', () => {
    console.log('  [EVENT] Agent paused');
  });

  agent.on('resumed', () => {
    console.log('  [EVENT] Agent resumed');
  });

  agent.on('stopping', () => {
    console.log('  [EVENT] Agent is stopping...');
  });

  agent.on('stopped', () => {
    console.log('  [EVENT] Agent stopped');
  });

  // === JOB EVENTS ===
  console.log('Setting up job event listeners...');

  agent.on('job:received', (job: any) => {
    console.log(`  [EVENT] Job received: ${job.id.substring(0, 8)}... ($${job.budget})`);
  });

  agent.on('job:completed', (job: any, result: any) => {
    console.log(`  [EVENT] Job completed: ${job.id.substring(0, 8)}...`);
  });

  agent.on('job:failed', (job: any, error: Error) => {
    console.log(`  [EVENT] Job failed: ${job.id.substring(0, 8)}... - ${error.message}`);
  });

  agent.on('job:progress', (jobId: string, percent: number, message?: string) => {
    console.log(`  [EVENT] Job progress: ${jobId.substring(0, 8)}... - ${percent}% ${message || ''}`);
  });

  // === PAYMENT EVENTS ===
  agent.on('payment:received', (amount: number) => {
    console.log(`  [EVENT] Payment received: $${amount.toFixed(2)} USDC`);
  });

  // === ERROR EVENTS ===
  agent.on('error', (error: Error) => {
    console.log(`  [EVENT] Error: ${error.message}`);
  });

  // Register service with progress reporting
  agent.provide('process-data', async (job, ctx) => {
    // Report progress throughout execution
    ctx.progress(0, 'Starting...');

    await new Promise((r) => setTimeout(r, 100));
    ctx.progress(25, 'Loading data...');

    await new Promise((r) => setTimeout(r, 100));
    ctx.progress(50, 'Processing...');

    await new Promise((r) => setTimeout(r, 100));
    ctx.progress(75, 'Finalizing...');

    // Simulate occasional failure
    if (job.input.shouldFail) {
      throw new Error('Simulated processing error');
    }

    ctx.progress(100, 'Complete!');
    return { processed: true, items: job.input.items || 0 };
  });

  // Start agent (triggers lifecycle events)
  console.log('\n--- Starting Agent ---');
  await agent.start();
  serviceDirectory.register('process-data', agent.address);

  // Make some successful requests
  console.log('\n--- Processing Jobs ---\n');

  for (let i = 1; i <= 3; i++) {
    console.log(`Request ${i}:`);
    try {
      await request('process-data', {
        input: { items: i * 10, shouldFail: false },
        budget: 1.0,
      });
    } catch (error) {
      // Handled by event
    }
    console.log('');
  }

  // Make a failing request
  console.log('Request 4 (will fail):');
  try {
    await request('process-data', {
      input: { items: 40, shouldFail: true },
      budget: 1.0,
      timeout: 5000,
    });
  } catch (error) {
    // Handled by event
  }
  console.log('');

  // === STATISTICS ===
  console.log('\n--- Agent Statistics ---\n');

  const stats = agent.stats;
  console.log(`Jobs Received:    ${stats.jobsReceived}`);
  console.log(`Jobs Completed:   ${stats.jobsCompleted}`);
  console.log(`Jobs Failed:      ${stats.jobsFailed}`);
  console.log(`Success Rate:     ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`Total Earned:     $${stats.totalEarned.toFixed(2)} USDC`);
  console.log(`Avg Job Time:     ${stats.averageJobTime.toFixed(0)}ms`);

  // === BALANCE ===
  console.log('\n--- Agent Balance ---\n');

  const balance = agent.balance;
  console.log(`USDC Balance:     ${balance.usdc}`);
  console.log(`Locked in Escrow: ${balance.locked}`);
  console.log(`Pending:          ${balance.pending}`);

  // Stop agent (triggers lifecycle events)
  console.log('\n--- Stopping Agent ---');
  serviceDirectory.unregister('process-data', agent.address);
  await agent.stop();

  console.log('\nEvents and stats demo complete!');
}

main().catch(console.error);
