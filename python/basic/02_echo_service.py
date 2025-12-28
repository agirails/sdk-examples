#!/usr/bin/env python3
"""
Basic API Example 02: Echo Service

Demonstrates provider events and statistics tracking.

This example demonstrates:
- Provider with event callbacks
- Payment tracking
- Statistics monitoring
- Multiple requests in sequence

Run: python basic/02_echo_service.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, format_usdc


async def main() -> None:
    print("AGIRAILS Basic API - Echo Service\n")

    clear_mock_state()

    from agirails import ACTPClient
    from agirails.level0 import (
        provide,
        request,
        set_provider_client,
        start_provider,
        stop_provider,
    )

    REQUESTER = "0x1111111111111111111111111111111111111111"
    PROVIDER = "0x2222222222222222222222222222222222222222"

    # Statistics tracking
    stats = {
        "requests": 0,
        "total_earned": 0,
    }

    # 1. Create echo service with event tracking
    async def echo_handler(data: dict) -> dict:
        stats["requests"] += 1
        print(f"  [Provider] Processing request #{stats['requests']}")
        return {"echoed": data, "request_number": stats["requests"]}

    provider = provide(
        "echo",
        echo_handler,
        description="Echo service - returns input with metadata",
    )

    # Set up client and provider
    client = await ACTPClient.create(mode="mock", requester_address=REQUESTER)
    await client.mint_tokens(PROVIDER, 10_000_000)  # 10 USDC
    set_provider_client(client, address=PROVIDER)
    await start_provider()

    print(f"Echo provider started: {PROVIDER[:10]}...")
    print()

    try:
        # 2. Make several requests
        messages = [
            {"text": "Hello, AGIRAILS!", "timestamp": 1},
            {"text": "Testing echo", "timestamp": 2},
            {"text": "Final message", "timestamp": 3},
        ]

        for i, msg in enumerate(messages, 1):
            print(f"Request {i}: {msg['text']}")

            result = await request(
                "echo",
                input=msg,
                budget=0.50,  # $0.50 per request
                client=client,
                provider=PROVIDER,
            )

            print(f"  Response: {result.result}")
            print(f"  Transaction: {result.transaction.id[:16]}...")
            print(f"  Amount: {format_usdc(result.transaction.amount)}")
            print()

            stats["total_earned"] += result.transaction.amount

        # 3. Print final statistics
        print("=" * 40)
        print("Provider Statistics:")
        print(f"  Total requests: {stats['requests']}")
        print(f"  Total earned: {format_usdc(stats['total_earned'])}")
        print("=" * 40)

    finally:
        await stop_provider()

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
