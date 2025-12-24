/**
 * Pattern: Provider Discovery and Selection
 *
 * Demonstrates how to discover, filter, and select providers
 * based on various criteria like price, reputation, and capabilities.
 *
 * This example shows:
 * - Discovering available providers for a service
 * - Filtering by price, reputation, capabilities
 * - Selection strategies (cheapest, best, fastest)
 * - Provider health checking
 * - Fallback provider chains
 *
 * Note: This example uses mock provider registry.
 * In production, this would query on-chain data.
 *
 * Run: npx ts-node patterns/provider-discovery.ts
 */

import { provide, request } from '@agirails/sdk';
import { waitForProvider } from '../src/utils/helpers';

// =========================================================
// TYPES
// =========================================================

interface ProviderInfo {
  address: string;
  service: string;
  price: number; // USDC per request
  reputation: number; // 0-100 score
  responseTimeMs: number; // Average response time
  capabilities: string[];
  availability: number; // 0-1 uptime ratio
  totalJobs: number;
  successRate: number; // 0-1
}

interface ProviderFilter {
  service: string;
  maxPrice?: number;
  minReputation?: number;
  maxResponseTime?: number;
  requiredCapabilities?: string[];
  minAvailability?: number;
  minSuccessRate?: number;
}

type SelectionStrategy = 'cheapest' | 'best' | 'fastest' | 'balanced';

// =========================================================
// MOCK PROVIDER REGISTRY
// =========================================================

/**
 * Simulated provider registry
 * In production, this would query blockchain/subgraph
 */
class ProviderRegistry {
  private providers: ProviderInfo[] = [
    {
      address: '0xProvider1...AAA',
      service: 'translation',
      price: 0.10,
      reputation: 95,
      responseTimeMs: 200,
      capabilities: ['en', 'de', 'fr', 'es'],
      availability: 0.99,
      totalJobs: 10000,
      successRate: 0.98,
    },
    {
      address: '0xProvider2...BBB',
      service: 'translation',
      price: 0.05,
      reputation: 75,
      responseTimeMs: 500,
      capabilities: ['en', 'de'],
      availability: 0.95,
      totalJobs: 500,
      successRate: 0.90,
    },
    {
      address: '0xProvider3...CCC',
      service: 'translation',
      price: 0.15,
      reputation: 90,
      responseTimeMs: 150,
      capabilities: ['en', 'de', 'fr', 'es', 'ja', 'zh'],
      availability: 0.999,
      totalJobs: 50000,
      successRate: 0.99,
    },
    {
      address: '0xProvider4...DDD',
      service: 'image-gen',
      price: 0.50,
      reputation: 88,
      responseTimeMs: 3000,
      capabilities: ['realistic', 'anime', 'abstract'],
      availability: 0.97,
      totalJobs: 8000,
      successRate: 0.95,
    },
    {
      address: '0xProvider5...EEE',
      service: 'image-gen',
      price: 0.25,
      reputation: 70,
      responseTimeMs: 5000,
      capabilities: ['realistic'],
      availability: 0.90,
      totalJobs: 200,
      successRate: 0.85,
    },
  ];

  /**
   * Get all providers for a service
   */
  async getProviders(service: string): Promise<ProviderInfo[]> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 50));
    return this.providers.filter((p) => p.service === service);
  }

  /**
   * Get provider by address
   */
  async getProvider(address: string): Promise<ProviderInfo | null> {
    await new Promise((r) => setTimeout(r, 20));
    return this.providers.find((p) => p.address === address) || null;
  }
}

// =========================================================
// PROVIDER DISCOVERY
// =========================================================

class ProviderDiscovery {
  constructor(private registry: ProviderRegistry) {}

  /**
   * Discover providers matching filter criteria
   */
  async discover(filter: ProviderFilter): Promise<ProviderInfo[]> {
    console.log(`[Discovery] Searching for '${filter.service}' providers...`);

    // Get all providers for service
    let providers = await this.registry.getProviders(filter.service);
    console.log(`[Discovery] Found ${providers.length} providers`);

    // Apply filters
    if (filter.maxPrice !== undefined) {
      providers = providers.filter((p) => p.price <= filter.maxPrice!);
      console.log(`[Discovery] After price filter: ${providers.length}`);
    }

    if (filter.minReputation !== undefined) {
      providers = providers.filter((p) => p.reputation >= filter.minReputation!);
      console.log(`[Discovery] After reputation filter: ${providers.length}`);
    }

    if (filter.maxResponseTime !== undefined) {
      providers = providers.filter((p) => p.responseTimeMs <= filter.maxResponseTime!);
      console.log(`[Discovery] After response time filter: ${providers.length}`);
    }

    if (filter.requiredCapabilities?.length) {
      providers = providers.filter((p) =>
        filter.requiredCapabilities!.every((cap) => p.capabilities.includes(cap))
      );
      console.log(`[Discovery] After capabilities filter: ${providers.length}`);
    }

    if (filter.minAvailability !== undefined) {
      providers = providers.filter((p) => p.availability >= filter.minAvailability!);
      console.log(`[Discovery] After availability filter: ${providers.length}`);
    }

    if (filter.minSuccessRate !== undefined) {
      providers = providers.filter((p) => p.successRate >= filter.minSuccessRate!);
      console.log(`[Discovery] After success rate filter: ${providers.length}`);
    }

    return providers;
  }

  /**
   * Select best provider based on strategy
   */
  selectBest(providers: ProviderInfo[], strategy: SelectionStrategy): ProviderInfo | null {
    if (providers.length === 0) return null;

    console.log(`[Selection] Using '${strategy}' strategy...`);

    switch (strategy) {
      case 'cheapest':
        return providers.sort((a, b) => a.price - b.price)[0];

      case 'best':
        // Weighted score: reputation (40%) + success rate (40%) + availability (20%)
        return providers.sort((a, b) => {
          const scoreA = a.reputation * 0.4 + a.successRate * 100 * 0.4 + a.availability * 100 * 0.2;
          const scoreB = b.reputation * 0.4 + b.successRate * 100 * 0.4 + b.availability * 100 * 0.2;
          return scoreB - scoreA;
        })[0];

      case 'fastest':
        return providers.sort((a, b) => a.responseTimeMs - b.responseTimeMs)[0];

      case 'balanced':
        // Balance of price, quality, and speed
        return providers.sort((a, b) => {
          // Normalize each metric to 0-1 (lower is better for ranking)
          const priceScoreA = a.price / 1; // Assume max price $1
          const priceScoreB = b.price / 1;
          const qualityScoreA = 1 - a.reputation / 100;
          const qualityScoreB = 1 - b.reputation / 100;
          const speedScoreA = a.responseTimeMs / 5000; // Assume max 5s
          const speedScoreB = b.responseTimeMs / 5000;

          const totalA = priceScoreA * 0.33 + qualityScoreA * 0.33 + speedScoreA * 0.33;
          const totalB = priceScoreB * 0.33 + qualityScoreB * 0.33 + speedScoreB * 0.33;
          return totalA - totalB;
        })[0];

      default:
        return providers[0];
    }
  }

  /**
   * Check if provider is healthy
   */
  async checkHealth(provider: ProviderInfo): Promise<boolean> {
    console.log(`[Health] Checking ${provider.address.substring(0, 15)}...`);

    // Simulate health check (ping or test request)
    await new Promise((r) => setTimeout(r, 100));

    // Simulate 95% success rate for health checks
    const healthy = Math.random() > 0.05;
    console.log(`[Health] ${healthy ? 'Healthy' : 'Unhealthy'}`);
    return healthy;
  }
}

// =========================================================
// PROVIDER SELECTION WRAPPER
// =========================================================

interface SmartRequestOptions {
  service: string;
  input: any;
  budget: number;
  filter?: Partial<ProviderFilter>;
  strategy?: SelectionStrategy;
  fallbackStrategies?: SelectionStrategy[];
  healthCheck?: boolean;
}

/**
 * Make a request with smart provider selection
 */
async function smartRequest(
  discovery: ProviderDiscovery,
  options: SmartRequestOptions
) {
  const filter: ProviderFilter = {
    service: options.service,
    maxPrice: options.budget,
    ...options.filter,
  };

  // Discover providers
  const providers = await discovery.discover(filter);

  if (providers.length === 0) {
    throw new Error(`No providers found for '${options.service}' matching criteria`);
  }

  // Try strategies in order
  const strategies = [
    options.strategy || 'balanced',
    ...(options.fallbackStrategies || []),
  ];

  for (const strategy of strategies) {
    const selected = discovery.selectBest(providers, strategy);
    if (!selected) continue;

    console.log(`[Smart] Selected: ${selected.address.substring(0, 15)}... ($${selected.price})`);

    // Health check if enabled
    if (options.healthCheck) {
      const healthy = await discovery.checkHealth(selected);
      if (!healthy) {
        console.log(`[Smart] Provider unhealthy, trying next...`);
        // Remove from providers and try again
        const index = providers.indexOf(selected);
        if (index > -1) providers.splice(index, 1);
        continue;
      }
    }

    // Make request
    try {
      const { result, transaction } = await request(options.service, {
        input: options.input,
        budget: options.budget,
        // provider: selected.address, // Note: Provider selection would be used in production SDK
      });

      return {
        result,
        transaction,
        provider: selected,
      };
    } catch (error) {
      console.log(`[Smart] Request failed, trying next provider...`);
      const index = providers.indexOf(selected);
      if (index > -1) providers.splice(index, 1);
    }
  }

  throw new Error('All providers failed');
}

// =========================================================
// DEMO PROVIDERS
// =========================================================

async function startDemoProviders() {
  const translationProvider = provide('translation', async (job) => {
    const { text, targetLang } = job.input as { text: string; targetLang: string };
    await new Promise((r) => setTimeout(r, 200));
    return {
      original: text,
      translated: `[${targetLang.toUpperCase()}] ${text}`,
      targetLang,
    };
  });

  const imageGenProvider = provide('image-gen', async (job) => {
    const { prompt, style } = job.input as { prompt: string; style: string };
    await new Promise((r) => setTimeout(r, 500));
    return {
      prompt,
      style,
      imageUrl: `https://generated.example.com/${Date.now()}.png`,
      resolution: '1024x1024',
    };
  });

  await Promise.all([waitForProvider(translationProvider), waitForProvider(imageGenProvider)]);

  return {
    stop: async () => {
      await translationProvider.stop();
      await imageGenProvider.stop();
    },
  };
}

// =========================================================
// DEMO
// =========================================================

async function main() {
  console.log('='.repeat(60));
  console.log('AGIRAILS Pattern: Provider Discovery');
  console.log('='.repeat(60));
  console.log('');

  const registry = new ProviderRegistry();
  const discovery = new ProviderDiscovery(registry);
  const providers = await startDemoProviders();

  try {
    // Demo 1: Basic discovery
    console.log('--- Demo 1: Basic Provider Discovery ---\n');

    const translationProviders = await discovery.discover({
      service: 'translation',
    });

    console.log('\nAvailable translation providers:');
    translationProviders.forEach((p) => {
      console.log(`  ${p.address.substring(0, 15)}... | $${p.price} | Rep: ${p.reputation} | ${p.responseTimeMs}ms`);
    });
    console.log('');

    // Demo 2: Filtered discovery
    console.log('--- Demo 2: Filtered Discovery ---\n');

    const filteredProviders = await discovery.discover({
      service: 'translation',
      maxPrice: 0.12,
      minReputation: 80,
      requiredCapabilities: ['en', 'de', 'fr'],
    });

    console.log('\nFiltered providers (max $0.12, rep >= 80, supports en/de/fr):');
    filteredProviders.forEach((p) => {
      console.log(`  ${p.address.substring(0, 15)}... | $${p.price} | Rep: ${p.reputation}`);
      console.log(`    Caps: ${p.capabilities.join(', ')}`);
    });
    console.log('');

    // Demo 3: Selection strategies
    console.log('--- Demo 3: Selection Strategies ---\n');

    const allProviders = await discovery.discover({ service: 'translation' });

    const strategies: SelectionStrategy[] = ['cheapest', 'best', 'fastest', 'balanced'];
    for (const strategy of strategies) {
      const selected = discovery.selectBest(allProviders, strategy);
      if (selected) {
        console.log(`  ${strategy.toUpperCase()}: ${selected.address.substring(0, 15)}... ($${selected.price}, rep: ${selected.reputation}, ${selected.responseTimeMs}ms)`);
      }
    }
    console.log('');

    // Demo 4: Smart request with fallback
    console.log('--- Demo 4: Smart Request with Fallback ---\n');

    const result = await smartRequest(discovery, {
      service: 'translation',
      input: { text: 'Hello, world!', targetLang: 'de' },
      budget: 0.20,
      filter: { minReputation: 70 },
      strategy: 'best',
      fallbackStrategies: ['balanced', 'cheapest'],
      healthCheck: true,
    });

    console.log('\nResult:');
    console.log(`  Provider: ${result.provider.address.substring(0, 15)}...`);
    console.log(`  Price: $${result.provider.price}`);
    console.log(`  Translation: ${result.result?.translated || result.result}`);
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('Summary: Provider Discovery Patterns');
    console.log('='.repeat(60));
    console.log('');
    console.log('1. ProviderRegistry: Query available providers');
    console.log('   await registry.getProviders("service")');
    console.log('');
    console.log('2. ProviderDiscovery.discover(): Filter by criteria');
    console.log('   { maxPrice, minReputation, requiredCapabilities, ... }');
    console.log('');
    console.log('3. Selection strategies:');
    console.log('   - cheapest: Lowest price');
    console.log('   - best: Highest reputation + success rate');
    console.log('   - fastest: Lowest response time');
    console.log('   - balanced: Weighted combination');
    console.log('');
    console.log('4. smartRequest(): Auto-select with fallback');
    console.log('   Tries multiple strategies, skips unhealthy providers');
    console.log('');
    console.log('Best Practices:');
    console.log('  - Cache provider data (update periodically)');
    console.log('  - Health check before critical requests');
    console.log('  - Use fallback strategies for resilience');
    console.log('  - Consider provider specialization (capabilities)');
    console.log('');
  } finally {
    await providers.stop();
  }
}

main().catch(console.error);
