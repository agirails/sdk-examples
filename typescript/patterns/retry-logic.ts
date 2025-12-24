/**
 * Pattern: Retry Logic with Exponential Backoff
 *
 * Demonstrates robust error handling and retry patterns for AGIRAILS requests.
 *
 * Production services need to handle:
 * - Network failures
 * - Provider timeouts
 * - Temporary unavailability
 * - Rate limiting
 *
 * This example shows:
 * - Exponential backoff with jitter
 * - Retry classification (retryable vs non-retryable errors)
 * - Circuit breaker pattern
 * - Comprehensive error handling
 *
 * Run: npx ts-node patterns/retry-logic.ts
 */

import { provide, request } from '@agirails/sdk';
import { waitForProvider } from '../src/utils/helpers';

// =========================================================
// CONFIGURATION
// =========================================================

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number; // 0-1, adds randomness to prevent thundering herd
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.3,
};

// =========================================================
// ERROR CLASSIFICATION
// =========================================================

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any): boolean {
  const errorMessage = String(error.message || error);

  // Network errors - always retry
  if (
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('network')
  ) {
    return true;
  }

  // Timeout errors - retry
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return true;
  }

  // Rate limiting - retry with backoff
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('429') ||
    errorMessage.includes('too many requests')
  ) {
    return true;
  }

  // Provider temporarily unavailable - retry
  if (
    errorMessage.includes('service unavailable') ||
    errorMessage.includes('503') ||
    errorMessage.includes('temporarily')
  ) {
    return true;
  }

  // Non-retryable errors
  if (
    errorMessage.includes('invalid input') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('insufficient funds') ||
    errorMessage.includes('budget exceeded')
  ) {
    return false;
  }

  // Default: don't retry unknown errors
  return false;
}

// =========================================================
// RETRY UTILITIES
// =========================================================

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: 2^attempt * baseDelay
  const exponentialDelay = Math.pow(2, attempt) * config.baseDelayMs;

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFactor * Math.random();

  return cappedDelay + jitter;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =========================================================
// CORE RETRY WRAPPER
// =========================================================

interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTimeMs: number;
}

/**
 * Execute a function with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`  [Retry] Attempt ${attempt + 1}/${config.maxRetries + 1} for ${operationName}`);
      }

      const result = await fn();

      return {
        success: true,
        result,
        attempts: attempt + 1,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      lastError = error;

      console.log(`  [Error] ${operationName}: ${error.message}`);

      // Check if error is retryable
      if (!isRetryableError(error)) {
        console.log(`  [Retry] Error is not retryable, giving up`);
        break;
      }

      // Check if we have retries left
      if (attempt >= config.maxRetries) {
        console.log(`  [Retry] Max retries (${config.maxRetries}) exceeded`);
        break;
      }

      // Calculate and apply delay
      const delay = calculateDelay(attempt, config);
      console.log(`  [Retry] Waiting ${Math.round(delay)}ms before retry...`);
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: config.maxRetries + 1,
    totalTimeMs: Date.now() - startTime,
  };
}

// =========================================================
// AGIRAILS-SPECIFIC RETRY WRAPPER
// =========================================================

interface AGIRAILSRequestOptions {
  service: string;
  input: any;
  budget: number;
  retryConfig?: RetryConfig;
}

/**
 * Make an AGIRAILS request with automatic retry
 */
async function requestWithRetry(options: AGIRAILSRequestOptions) {
  const config = options.retryConfig || DEFAULT_RETRY_CONFIG;

  console.log(`[Request] Starting ${options.service} request with retry...`);

  const result = await withRetry(
    async () => {
      const { result, transaction } = await request(options.service, {
        input: options.input,
        budget: options.budget,
      });
      return { result, transaction };
    },
    config,
    options.service
  );

  if (result.success) {
    console.log(`[Request] Success after ${result.attempts} attempt(s) (${result.totalTimeMs}ms)`);
  } else {
    console.log(`[Request] Failed after ${result.attempts} attempts (${result.totalTimeMs}ms)`);
  }

  return result;
}

// =========================================================
// CIRCUIT BREAKER PATTERN
// =========================================================

interface CircuitBreakerConfig {
  failureThreshold: number; // Failures before opening circuit
  resetTimeMs: number; // Time before trying again
}

class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private isOpen: boolean = false;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.isOpen) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;

      if (timeSinceFailure < this.config.resetTimeMs) {
        throw new Error(`Circuit breaker '${this.name}' is open. Try again in ${Math.round((this.config.resetTimeMs - timeSinceFailure) / 1000)}s`);
      }

      // Try to close circuit (half-open state)
      console.log(`[CircuitBreaker] ${this.name}: Attempting reset (half-open)`);
    }

    try {
      const result = await fn();

      // Success: reset circuit
      this.failures = 0;
      this.isOpen = false;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.config.failureThreshold) {
        this.isOpen = true;
        console.log(`[CircuitBreaker] ${this.name}: Circuit OPEN after ${this.failures} failures`);
      }

      throw error;
    }
  }

  getStatus(): string {
    return this.isOpen ? 'open' : 'closed';
  }
}

// =========================================================
// DEMO PROVIDERS
// =========================================================

async function startDemoProviders() {
  // Unreliable provider (fails sometimes)
  let requestCount = 0;
  const unreliableProvider = provide('unreliable-service', async (job) => {
    requestCount++;
    console.log(`[Unreliable] Request #${requestCount}`);

    // Fail 60% of the time for first 3 requests
    if (requestCount <= 3 && Math.random() < 0.6) {
      throw new Error('service unavailable - temporary failure');
    }

    await new Promise((r) => setTimeout(r, 200));
    return { message: 'Success!', requestNumber: requestCount };
  });

  // Reliable provider
  const reliableProvider = provide('reliable-service', async (job) => {
    await new Promise((r) => setTimeout(r, 100));
    return { status: 'ok', input: job.input };
  });

  await Promise.all([waitForProvider(unreliableProvider), waitForProvider(reliableProvider)]);

  return {
    stop: async () => {
      await unreliableProvider.stop();
      await reliableProvider.stop();
    },
  };
}

// =========================================================
// DEMO
// =========================================================

async function main() {
  console.log('='.repeat(60));
  console.log('AGIRAILS Pattern: Retry Logic');
  console.log('='.repeat(60));
  console.log('');

  const providers = await startDemoProviders();

  try {
    // Demo 1: Request with retry
    console.log('--- Demo 1: Request with Retry ---\n');

    const result1 = await requestWithRetry({
      service: 'unreliable-service',
      input: { test: 'data' },
      budget: 1.0,
      retryConfig: {
        maxRetries: 5,
        baseDelayMs: 500,
        maxDelayMs: 5000,
        jitterFactor: 0.2,
      },
    });

    if (result1.success) {
      console.log('Result:', result1.result);
    }
    console.log('');

    // Demo 2: Circuit Breaker
    console.log('--- Demo 2: Circuit Breaker ---\n');

    const breaker = new CircuitBreaker('unreliable', {
      failureThreshold: 3,
      resetTimeMs: 5000,
    });

    for (let i = 0; i < 5; i++) {
      try {
        const result = await breaker.execute(async () => {
          // Simulate 70% failure rate
          if (Math.random() < 0.7) {
            throw new Error('Service error');
          }
          return { success: true, attempt: i + 1 };
        });
        console.log(`Attempt ${i + 1}: Success`, result);
      } catch (error: any) {
        console.log(`Attempt ${i + 1}: Failed - ${error.message}`);
      }

      await sleep(500);
    }
    console.log('');

    // Demo 3: Reliable service (no retries needed)
    console.log('--- Demo 3: Reliable Service ---\n');

    const result3 = await requestWithRetry({
      service: 'reliable-service',
      input: { message: 'Hello!' },
      budget: 0.5,
    });

    console.log('Result:', result3.result);
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('Summary: Retry Patterns');
    console.log('='.repeat(60));
    console.log('');
    console.log('1. withRetry(): Generic retry wrapper with exponential backoff');
    console.log('2. requestWithRetry(): AGIRAILS-specific retry wrapper');
    console.log('3. CircuitBreaker: Prevents cascading failures');
    console.log('4. isRetryableError(): Classify errors for retry decisions');
    console.log('');
    console.log('Best Practices:');
    console.log('  - Always use exponential backoff (not fixed delays)');
    console.log('  - Add jitter to prevent thundering herd');
    console.log('  - Classify errors: some are retryable, some are not');
    console.log('  - Use circuit breakers for external dependencies');
    console.log('  - Log retry attempts for debugging');
    console.log('');
  } finally {
    await providers.stop();
  }
}

main().catch(console.error);
