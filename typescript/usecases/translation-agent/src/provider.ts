/**
 * Translation Provider Agent
 *
 * A demonstration of an AGIRAILS provider agent that:
 * - Registers a "translation" service
 * - Auto-accepts jobs within budget constraints
 * - Performs mock translation (prepends language code)
 * - Receives payment after delivery
 *
 * Uses Level 1 Agent API for production-ready lifecycle management.
 */

import 'dotenv/config';
import { Agent } from '@agirails/sdk';

// Configuration from environment
const config = {
  network: (process.env.NETWORK || 'mock') as 'mock' | 'testnet' | 'mainnet',
  privateKey: process.env.PROVIDER_PRIVATE_KEY,
  rpcUrl: process.env.RPC_URL,
  logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
};

// Supported language pairs
const SUPPORTED_LANGUAGES = ['en', 'de', 'fr', 'es', 'hr'];

/**
 * Mock translation function
 * In production, this would call OpenAI, DeepL, or another translation API
 */
function mockTranslate(text: string, from: string, to: string): string {
  // Simple mock: prepend target language code
  return `[${to.toUpperCase()}] ${text}`;
}

/**
 * Check if language pair is supported
 */
function isLanguagePairSupported(from: string, to: string): boolean {
  return SUPPORTED_LANGUAGES.includes(from.toLowerCase()) &&
         SUPPORTED_LANGUAGES.includes(to.toLowerCase());
}

/**
 * Create and start the Translation Provider agent
 */
export async function createProvider(): Promise<Agent> {
  console.log('\n========================================');
  console.log('   AGIRAILS Translation Provider');
  console.log('========================================\n');

  // Validate configuration for non-mock networks
  if (config.network !== 'mock' && !config.privateKey) {
    throw new Error('PROVIDER_PRIVATE_KEY required for testnet/mainnet');
  }

  // Create agent
  const agent = new Agent({
    name: 'TranslationProvider',
    description: 'Professional translation service (EN/DE/FR/ES/HR)',
    network: config.network,
    wallet: config.privateKey ? { privateKey: config.privateKey } : 'auto',
    rpcUrl: config.rpcUrl,
    behavior: {
      autoAccept: true,
      concurrency: 5,
    },
    logging: {
      level: config.logLevel,
    },
  });

  // Register translation service
  agent.provide(
    {
      name: 'translation',
      description: 'Translate text between EN, DE, FR, ES, HR',
      filter: {
        minBudget: 0.50,   // Minimum $0.50 per job
        maxBudget: 100.00, // Maximum $100 per job
        custom: (job) => {
          // Only accept supported language pairs
          const { from, to } = job.input || {};
          if (!from || !to) return false;
          return isLanguagePairSupported(from, to);
        },
      },
      timeout: 30000, // 30 seconds per translation
    },
    async (job, ctx) => {
      const { text, from, to } = job.input;

      // Validate input
      if (!text || typeof text !== 'string') {
        throw new Error('Missing or invalid "text" field');
      }
      if (!from || !to) {
        throw new Error('Missing "from" or "to" language codes');
      }

      ctx.log.info(`Translating: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`);
      ctx.log.info(`Language: ${from.toUpperCase()} -> ${to.toUpperCase()}`);

      // Report progress
      ctx.progress(25, 'Validating input...');

      // Check language support
      if (!isLanguagePairSupported(from, to)) {
        throw new Error(`Unsupported language pair: ${from} -> ${to}`);
      }

      ctx.progress(50, 'Translating...');

      // Simulate translation delay (500-1500ms)
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      // Perform mock translation
      const translated = mockTranslate(text, from, to);

      ctx.progress(100, 'Translation complete');

      // Return result
      return {
        original: text,
        translated: translated,
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        characterCount: text.length,
        provider: 'TranslationProvider',
        timestamp: new Date().toISOString(),
      };
    }
  );

  // Event listeners
  agent.on('started', () => {
    console.log('Provider Status: RUNNING');
    console.log(`Address: ${agent.address}`);
    console.log(`Network: ${config.network}`);
    console.log(`Supported languages: ${SUPPORTED_LANGUAGES.join(', ').toUpperCase()}`);
    console.log('\nWaiting for translation jobs...\n');
  });

  agent.on('job:received', (job) => {
    console.log(`\n[JOB] Received: ${job.id.slice(0, 8)}...`);
    console.log(`      Budget: $${job.budget.toFixed(2)} USDC`);
    console.log(`      Service: ${job.service}`);
  });

  agent.on('job:completed', (job, result) => {
    console.log(`[JOB] Completed: ${job.id.slice(0, 8)}...`);
    console.log(`      Original: "${result.original.slice(0, 30)}${result.original.length > 30 ? '...' : ''}"`);
    console.log(`      Translated: "${result.translated.slice(0, 30)}${result.translated.length > 30 ? '...' : ''}"`);
  });

  agent.on('payment:received', (amount) => {
    console.log(`[PAYMENT] Received: $${amount.toFixed(2)} USDC`);
    console.log(`          Total earned: $${agent.stats.totalEarned.toFixed(2)} USDC`);
  });

  agent.on('job:failed', (job, error) => {
    console.error(`[ERROR] Job ${job.id.slice(0, 8)}... failed:`, (error as Error).message);
  });

  agent.on('error', (error) => {
    console.error('[ERROR]', (error as Error).message);
  });

  agent.on('stopped', () => {
    console.log('\nProvider Status: STOPPED');
    console.log('Final Statistics:');
    console.log(`  Jobs completed: ${agent.stats.jobsCompleted}`);
    console.log(`  Jobs failed: ${agent.stats.jobsFailed}`);
    console.log(`  Total earned: $${agent.stats.totalEarned.toFixed(2)} USDC`);
    console.log(`  Success rate: ${(agent.stats.successRate * 100).toFixed(1)}%`);
  });

  // Start the agent
  await agent.start();

  return agent;
}

// Main entry point (when run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = await createProvider();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await agent.stop();
    process.exit(0);
  });
}

export default createProvider;
