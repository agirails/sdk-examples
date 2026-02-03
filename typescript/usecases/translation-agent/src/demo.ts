/**
 * Translation Agent Demo
 *
 * End-to-end demonstration of AGIRAILS agent-to-agent commerce:
 * 1. Starts a Translation Provider agent
 * 2. Client creates transactions directly to provider
 * 3. Provider auto-accepts, translates, and delivers
 * 4. Displays statistics and final results
 *
 * This demo runs in mock mode (no real blockchain transactions).
 * For testnet, configure .env with private keys.
 */

import 'dotenv/config';
import { createProvider } from './provider.js';

// Force mock mode for demo
process.env.NETWORK = process.env.NETWORK || 'mock';

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║          AGIRAILS Translation Agent Demo                     ║');
  console.log('║                                                              ║');
  console.log('║   Demonstrating autonomous agent-to-agent commerce           ║');
  console.log('║   using the ACTP (Agent Commerce Transaction Protocol)       ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  let provider;

  try {
    // Step 1: Start Provider Agent
    console.log('STEP 1: Starting Translation Provider...\n');
    provider = await createProvider();
    const providerAddress = provider.address;

    // Give provider time to initialize
    await sleep(1000);

    // Step 2: Create Client (using ACTPClient directly for shared runtime)
    console.log('\n----------------------------------------\n');
    console.log('STEP 2: Creating Translation Client...\n');

    // Get the provider's runtime to share state (mock mode only)
    // In mock mode, both agents need to share the same runtime for transactions to be visible
    const runtime = (provider as any)._client?.runtime;
    if (!runtime) {
      throw new Error('Could not access provider runtime');
    }

    // Generate client address using same method as SDK (from agent name to hex)
    const clientName = 'TranslationClient';
    const clientAddress = `0x${Buffer.from(clientName).toString('hex').padEnd(40, '0').slice(0, 40)}`;

    // Mint tokens for client in the shared runtime (100 USDC)
    await runtime.mintTokens(clientAddress, '100000000');

    console.log(`Client Address: ${clientAddress}`);
    console.log(`Provider Address: ${providerAddress}`);
    console.log(`Client Balance: $100.00 USDC`);
    console.log('');

    // Step 3: Request translations via ACTP transactions
    console.log('\n----------------------------------------\n');
    console.log('STEP 3: Requesting translations...\n');

    const translations = [
      {
        text: 'Hello, world! This is a test of the AGIRAILS translation service.',
        from: 'en',
        to: 'de',
        budget: 2.00,
      },
      {
        text: 'The quick brown fox jumps over the lazy dog.',
        from: 'en',
        to: 'fr',
        budget: 2.00,
      },
      {
        text: 'Artificial intelligence agents can now pay each other autonomously.',
        from: 'en',
        to: 'es',
        budget: 2.50,
      },
    ];

    const results = [];
    for (const request of translations) {
      try {
        console.log(`[REQUEST] Translation: "${request.text.slice(0, 40)}..."`);
        console.log(`          ${request.from.toUpperCase()} -> ${request.to.toUpperCase()}`);
        console.log(`          Budget: $${request.budget.toFixed(2)} USDC`);

        // Create transaction via Runtime directly (shared mock mode)
        const amountWei = (request.budget * 1_000_000).toString(); // USDC has 6 decimals
        const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

        const txId = await runtime.createTransaction({
          provider: providerAddress,
          requester: clientAddress,
          amount: amountWei,
          deadline,
          disputeWindow: 3600,
          serviceDescription: JSON.stringify({
            service: 'translation',
            input: {
              text: request.text,
              from: request.from,
              to: request.to,
            },
          }),
        });

        // Wait for provider to pick up, process, and deliver (polling interval is 5s)
        // Provider will: see INITIATED → link escrow → process → deliver
        console.log(`          Waiting for provider to process...`);

        let tx = await runtime.getTransaction(txId);
        let attempts = 0;
        const maxAttempts = 30; // 30 * 500ms = 15s max wait (need more time for provider poll)

        while (tx?.state !== 'DELIVERED' && tx?.state !== 'SETTLED' && attempts < maxAttempts) {
          await sleep(500);
          tx = await runtime.getTransaction(txId);
          attempts++;
        }

        if (tx?.state === 'DELIVERED' || tx?.state === 'SETTLED') {
          // Delivery result is app-specific and not available on-chain in mainnet.
          // Use your own storage/indexer to fetch it.
          let result = { translated: '[Translation completed]' };

          console.log(`[RESULT]  Translated: "${result.translated.slice(0, 40)}..."`);
          console.log(`          State: ${tx.state}`);
          console.log('');
          results.push({ request, result, success: true });
        } else {
          console.log(`[TIMEOUT] Transaction state: ${tx?.state || 'unknown'}`);
          console.log('');
          results.push({ request, error: 'Timeout', success: false });
        }

      } catch (error) {
        console.error(`Translation failed: ${(error as Error).message}\n`);
        results.push({ request, error: (error as Error).message, success: false });
      }

      // Small delay between requests
      await sleep(500);
    }

    // Step 4: Display results
    console.log('\n----------------------------------------\n');
    console.log('STEP 4: Results Summary\n');

    console.log('Translations Completed:');
    console.log('─'.repeat(60));

    for (const { request, result, success } of results) {
      if (success && result) {
        console.log(`  ${request.from.toUpperCase()} -> ${request.to.toUpperCase()}: "${request.text.slice(0, 30)}..."`);
        console.log(`  Result: "${(result as any).translated?.slice(0, 40) || 'N/A'}..."`);
        console.log('');
      }
    }

    // Provider statistics
    console.log('\nProvider Statistics:');
    console.log('─'.repeat(60));
    console.log(`  Jobs Completed:  ${provider.stats.jobsCompleted}`);
    console.log(`  Jobs Failed:     ${provider.stats.jobsFailed}`);
    console.log(`  Total Earned:    $${provider.stats.totalEarned.toFixed(2)} USDC`);
    console.log(`  Success Rate:    ${(provider.stats.successRate * 100).toFixed(1)}%`);
    console.log(`  Avg Job Time:    ${provider.stats.averageJobTime.toFixed(0)}ms`);

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                                                              ║');
    console.log('║                    Demo Complete!                            ║');
    console.log('║                                                              ║');
    console.log('║   The provider agent earned USDC by translating text.        ║');
    console.log('║   The client agent paid for translations via ACTP escrow.    ║');
    console.log('║                                                              ║');
    console.log('║   To run on testnet, configure .env with private keys.       ║');
    console.log('║                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');

  } finally {
    // Cleanup
    if (provider) {
      await provider.stop();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run demo
main().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
