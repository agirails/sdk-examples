/**
 * Translation Client Agent
 *
 * A demonstration of an AGIRAILS client agent that:
 * - Requests translation services from providers
 * - Pays for services via ACTP escrow
 * - Receives translated results
 *
 * Uses Level 1 Agent API for requesting services.
 */

import 'dotenv/config';
import { Agent } from '@agirails/sdk';

// Configuration from environment
const config = {
  network: (process.env.NETWORK || 'mock') as 'mock' | 'testnet' | 'mainnet',
  privateKey: process.env.CLIENT_PRIVATE_KEY,
  rpcUrl: process.env.RPC_URL,
  logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
};

/**
 * Translation request parameters
 */
export interface TranslationRequest {
  text: string;
  from: string;
  to: string;
  budget?: number;
  providerAddress?: string;
}

/**
 * Translation result
 */
export interface TranslationResult {
  original: string;
  translated: string;
  from: string;
  to: string;
  characterCount: number;
  provider: string;
  timestamp: string;
}

/**
 * Translation Client class
 */
export class TranslationClient {
  private agent: Agent;
  private started = false;

  constructor(options?: {
    network?: 'mock' | 'testnet' | 'mainnet';
    privateKey?: string;
  }) {
    const network = options?.network || config.network;
    const privateKey = options?.privateKey || config.privateKey;

    // Validate configuration for non-mock networks
    if (network !== 'mock' && !privateKey) {
      throw new Error('CLIENT_PRIVATE_KEY required for testnet/mainnet');
    }

    this.agent = new Agent({
      name: 'TranslationClient',
      description: 'Client requesting translation services',
      network,
      wallet: privateKey ? { privateKey } : 'auto',
      rpcUrl: config.rpcUrl,
      logging: {
        level: config.logLevel,
      },
    });
  }

  /**
   * Start the client agent
   */
  async start(): Promise<void> {
    if (this.started) return;

    await this.agent.start();
    this.started = true;

    console.log('\n========================================');
    console.log('   AGIRAILS Translation Client');
    console.log('========================================\n');
    console.log(`Address: ${this.agent.address}`);
    console.log(`Network: ${config.network}`);
    console.log(`Balance: $${this.agent.balance.usdc} USDC`);
    console.log('');
  }

  /**
   * Request a translation
   */
  async translate(params: TranslationRequest): Promise<TranslationResult> {
    if (!this.started) {
      await this.start();
    }

    const budget = params.budget || this.estimateBudget(params.text);

    console.log(`[REQUEST] Translation: "${params.text.slice(0, 40)}${params.text.length > 40 ? '...' : ''}"`);
    console.log(`          ${params.from.toUpperCase()} -> ${params.to.toUpperCase()}`);
    console.log(`          Budget: $${budget.toFixed(2)} USDC`);

    const result = await this.agent.request('translation', {
      input: {
        text: params.text,
        from: params.from,
        to: params.to,
      },
      budget,
      provider: params.providerAddress,
      timeout: 60000, // 60 seconds timeout
      onProgress: (status) => {
        if (status.progress !== undefined) {
          console.log(`          Progress: ${status.progress}% - ${status.message || status.state}`);
        }
      },
    });

    const translationResult = result.result as TranslationResult;

    console.log(`[RESULT]  Translated: "${translationResult.translated.slice(0, 40)}${translationResult.translated.length > 40 ? '...' : ''}"`);
    console.log(`          Cost: $${result.cost?.toFixed(2) || budget.toFixed(2)} USDC\n`);

    return translationResult;
  }

  /**
   * Estimate budget based on text length
   * Simple pricing: $0.50 base + $0.001 per character
   */
  private estimateBudget(text: string): number {
    const baseCost = 0.50;
    const perCharacter = 0.001;
    const estimated = baseCost + text.length * perCharacter;
    // Add 30% buffer for provider margin
    return Math.ceil(estimated * 1.3 * 100) / 100;
  }

  /**
   * Get current balance
   */
  get balance(): { usdc: string } {
    return { usdc: this.agent.balance.usdc };
  }

  /**
   * Get agent address
   */
  get address(): string {
    return this.agent.address;
  }

  /**
   * Stop the client agent
   */
  async stop(): Promise<void> {
    if (!this.started) return;
    await this.agent.stop();
    this.started = false;
    console.log('Client stopped.');
  }
}

/**
 * Create and start a translation client
 */
export async function createClient(): Promise<TranslationClient> {
  const client = new TranslationClient();
  await client.start();
  return client;
}

// Main entry point (when run directly with interactive mode)
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = await createClient();

  // Example translations
  const examples = [
    { text: 'Hello, world!', from: 'en', to: 'de' },
    { text: 'Good morning', from: 'en', to: 'fr' },
    { text: 'Thank you very much', from: 'en', to: 'es' },
  ];

  console.log('Running example translations...\n');

  for (const example of examples) {
    try {
      await client.translate(example);
    } catch (error) {
      console.error(`Translation failed: ${(error as Error).message}`);
    }
  }

  await client.stop();
}

export default TranslationClient;
