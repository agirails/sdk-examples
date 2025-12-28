#!/usr/bin/env python3
"""
Basic API Example 01: Hello World

The simplest possible AGIRAILS example.
Creates a provider and requests a service in under 30 lines.

This example demonstrates:
- provide() - Register a service handler
- request() - Request a service and get result

Run: python basic/01_hello_world.py
"""

import asyncio
import sys
from pathlib import Path

# Add src to path for helpers
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, wait_for_provider


async def main() -> None:
    print("AGIRAILS Basic API - Hello World\n")

    # Clear previous mock state
    clear_mock_state()

    # Import SDK
    from agirails import ACTPClient
    from agirails.level0 import provide, request, set_provider_client, start_provider, stop_provider

    # Test addresses
    REQUESTER = "0x1111111111111111111111111111111111111111"
    PROVIDER = "0x2222222222222222222222222222222222222222"

    # 1. Create a simple "hello" service provider
    async def hello_handler(data: dict) -> str:
        name = data.get("name", "World") if isinstance(data, dict) else data
        return f"Hello, {name}!"

    provider = provide("hello", hello_handler, description="Hello service")
    print(f"Provider registered: {provider.name}")

    # Create client and set up provider
    client = await ACTPClient.create(mode="mock", requester_address=REQUESTER)
    await client.mint_tokens(PROVIDER, 1_000_000)
    set_provider_client(client, address=PROVIDER)
    await start_provider()

    print(f"Provider started: {PROVIDER[:10]}...")

    try:
        # 2. Request the service
        result = await request(
            "hello",
            input={"name": "World"},
            budget=1,  # $1 USDC
            client=client,
            provider=PROVIDER,
        )

        print(f"Result: {result.result}")  # "Hello, World!"

    finally:
        # 3. Cleanup
        await stop_provider()

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
