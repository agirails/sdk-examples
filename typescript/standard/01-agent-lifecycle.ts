/**
 * Standard API Example 01: Agent Lifecycle
 *
 * Demonstrates the full Agent lifecycle: start, pause, resume, stop.
 * The Agent class provides more control than Basic API's provide().
 *
 * This example demonstrates:
 * - Agent construction and configuration
 * - Lifecycle methods: start(), pause(), resume(), stop()
 * - Status tracking and events
 *
 * Run: npx ts-node standard/01-agent-lifecycle.ts
 */

import { Agent, request, serviceDirectory } from '@agirails/sdk';
import { sleep } from '../src/utils/helpers';

async function main() {
  console.log('AGIRAILS Standard API - Agent Lifecycle\n');

  // 1. Create an Agent with configuration
  const agent = new Agent({
    name: 'LifecycleDemo',
    description: 'Demonstrates agent lifecycle management',
    network: 'mock',
    behavior: {
      autoAccept: true,
      concurrency: 5, // Max 5 concurrent jobs
    },
    logging: {
      level: 'info',
    },
  });

  console.log(`Agent created: ${agent.name}`);
  console.log(`Status: ${agent.status}`); // 'idle'

  // 2. Register a service
  agent.provide('ping', async (job) => {
    return { pong: true, timestamp: Date.now() };
  });

  console.log(`Services: ${agent.serviceNames.join(', ')}`);

  // 3. Start the agent
  console.log('\nStarting agent...');
  await agent.start();

  // Register with service directory (needed for request() to find this agent)
  serviceDirectory.register('ping', agent.address);

  console.log(`Status: ${agent.status}`); // 'running'
  console.log(`Address: ${agent.address}`);

  // 4. Make a request while running
  console.log('\nMaking request while agent is running...');
  const { result: result1 } = await request('ping', { input: {}, budget: 0.10 });
  console.log('Response:', result1);

  // 5. Pause the agent
  console.log('\nPausing agent...');
  agent.pause();
  console.log(`Status: ${agent.status}`); // 'paused'

  // Agent won't accept new jobs while paused
  // (existing jobs will complete)

  // 6. Resume the agent
  console.log('\nResuming agent...');
  agent.resume();
  console.log(`Status: ${agent.status}`); // 'running'

  // 7. Make another request
  console.log('\nMaking request after resume...');
  const { result: result2 } = await request('ping', { input: {}, budget: 0.10 });
  console.log('Response:', result2);

  // 8. Show final stats
  console.log('\nAgent Stats:');
  console.log(`  Jobs completed: ${agent.stats.jobsCompleted}`);
  console.log(`  Total earned: $${agent.stats.totalEarned.toFixed(2)}`);
  console.log(`  Success rate: ${(agent.stats.successRate * 100).toFixed(0)}%`);

  // 9. Stop the agent
  console.log('\nStopping agent...');
  serviceDirectory.unregister('ping', agent.address);
  await agent.stop();
  console.log(`Status: ${agent.status}`); // 'stopped'

  console.log('\nLifecycle demo complete!');
}

main().catch(console.error);
