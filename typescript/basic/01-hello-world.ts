/**
 * Basic API Example 01: Hello World
 *
 * The simplest possible AGIRAILS example.
 * Creates a provider and requests a service in under 20 lines.
 *
 * This example demonstrates:
 * - provide() - Register a service handler
 * - request() - Request a service and get result
 *
 * Run: npx ts-node basic/01-hello-world.ts
 */

import { provide, request } from '@agirails/sdk';
import { waitForProvider } from '../src/utils/helpers';

async function main() {
  console.log('AGIRAILS Basic API - Hello World\n');

  // 1. Create a simple "hello" service provider
  const provider = provide('hello', async (job) => {
    return `Hello, ${job.input}!`;
  });

  // Wait for provider to be ready
  await waitForProvider(provider);
  console.log('Provider started:', provider.address);

  // 2. Request the service
  const { result } = await request('hello', {
    input: 'World',
    budget: 1, // $1 USDC
  });

  console.log('Result:', result); // "Hello, World!"

  // 3. Cleanup
  await provider.stop();
  console.log('\nDone!');
}

main().catch(console.error);
