/**
 * Pattern: Concurrent Requests with Rate Limiting
 *
 * Demonstrates how to efficiently process multiple AGIRAILS requests
 * while respecting rate limits and managing concurrency.
 *
 * This example shows:
 * - Parallel request execution with concurrency limits
 * - Rate limiting (requests per second)
 * - Batch processing with progress tracking
 * - Graceful error handling in concurrent operations
 * - Semaphore-based concurrency control
 *
 * Run: npx ts-node patterns/concurrent-requests.ts
 */

import { provide, request } from '@agirails/sdk';
import { waitForProvider } from '../src/utils/helpers';

// =========================================================
// CONCURRENCY PRIMITIVES
// =========================================================

/**
 * Semaphore for limiting concurrent operations
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      next?.();
    } else {
      this.permits++;
    }
  }

  get available(): number {
    return this.permits;
  }
}

/**
 * Rate limiter using token bucket algorithm
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private tokensPerSecond: number,
    private maxTokens: number = tokensPerSecond
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.tokensPerSecond);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }

    // Wait until a token is available
    const waitTime = ((1 - this.tokens) / this.tokensPerSecond) * 1000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    this.tokens = 0;
    this.lastRefill = Date.now();
  }
}

// =========================================================
// CONCURRENT EXECUTION UTILITIES
// =========================================================

interface ConcurrentOptions {
  maxConcurrency: number;
  rateLimit?: number; // requests per second
  onProgress?: (completed: number, total: number) => void;
  onError?: (error: Error, index: number) => void;
}

/**
 * Execute tasks concurrently with limits
 */
async function concurrent<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  options: ConcurrentOptions
): Promise<Array<{ success: boolean; result?: R; error?: Error; index: number }>> {
  const semaphore = new Semaphore(options.maxConcurrency);
  const rateLimiter = options.rateLimit ? new RateLimiter(options.rateLimit) : null;

  let completed = 0;

  const results = await Promise.all(
    items.map(async (item, index) => {
      // Wait for rate limit
      if (rateLimiter) {
        await rateLimiter.acquire();
      }

      // Wait for concurrency slot
      await semaphore.acquire();

      try {
        const result = await fn(item, index);
        completed++;
        options.onProgress?.(completed, items.length);
        return { success: true, result, index };
      } catch (error: any) {
        completed++;
        options.onProgress?.(completed, items.length);
        options.onError?.(error, index);
        return { success: false, error, index };
      } finally {
        semaphore.release();
      }
    })
  );

  return results;
}

/**
 * Process items in batches
 */
async function batchProcess<T, R>(
  items: T[],
  fn: (batch: T[], batchIndex: number) => Promise<R[]>,
  batchSize: number
): Promise<R[]> {
  const results: R[] = [];
  const batches = Math.ceil(items.length / batchSize);

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, items.length);
    const batch = items.slice(start, end);

    console.log(`[Batch] Processing batch ${i + 1}/${batches} (${batch.length} items)`);
    const batchResults = await fn(batch, i);
    results.push(...batchResults);
  }

  return results;
}

// =========================================================
// AGIRAILS CONCURRENT WRAPPER
// =========================================================

interface AGIRAILSConcurrentRequest {
  service: string;
  input: any;
  budget: number;
}

interface AGIRAILSConcurrentOptions extends ConcurrentOptions {
  showProgress?: boolean;
}

/**
 * Execute multiple AGIRAILS requests concurrently
 */
async function requestConcurrent(
  requests: AGIRAILSConcurrentRequest[],
  options: AGIRAILSConcurrentOptions = { maxConcurrency: 5 }
) {
  const startTime = Date.now();

  console.log(`[Concurrent] Starting ${requests.length} requests...`);
  console.log(`[Concurrent] Max concurrency: ${options.maxConcurrency}`);
  if (options.rateLimit) {
    console.log(`[Concurrent] Rate limit: ${options.rateLimit} req/s`);
  }
  console.log('');

  const results = await concurrent(
    requests,
    async (req, index) => {
      const { result, transaction } = await request(req.service, {
        input: req.input,
        budget: req.budget,
      });
      return { result, transaction };
    },
    {
      ...options,
      onProgress: options.showProgress
        ? (completed, total) => {
            const pct = Math.round((completed / total) * 100);
            process.stdout.write(`\r[Progress] ${completed}/${total} (${pct}%)`);
          }
        : undefined,
    }
  );

  if (options.showProgress) {
    console.log(''); // New line after progress
  }

  const elapsed = Date.now() - startTime;
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log('');
  console.log(`[Concurrent] Completed in ${elapsed}ms`);
  console.log(`[Concurrent] Success: ${successful}, Failed: ${failed}`);

  return results;
}

// =========================================================
// DEMO PROVIDERS
// =========================================================

async function startDemoProviders() {
  let processCount = 0;

  const textProvider = provide('text-process', async (job) => {
    processCount++;
    const { text } = job.input as { text: string };

    // Simulate varying processing times
    const delay = 100 + Math.random() * 200;
    await new Promise((r) => setTimeout(r, delay));

    return {
      original: text,
      processed: text.toUpperCase(),
      wordCount: text.split(' ').length,
      processId: processCount,
    };
  });

  const analyzeProvider = provide('data-analyze', async (job) => {
    const { data } = job.input as { data: number[] };

    await new Promise((r) => setTimeout(r, 150));

    return {
      min: Math.min(...data),
      max: Math.max(...data),
      avg: data.reduce((a, b) => a + b, 0) / data.length,
      sum: data.reduce((a, b) => a + b, 0),
    };
  });

  await Promise.all([waitForProvider(textProvider), waitForProvider(analyzeProvider)]);

  return {
    stop: async () => {
      await textProvider.stop();
      await analyzeProvider.stop();
    },
  };
}

// =========================================================
// DEMO
// =========================================================

async function main() {
  console.log('='.repeat(60));
  console.log('AGIRAILS Pattern: Concurrent Requests');
  console.log('='.repeat(60));
  console.log('');

  const providers = await startDemoProviders();

  try {
    // Demo 1: Simple concurrent requests
    console.log('--- Demo 1: Parallel Text Processing ---\n');

    const texts = [
      'Hello world',
      'AGIRAILS is awesome',
      'Concurrent processing',
      'Rate limiting',
      'Token bucket algorithm',
      'Semaphore pattern',
      'Parallel execution',
      'Batch processing',
    ];

    const requests = texts.map((text) => ({
      service: 'text-process',
      input: { text },
      budget: 0.1,
    }));

    const results1 = await requestConcurrent(requests, {
      maxConcurrency: 3,
      showProgress: true,
    });

    console.log('\nResults:');
    results1.slice(0, 3).forEach((r) => {
      if (r.success && r.result?.result !== undefined) {
        const res = r.result.result;
        console.log(`  ${res.original} -> ${res.processed}`);
      }
    });
    console.log('  ...\n');

    // Demo 2: Rate-limited requests
    console.log('--- Demo 2: Rate-Limited Requests ---\n');

    const dataRequests = Array.from({ length: 10 }, (_, i) => ({
      service: 'data-analyze',
      input: { data: Array.from({ length: 5 }, () => Math.random() * 100) },
      budget: 0.05,
    }));

    const startTime = Date.now();
    const results2 = await requestConcurrent(dataRequests, {
      maxConcurrency: 5,
      rateLimit: 3, // 3 requests per second
      showProgress: true,
    });

    console.log(`\nWith rate limit, ${results2.length} requests took ${Date.now() - startTime}ms`);
    console.log('(Without rate limit it would be ~300ms)\n');

    // Demo 3: Batch processing
    console.log('--- Demo 3: Batch Processing ---\n');

    const items = Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`);

    await batchProcess(
      items,
      async (batch, batchIndex) => {
        console.log(`  Processing: ${batch.join(', ')}`);
        await new Promise((r) => setTimeout(r, 200));
        return batch.map((item) => ({ item, processed: true }));
      },
      4
    );

    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('Summary: Concurrency Patterns');
    console.log('='.repeat(60));
    console.log('');
    console.log('1. Semaphore: Limit concurrent operations');
    console.log('   new Semaphore(5) -> max 5 concurrent');
    console.log('');
    console.log('2. RateLimiter: Control requests per second');
    console.log('   new RateLimiter(10) -> max 10 req/s');
    console.log('');
    console.log('3. concurrent(): Execute with both limits');
    console.log('   await concurrent(items, fn, { maxConcurrency: 5, rateLimit: 10 })');
    console.log('');
    console.log('4. batchProcess(): Process in batches');
    console.log('   await batchProcess(items, fn, batchSize: 100)');
    console.log('');
    console.log('Best Practices:');
    console.log('  - Use concurrency limits to avoid overwhelming providers');
    console.log('  - Use rate limits to respect API quotas');
    console.log('  - Track progress for long-running batch jobs');
    console.log('  - Handle errors gracefully (one failure != all fail)');
    console.log('');
  } finally {
    await providers.stop();
  }
}

main().catch(console.error);
