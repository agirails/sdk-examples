# Production Patterns

Production-ready patterns for building robust AGIRAILS applications.

## Examples

### 1. Retry Logic (`retry-logic.ts`)

Robust error handling with exponential backoff.

```bash
npx ts-node patterns/retry-logic.ts
```

**Key Patterns:**

```typescript
// Exponential backoff with jitter
const result = await withRetry(
  () => request('service', { input, budget }),
  {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    jitterFactor: 0.3,
  }
);

// Circuit breaker
const breaker = new CircuitBreaker('my-service', {
  failureThreshold: 5,
  resetTimeMs: 30000,
});
await breaker.execute(() => request(...));
```

**When to Use:**
- Unreliable network connections
- Providers with occasional failures
- Rate-limited APIs
- Any production deployment

---

### 2. Concurrent Requests (`concurrent-requests.ts`)

Parallel execution with rate limiting.

```bash
npx ts-node patterns/concurrent-requests.ts
```

**Key Patterns:**

```typescript
// Parallel with concurrency limit
const results = await concurrent(
  items,
  (item) => processItem(item),
  { maxConcurrency: 5 }
);

// With rate limiting
const results = await concurrent(items, processItem, {
  maxConcurrency: 10,
  rateLimit: 5, // 5 requests per second
});

// Batch processing
await batchProcess(items, processBatch, 100);
```

**When to Use:**
- Processing large datasets
- Bulk operations (translations, analysis)
- Respecting API rate limits
- Progress tracking for long jobs

---

### 3. Provider Discovery (`provider-discovery.ts`)

Find and select the best providers.

```bash
npx ts-node patterns/provider-discovery.ts
```

**Key Patterns:**

```typescript
// Discover with filters
const providers = await discovery.discover({
  service: 'translation',
  maxPrice: 0.20,
  minReputation: 80,
  requiredCapabilities: ['en', 'de'],
});

// Selection strategies
const best = discovery.selectBest(providers, 'best');     // Highest quality
const cheap = discovery.selectBest(providers, 'cheapest'); // Lowest price
const fast = discovery.selectBest(providers, 'fastest');   // Quickest response

// Smart request with fallback
const result = await smartRequest(discovery, {
  service: 'translation',
  input: { text: 'Hello', targetLang: 'de' },
  budget: 1.0,
  strategy: 'best',
  fallbackStrategies: ['balanced', 'cheapest'],
  healthCheck: true,
});
```

**When to Use:**
- Multi-provider environments
- Cost optimization
- Quality requirements
- High availability needs

---

## Pattern Combinations

### High-Reliability Production Setup

> **Note**: The pattern files are standalone runnable examples. To use these patterns
> in your own code, copy the relevant classes/functions from each file into your project.

```typescript
// Copy these from the pattern files into your project:
// - withRetry, CircuitBreaker from retry-logic.ts
// - concurrent from concurrent-requests.ts
// - smartRequest, ProviderDiscovery from provider-discovery.ts

// Combine all patterns
async function robustBatchProcess(items: any[]) {
  const discovery = new ProviderDiscovery(registry);
  const breaker = new CircuitBreaker('batch-process', {
    failureThreshold: 5,
    resetTimeMs: 60000,
  });

  return concurrent(
    items,
    async (item) => {
      return breaker.execute(() =>
        withRetry(
          () => smartRequest(discovery, {
            service: 'process',
            input: item,
            budget: 1.0,
            strategy: 'balanced',
            healthCheck: true,
          }),
          { maxRetries: 3 }
        )
      );
    },
    {
      maxConcurrency: 10,
      rateLimit: 5,
      onProgress: (done, total) => console.log(`${done}/${total}`),
    }
  );
}
```

---

## Quick Reference

| Pattern | Problem | Solution |
|---------|---------|----------|
| **Retry** | Transient failures | Exponential backoff + jitter |
| **Circuit Breaker** | Cascading failures | Fail fast after threshold |
| **Semaphore** | Too many concurrent requests | Limit active operations |
| **Rate Limiter** | API quotas | Token bucket algorithm |
| **Batch Processing** | Large datasets | Process in chunks |
| **Provider Discovery** | Finding best provider | Filter + select strategy |
| **Health Check** | Unhealthy providers | Ping before request |
| **Fallback Chain** | Primary fails | Try alternative strategies |

---

## Error Classification

```typescript
// Retryable errors (try again)
- Network timeout
- Connection refused
- 503 Service Unavailable
- 429 Too Many Requests
- "temporary" in message

// Non-retryable errors (fail fast)
- Invalid input
- Unauthorized
- Insufficient funds
- Budget exceeded
- 400 Bad Request
```

---

## Monitoring Recommendations

```typescript
// Track these metrics
const metrics = {
  requestCount: 0,
  successCount: 0,
  failureCount: 0,
  retryCount: 0,
  totalLatencyMs: 0,
  totalCostUsd: 0,
  circuitBreakerTrips: 0,
};

// Alert thresholds
const alerts = {
  successRate: 0.95,      // Alert if < 95%
  avgLatencyMs: 5000,     // Alert if > 5s
  circuitOpen: true,      // Alert immediately
  budgetUsed: 0.80,       // Alert at 80% budget
};
```

---

## Best Practices Summary

1. **Always use retry for network operations**
   - 3 retries with exponential backoff
   - Add jitter (20-30%) to prevent thundering herd

2. **Implement circuit breakers for external dependencies**
   - 5 failures = open circuit
   - 30-60 second reset time

3. **Limit concurrency based on provider capacity**
   - Start conservative (5-10 concurrent)
   - Increase based on monitoring

4. **Respect rate limits**
   - Use token bucket algorithm
   - Leave headroom (80% of limit)

5. **Cache provider information**
   - Refresh every 5-15 minutes
   - Health check before critical requests

6. **Log everything for debugging**
   - Request ID for tracing
   - Timing, retries, provider selected
   - Full error details on failure
