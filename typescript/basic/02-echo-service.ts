/**
 * Basic API Example 02: Echo Service
 *
 * A complete echo service that returns whatever you send.
 * Demonstrates provider events and statistics.
 *
 * This example demonstrates:
 * - Provider events (payment:received)
 * - Provider stats (jobsCompleted, totalEarned)
 * - Multiple requests to same provider
 *
 * Run: npx ts-node basic/02-echo-service.ts
 */

import { provide, request } from '@agirails/sdk';
import { waitForProvider } from '../src/utils/helpers';

async function main() {
  console.log('AGIRAILS Basic API - Echo Service\n');

  // 1. Create echo service provider with event listener
  const provider = provide('echo', async (job) => {
    console.log(`  Processing: "${JSON.stringify(job.input)}"`);
    return job.input; // Return exactly what was sent
  });

  // Listen for payments
  provider.on('payment:received', (amount: number) => {
    console.log(`  Payment received: $${amount.toFixed(2)} USDC`);
  });

  // Wait for provider to be ready
  await waitForProvider(provider);
  console.log('Echo provider started:', provider.address);
  console.log('');

  // 2. Make several requests
  const testCases = [
    'Hello, AGIRAILS!',
    { message: 'JSON works too', count: 42 },
    ['arrays', 'are', 'supported'],
  ];

  for (const input of testCases) {
    console.log(`Request: ${JSON.stringify(input)}`);

    const { result } = await request('echo', {
      input,
      budget: 0.50, // $0.50 USDC per request
    });

    console.log(`Response: ${JSON.stringify(result)}`);
    console.log('');
  }

  // 3. Show provider statistics
  console.log('Provider Stats:');
  console.log(`  Jobs completed: ${provider.stats.jobsCompleted}`);
  console.log(`  Total earned: $${provider.stats.totalEarned.toFixed(2)} USDC`);
  console.log(`  Average job time: ${provider.stats.averageJobTime.toFixed(0)}ms`);

  // 4. Cleanup
  await provider.stop();
  console.log('\nProvider stopped.');
}

main().catch(console.error);
