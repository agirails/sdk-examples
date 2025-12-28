#!/usr/bin/env python3
"""
Advanced API Example 03: Batch Operations

Demonstrates parallel transaction creation and state transitions.
Useful for high-throughput applications.

This example demonstrates:
- Parallel transaction creation
- Batch state transitions
- Performance metrics
- Error handling in batch operations

Run: python advanced/03_batch_operations.py
"""

import asyncio
import time
import sys
from pathlib import Path
from typing import List

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section, format_usdc


async def main() -> None:
    log_section("AGIRAILS Advanced API - Batch Operations")

    clear_mock_state()

    from agirails import ACTPClient

    requester_address = "0x1111111111111111111111111111111111111111"
    provider_address = "0x2222222222222222222222222222222222222222"

    log("🔧", "Creating client...")

    client = await ACTPClient.create(
        mode="mock",
        requester_address=requester_address,
    )

    # Mint tokens for batch operations
    await client.mint_tokens(requester_address, 1_000_000_000)  # 1000 USDC
    log("✅", "Client ready with 1000 USDC")

    # =====================================================
    # Part 1: Sequential vs Parallel Transaction Creation
    # =====================================================
    log_section("Part 1: Sequential vs Parallel Creation")

    BATCH_SIZE = 5

    # Sequential creation
    log("🐢", f"Creating {BATCH_SIZE} transactions sequentially...")
    start = time.time()

    sequential_tx_ids: List[str] = []
    for i in range(BATCH_SIZE):
        tx_id = await client.standard.create_transaction({
            "provider": provider_address,
            "amount": 10,  # $10 each
            "deadline": "+1h",
            "dispute_window": 3600,
        })
        sequential_tx_ids.append(tx_id)

    sequential_time = time.time() - start
    print(f"   Created {len(sequential_tx_ids)} transactions")
    print(f"   Time: {sequential_time:.2f}s")
    print(f"   Rate: {BATCH_SIZE / sequential_time:.1f} tx/s")
    print()

    # Parallel creation
    log("🚀", f"Creating {BATCH_SIZE} transactions in parallel...")
    start = time.time()

    async def create_tx(i: int) -> str:
        return await client.standard.create_transaction({
            "provider": provider_address,
            "amount": 10,
            "deadline": "+1h",
            "dispute_window": 3600,
        })

    parallel_tx_ids = await asyncio.gather(*[create_tx(i) for i in range(BATCH_SIZE)])

    parallel_time = time.time() - start
    print(f"   Created {len(parallel_tx_ids)} transactions")
    print(f"   Time: {parallel_time:.2f}s")
    print(f"   Rate: {BATCH_SIZE / parallel_time:.1f} tx/s")
    print()

    speedup = sequential_time / parallel_time if parallel_time > 0 else 0
    print(f"   Speedup: {speedup:.1f}x faster with parallel execution")

    # =====================================================
    # Part 2: Batch State Transitions
    # =====================================================
    log_section("Part 2: Batch State Transitions")

    # Link escrow for all parallel transactions
    log("💳", f"Linking escrow for {BATCH_SIZE} transactions...")
    start = time.time()

    async def link_escrow(tx_id: str) -> str:
        await client.standard.link_escrow(tx_id)
        return tx_id

    await asyncio.gather(*[link_escrow(tx_id) for tx_id in parallel_tx_ids])
    print(f"   Completed in {time.time() - start:.2f}s")

    # Transition all to DELIVERED
    log("📦", f"Transitioning {BATCH_SIZE} transactions to DELIVERED...")
    start = time.time()

    async def transition_to_delivered(tx_id: str) -> str:
        await client.standard.transition_state(tx_id, "DELIVERED")
        return tx_id

    await asyncio.gather(*[transition_to_delivered(tx_id) for tx_id in parallel_tx_ids])
    print(f"   Completed in {time.time() - start:.2f}s")

    # =====================================================
    # Part 3: Error Handling with allSettled Pattern
    # =====================================================
    log_section("Part 3: Error Handling")

    log("⚠️", "Demonstrating error handling with mixed results...")

    # Mix of valid and invalid transaction IDs
    test_tx_ids = parallel_tx_ids[:3] + [
        "0x" + "0" * 64,  # Invalid TX ID
        "0x" + "1" * 64,  # Another invalid TX ID
    ]

    async def get_tx_safe(tx_id: str) -> dict:
        """Get transaction with error handling."""
        try:
            tx = await client.standard.get_transaction(tx_id)
            return {"status": "success", "tx_id": tx_id, "tx": tx}
        except Exception as e:
            return {"status": "error", "tx_id": tx_id, "error": str(e)}

    results = await asyncio.gather(*[get_tx_safe(tx_id) for tx_id in test_tx_ids])

    success_count = sum(1 for r in results if r["status"] == "success")
    error_count = sum(1 for r in results if r["status"] == "error")

    print(f"   Total: {len(results)}")
    print(f"   Success: {success_count}")
    print(f"   Errors: {error_count}")
    print()

    # Show errors
    for r in results:
        if r["status"] == "error":
            print(f"   ❌ {r['tx_id'][:16]}... - {r['error'][:40]}...")

    # =====================================================
    # Part 4: Performance Metrics
    # =====================================================
    log_section("Part 4: Performance Metrics")

    # Measure total throughput
    total_txs = len(sequential_tx_ids) + len(parallel_tx_ids)
    total_amount = total_txs * 10_000_000  # 10 USDC each

    print("Batch Operation Summary:")
    print(f"  Total transactions: {total_txs}")
    print(f"  Total amount: {format_usdc(total_amount)}")
    print()
    print("Performance:")
    print(f"  Sequential: {BATCH_SIZE / sequential_time:.1f} tx/s")
    print(f"  Parallel: {BATCH_SIZE / parallel_time:.1f} tx/s")
    print(f"  Improvement: {speedup:.1f}x")
    print()
    print("Recommendations:")
    print("  - Use parallel operations for batch processing")
    print("  - Group transactions by provider for efficiency")
    print("  - Use allSettled pattern for resilience")
    print("  - Monitor gas costs in mainnet (Base L2 is cheap)")

    # =====================================================
    # Summary
    # =====================================================
    log_section("Summary")

    print(f"Total transactions created: {total_txs}")
    print(f"  - Sequential batch: {len(sequential_tx_ids)}")
    print(f"  - Parallel batch: {len(parallel_tx_ids)}")

    # Get final balance
    final_balance = await client.get_balance(requester_address)
    print(f"\nFinal balance: {format_usdc(final_balance)}")

    log("🎉", "Batch operations demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
