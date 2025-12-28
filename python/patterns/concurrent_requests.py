#!/usr/bin/env python3
"""
Pattern: Concurrent Requests

Demonstrates concurrency control and rate limiting for high-throughput applications.

This pattern shows:
- Semaphore for limiting concurrent operations
- Rate limiting with token bucket
- Request batching
- Backpressure handling

Run: python patterns/concurrent_requests.py
"""

import asyncio
import sys
import time
from pathlib import Path
from dataclasses import dataclass
from typing import List, TypeVar, Callable, Awaitable, Any

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section

T = TypeVar("T")


class Semaphore:
    """Async semaphore for limiting concurrent operations."""

    def __init__(self, max_concurrent: int):
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self.max_concurrent = max_concurrent
        self._active = 0

    async def acquire(self) -> None:
        await self._semaphore.acquire()
        self._active += 1

    def release(self) -> None:
        self._active -= 1
        self._semaphore.release()

    @property
    def active(self) -> int:
        return self._active

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, *args):
        self.release()


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, rate: float, burst: int = 1):
        """
        Args:
            rate: Tokens per second
            burst: Maximum tokens (bucket size)
        """
        self.rate = rate
        self.burst = burst
        self._tokens = burst
        self._last_update = time.time()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Wait until a token is available."""
        async with self._lock:
            while True:
                now = time.time()
                elapsed = now - self._last_update
                self._tokens = min(self.burst, self._tokens + elapsed * self.rate)
                self._last_update = now

                if self._tokens >= 1:
                    self._tokens -= 1
                    return

                # Wait for token to become available
                wait_time = (1 - self._tokens) / self.rate
                await asyncio.sleep(wait_time)


async def concurrent(
    items: List[T],
    fn: Callable[[T], Awaitable[Any]],
    max_concurrent: int = 10,
    rate_limit: float = None,
) -> List[Any]:
    """Execute function on items with concurrency control.

    Args:
        items: Items to process
        fn: Async function to call for each item
        max_concurrent: Maximum concurrent operations
        rate_limit: Requests per second (None for unlimited)

    Returns:
        List of results in same order as items
    """
    semaphore = Semaphore(max_concurrent)
    rate_limiter = RateLimiter(rate_limit) if rate_limit else None

    async def process(idx: int, item: T) -> tuple:
        if rate_limiter:
            await rate_limiter.acquire()

        async with semaphore:
            result = await fn(item)
            return (idx, result)

    tasks = [process(i, item) for i, item in enumerate(items)]
    results = await asyncio.gather(*tasks)

    # Sort by original index
    results.sort(key=lambda x: x[0])
    return [r[1] for r in results]


async def batch_process(
    items: List[T],
    fn: Callable[[List[T]], Awaitable[List[Any]]],
    batch_size: int = 10,
) -> List[Any]:
    """Process items in batches.

    Args:
        items: Items to process
        fn: Async function that processes a batch
        batch_size: Items per batch

    Returns:
        Flattened list of all results
    """
    results = []

    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        batch_results = await fn(batch)
        results.extend(batch_results)

    return results


@dataclass
class RequestStats:
    """Statistics for concurrent operations."""
    total_requests: int = 0
    successful: int = 0
    failed: int = 0
    total_time_ms: float = 0
    max_concurrent: int = 0

    @property
    def avg_time_ms(self) -> float:
        return self.total_time_ms / max(self.successful, 1)


async def main() -> None:
    log_section("AGIRAILS Pattern - Concurrent Requests")

    clear_mock_state()

    # =====================================================
    # Part 1: Basic Concurrency Control
    # =====================================================
    log_section("Part 1: Concurrency Control")

    log("🔧", "Processing 20 items with max 5 concurrent...")

    async def slow_operation(item: int) -> int:
        """Simulates a slow operation."""
        await asyncio.sleep(0.2)  # 200ms per operation
        return item * 2

    items = list(range(20))

    start = time.time()
    results = await concurrent(items, slow_operation, max_concurrent=5)
    elapsed = time.time() - start

    print(f"   Processed: {len(results)} items")
    print(f"   Time: {elapsed:.2f}s")
    print(f"   Theoretical sequential: {len(items) * 0.2:.2f}s")
    print(f"   Speedup: {(len(items) * 0.2) / elapsed:.1f}x")

    # =====================================================
    # Part 2: Rate Limiting
    # =====================================================
    log_section("Part 2: Rate Limiting")

    log("🚦", "Processing with rate limit of 10 requests/second...")

    timestamps = []

    async def tracked_operation(item: int) -> int:
        timestamps.append(time.time())
        await asyncio.sleep(0.05)  # Fast operation
        return item

    items = list(range(15))
    start = time.time()

    results = await concurrent(
        items,
        tracked_operation,
        max_concurrent=20,  # High concurrency
        rate_limit=10,  # But limited to 10/sec
    )

    elapsed = time.time() - start
    print(f"   Processed: {len(results)} items")
    print(f"   Time: {elapsed:.2f}s (expected ~1.5s at 10/sec)")

    # Show request timing
    if len(timestamps) > 1:
        intervals = [timestamps[i] - timestamps[i-1] for i in range(1, len(timestamps))]
        avg_interval = sum(intervals) / len(intervals)
        print(f"   Avg interval: {avg_interval * 1000:.0f}ms (target: 100ms)")

    # =====================================================
    # Part 3: Batch Processing
    # =====================================================
    log_section("Part 3: Batch Processing")

    log("📦", "Processing 25 items in batches of 5...")

    batch_count = 0

    async def process_batch(batch: List[int]) -> List[int]:
        nonlocal batch_count
        batch_count += 1
        print(f"   Processing batch {batch_count}: {len(batch)} items")
        await asyncio.sleep(0.1)
        return [x * 2 for x in batch]

    items = list(range(25))
    results = await batch_process(items, process_batch, batch_size=5)

    print(f"   Total batches: {batch_count}")
    print(f"   Total results: {len(results)}")

    # =====================================================
    # Part 4: Comparing Strategies
    # =====================================================
    log_section("Part 4: Strategy Comparison")

    NUM_ITEMS = 50
    OPERATION_TIME = 0.1  # 100ms per operation

    async def timed_operation(item: int) -> int:
        await asyncio.sleep(OPERATION_TIME)
        return item

    items = list(range(NUM_ITEMS))

    # Strategy 1: Sequential
    log("1️⃣", "Sequential processing...")
    start = time.time()
    sequential_results = []
    for item in items[:10]:  # Only 10 for demo
        sequential_results.append(await timed_operation(item))
    sequential_time = time.time() - start
    print(f"   10 items in {sequential_time:.2f}s")

    # Strategy 2: Unlimited concurrent
    log("2️⃣", "Unlimited concurrent...")
    start = time.time()
    unlimited_results = await asyncio.gather(*[timed_operation(i) for i in items])
    unlimited_time = time.time() - start
    print(f"   {NUM_ITEMS} items in {unlimited_time:.2f}s")

    # Strategy 3: Limited concurrent
    log("3️⃣", "Limited concurrent (max 10)...")
    start = time.time()
    limited_results = await concurrent(items, timed_operation, max_concurrent=10)
    limited_time = time.time() - start
    print(f"   {NUM_ITEMS} items in {limited_time:.2f}s")

    # Strategy 4: Rate limited
    log("4️⃣", "Rate limited (20/sec)...")
    start = time.time()
    rate_limited_results = await concurrent(
        items,
        timed_operation,
        max_concurrent=50,
        rate_limit=20,
    )
    rate_limited_time = time.time() - start
    print(f"   {NUM_ITEMS} items in {rate_limited_time:.2f}s")

    # =====================================================
    # Part 5: Best Practices
    # =====================================================
    log_section("Part 5: Best Practices")

    print("Concurrency Guidelines:")
    print()
    print("1. Start Conservative")
    print("   - Begin with low concurrency (5-10)")
    print("   - Increase based on success rate")
    print("   - Monitor for 429 (rate limit) errors")
    print()
    print("2. Respect Provider Limits")
    print("   - Check provider's rate limits")
    print("   - Use rate limiter to stay within bounds")
    print("   - Add backoff on rate limit errors")
    print()
    print("3. Handle Backpressure")
    print("   - Monitor queue depth")
    print("   - Reduce rate if errors increase")
    print("   - Implement circuit breaker (see retry_logic.py)")
    print()
    print("4. Optimize Batch Size")
    print("   - Larger batches = fewer round trips")
    print("   - But: risk of partial failures")
    print("   - Balance based on error rate")

    # =====================================================
    # Part 6: Integration Example
    # =====================================================
    log_section("Part 6: Integration Example")

    print("Usage with AGIRAILS SDK:")
    print()
    print("```python")
    print("from patterns.concurrent_requests import concurrent, RateLimiter")
    print()
    print("# Translate 100 texts concurrently")
    print("texts = ['Hello', 'World', ...]  # 100 items")
    print()
    print("async def translate(text: str) -> dict:")
    print("    return await request('translate', input={'text': text}, budget=0.50)")
    print()
    print("# Process with concurrency control")
    print("results = await concurrent(")
    print("    texts,")
    print("    translate,")
    print("    max_concurrent=10,  # Don't overwhelm provider")
    print("    rate_limit=5,  # 5 requests per second max")
    print(")")
    print("```")

    log("🎉", "Concurrent requests demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
