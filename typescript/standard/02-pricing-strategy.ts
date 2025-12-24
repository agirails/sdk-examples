/**
 * Standard API Example 02: Pricing Strategy
 *
 * Demonstrates how to configure pricing for your services.
 * The Agent can automatically accept/reject jobs based on profitability.
 *
 * This example demonstrates:
 * - Cost + margin pricing model
 * - Per-unit pricing (e.g., per word, per image)
 * - Automatic profitability checks
 * - Below-cost behavior configuration
 *
 * Run: npx ts-node standard/02-pricing-strategy.ts
 */

import { Agent, request, PricingStrategy, serviceDirectory } from '@agirails/sdk';

async function main() {
  console.log('AGIRAILS Standard API - Pricing Strategy\n');

  // Define pricing strategy for translation service
  const translationPricing: PricingStrategy = {
    // Base cost for running the service
    cost: {
      base: 0.50, // $0.50 base cost per job
      perUnit: {
        unit: 'word',
        rate: 0.01, // $0.01 per word
      },
    },
    // Desired profit margin (40%)
    margin: 0.40,
    // Behavior configuration
    behavior: {
      belowCost: 'reject', // Reject jobs below cost
      belowPrice: 'counter-offer', // Counter-offer if below target price
    },
  };

  // Create agent with pricing-aware service
  const agent = new Agent({
    name: 'TranslationAgent',
    network: 'mock',
  });

  // Register service with pricing
  agent.provide(
    {
      name: 'translate',
      description: 'AI-powered translation service',
      pricing: translationPricing,
    },
    async (job) => {
      const { text, targetLang } = job.input;
      const wordCount = text.split(/\s+/).length;

      console.log(`  Translating ${wordCount} words to ${targetLang}`);

      // Simulate translation
      await new Promise((r) => setTimeout(r, 200));

      return {
        translated: `[${targetLang}] ${text}`,
        wordCount,
        targetLang,
      };
    }
  );

  await agent.start();
  serviceDirectory.register('translate', agent.address);
  console.log('Translation agent started:', agent.address);
  console.log('');

  // Test 1: Fair price - should be accepted
  console.log('Test 1: Fair price ($5 for 100 words)');
  console.log('  Expected cost: $0.50 base + $1.00 (100 words) = $1.50');
  console.log('  With 40% margin: $2.50 minimum price (cost / 0.60)');
  try {
    const { result: res1 } = await request('translate', {
      input: {
        text: 'Hello world '.repeat(50).trim(), // ~100 words
        targetLang: 'de',
      },
      budget: 5.0, // $5 - well above minimum
    });
    console.log('  Result:', (res1 as { translated: string }).translated.substring(0, 50) + '...');
    console.log('  Status: ACCEPTED');
  } catch (error: any) {
    console.log('  Status: REJECTED -', error.message);
  }
  console.log('');

  // Test 2: Low price - should be rejected
  console.log('Test 2: Low price ($0.50 for 100 words)');
  console.log('  Offered: $0.50, Required: $2.50 minimum');
  try {
    const { result: res2 } = await request('translate', {
      input: {
        text: 'Hello world '.repeat(50).trim(),
        targetLang: 'es',
      },
      budget: 0.50, // $0.50 - below cost
      timeout: 5000, // Short timeout since it should reject
    });
    console.log('  Result:', res2);
    console.log('  Status: ACCEPTED (unexpected!)');
  } catch (error: any) {
    console.log('  Status: REJECTED (as expected)');
  }
  console.log('');

  // Test 3: Marginal price - at the edge
  console.log('Test 3: Marginal price ($2.50 for 100 words)');
  console.log('  Offered: $2.50, Required: $2.50 minimum (just at threshold)');
  try {
    const { result: res3 } = await request('translate', {
      input: {
        text: 'Hello world '.repeat(50).trim(),
        targetLang: 'fr',
      },
      budget: 2.50, // Just above minimum
    });
    console.log('  Result:', (res3 as { translated: string }).translated.substring(0, 50) + '...');
    console.log('  Status: ACCEPTED');
  } catch (error: any) {
    console.log('  Status: REJECTED -', error.message);
  }
  console.log('');

  // Show final stats
  console.log('Agent Stats:');
  console.log(`  Jobs completed: ${agent.stats.jobsCompleted}`);
  console.log(`  Jobs rejected: ${agent.stats.jobsReceived - agent.stats.jobsCompleted}`);
  console.log(`  Total earned: $${agent.stats.totalEarned.toFixed(2)}`);

  serviceDirectory.unregister('translate', agent.address);
  await agent.stop();
  console.log('\nPricing demo complete!');
}

main().catch(console.error);
