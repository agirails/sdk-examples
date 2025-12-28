#!/usr/bin/env python3
"""
Pattern: Retry Logic

Demonstrates resilient request handling with retries, backoff, and circuit breakers.

This pattern shows:
- Exponential backoff with jitter
- Error classification (retryable vs non-retryable)
- Circuit breaker pattern
- Request wrapping

Run: python patterns/retry_logic.py
"""

import asyncio
import sys
import random
import time
from pathlib import Path
from dataclasses import dataclass, field
from typing import TypeVar, Callable, Awaitable, Optional, List
from enum import Enum

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section

T = TypeVar("T")


class CircuitState(Enum):
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""
    max_attempts: int = 3
    initial_delay_ms: int = 100
    max_delay_ms: int = 10000
    backoff_multiplier: float = 2.0
    jitter: bool = True


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5
    success_threshold: int = 2
    timeout_ms: int = 30000


class RetryableError(Exception):
    """Error that can be retried."""
    pass


class NonRetryableError(Exception):
    """Error that should not be retried."""
    pass


def is_retryable_error(error: Exception) -> bool:
    """Classify if an error is retryable."""
    # Network errors are retryable
    if isinstance(error, (TimeoutError, ConnectionError, RetryableError)):
        return True

    # Check error message for transient patterns
    message = str(error).lower()
    transient_patterns = [
        "timeout",
        "connection",
        "temporary",
        "unavailable",
        "rate limit",
        "too many requests",
        "503",
        "502",
    ]

    return any(pattern in message for pattern in transient_patterns)


class CircuitBreaker:
    """Circuit breaker to prevent cascading failures."""

    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None

    def can_execute(self) -> bool:
        """Check if request can proceed."""
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            # Check if timeout has passed
            if self.last_failure_time:
                elapsed = (time.time() - self.last_failure_time) * 1000
                if elapsed >= self.config.timeout_ms:
                    self.state = CircuitState.HALF_OPEN
                    return True
            return False

        # HALF_OPEN - allow one request
        return True

    def record_success(self) -> None:
        """Record a successful request."""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.config.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0

    def record_failure(self) -> None:
        """Record a failed request."""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            self.success_count = 0
        elif self.failure_count >= self.config.failure_threshold:
            self.state = CircuitState.OPEN


async def with_retry(
    fn: Callable[[], Awaitable[T]],
    config: RetryConfig = RetryConfig(),
    circuit_breaker: Optional[CircuitBreaker] = None,
) -> T:
    """Execute function with retry logic."""
    last_error: Optional[Exception] = None

    for attempt in range(1, config.max_attempts + 1):
        # Check circuit breaker
        if circuit_breaker and not circuit_breaker.can_execute():
            raise Exception(f"Circuit breaker is OPEN - requests blocked")

        try:
            result = await fn()

            # Record success
            if circuit_breaker:
                circuit_breaker.record_success()

            return result

        except Exception as e:
            last_error = e

            # Record failure
            if circuit_breaker:
                circuit_breaker.record_failure()

            # Check if retryable
            if not is_retryable_error(e):
                raise e

            # Check if we have attempts left
            if attempt >= config.max_attempts:
                break

            # Calculate delay with exponential backoff
            delay_ms = config.initial_delay_ms * (config.backoff_multiplier ** (attempt - 1))
            delay_ms = min(delay_ms, config.max_delay_ms)

            # Add jitter
            if config.jitter:
                delay_ms = delay_ms * (0.5 + random.random())

            print(f"   Attempt {attempt} failed, retrying in {delay_ms:.0f}ms...")
            await asyncio.sleep(delay_ms / 1000)

    raise last_error or Exception("All retry attempts failed")


async def main() -> None:
    log_section("AGIRAILS Pattern - Retry Logic")

    clear_mock_state()

    # =====================================================
    # Part 1: Basic Retry
    # =====================================================
    log_section("Part 1: Basic Retry")

    attempt_count = 0

    async def flaky_operation() -> str:
        """Simulates an operation that fails twice then succeeds."""
        nonlocal attempt_count
        attempt_count += 1

        if attempt_count < 3:
            raise RetryableError(f"Temporary failure (attempt {attempt_count})")

        return "Success!"

    log("🔄", "Calling flaky operation with retries...")

    try:
        result = await with_retry(flaky_operation)
        print(f"   Result: {result}")
        print(f"   Total attempts: {attempt_count}")
    except Exception as e:
        print(f"   Failed: {e}")

    # =====================================================
    # Part 2: Non-Retryable Errors
    # =====================================================
    log_section("Part 2: Non-Retryable Errors")

    async def auth_error_operation() -> str:
        """Simulates an authentication error (non-retryable)."""
        raise NonRetryableError("Invalid API key")

    log("🚫", "Calling operation that fails with auth error...")

    try:
        await with_retry(auth_error_operation)
    except NonRetryableError as e:
        print(f"   Immediately failed (no retry): {e}")
    except Exception as e:
        print(f"   Error: {e}")

    # =====================================================
    # Part 3: Backoff Strategies
    # =====================================================
    log_section("Part 3: Backoff Strategies")

    print("Exponential Backoff Formula:")
    print("  delay = min(initial_delay * (multiplier ^ attempt), max_delay)")
    print()
    print("Example with default config:")
    config = RetryConfig()
    for attempt in range(1, 6):
        delay = config.initial_delay_ms * (config.backoff_multiplier ** (attempt - 1))
        delay = min(delay, config.max_delay_ms)
        print(f"  Attempt {attempt}: {delay:.0f}ms delay")
    print()

    print("With jitter (randomization):")
    print("  delay = delay * random(0.5, 1.5)")
    print("  Prevents thundering herd when many clients retry simultaneously")

    # =====================================================
    # Part 4: Circuit Breaker
    # =====================================================
    log_section("Part 4: Circuit Breaker")

    cb_config = CircuitBreakerConfig(
        failure_threshold=3,
        success_threshold=2,
        timeout_ms=5000,
    )
    circuit = CircuitBreaker(cb_config)

    failure_count = 0

    async def failing_service() -> str:
        nonlocal failure_count
        failure_count += 1
        raise RetryableError("Service unavailable")

    log("⚡", "Simulating repeated failures to trigger circuit breaker...")

    for i in range(5):
        try:
            await with_retry(
                failing_service,
                config=RetryConfig(max_attempts=1),
                circuit_breaker=circuit,
            )
        except Exception as e:
            status = circuit.state.value.upper()
            print(f"   Request {i + 1}: {str(e)[:30]}... [Circuit: {status}]")

        if circuit.state == CircuitState.OPEN:
            print(f"   Circuit OPEN - blocking further requests")
            break

    print()
    print("Circuit breaker states:")
    print("  CLOSED: Normal operation, requests flow through")
    print("  OPEN: Too many failures, requests blocked")
    print("  HALF_OPEN: Testing recovery, limited requests allowed")

    # =====================================================
    # Part 5: Error Classification
    # =====================================================
    log_section("Part 5: Error Classification")

    test_errors = [
        TimeoutError("Connection timed out"),
        ConnectionError("Cannot connect to server"),
        ValueError("Invalid input format"),
        Exception("503 Service Unavailable"),
        Exception("Rate limit exceeded"),
        Exception("Invalid signature"),
    ]

    print("Error classification:")
    for error in test_errors:
        retryable = is_retryable_error(error)
        status = "✅ Retryable" if retryable else "❌ Not retryable"
        print(f"  {status}: {type(error).__name__}: {str(error)[:30]}")

    # =====================================================
    # Part 6: Integration Example
    # =====================================================
    log_section("Part 6: Integration Example")

    print("Usage with AGIRAILS SDK:")
    print()
    print("```python")
    print("from patterns.retry_logic import with_retry, RetryConfig, CircuitBreaker")
    print()
    print("# Configure retry behavior")
    print("config = RetryConfig(")
    print("    max_attempts=5,")
    print("    initial_delay_ms=200,")
    print("    max_delay_ms=30000,")
    print("    jitter=True,")
    print(")")
    print()
    print("# Optional: circuit breaker for service-level protection")
    print("circuit = CircuitBreaker(CircuitBreakerConfig(failure_threshold=10))")
    print()
    print("# Wrap SDK calls")
    print("result = await with_retry(")
    print("    lambda: request('translate', input={'text': 'Hello'}, budget=1.0),")
    print("    config=config,")
    print("    circuit_breaker=circuit,")
    print(")")
    print("```")

    log("🎉", "Retry logic demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
