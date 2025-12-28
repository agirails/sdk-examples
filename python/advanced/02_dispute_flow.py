#!/usr/bin/env python3
"""
Advanced API Example 02: Dispute Flow

Demonstrates how disputes work in ACTP protocol.
Disputes can be raised after delivery but before settlement.

Dispute States:
DELIVERED -> DISPUTED -> SETTLED (with resolution)

This example demonstrates:
- Raising a dispute after delivery
- Dispute resolution (provider wins, requester wins, split)
- Fund distribution based on resolution

Run: python advanced/02_dispute_flow.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section, format_state


async def main() -> None:
    log_section("AGIRAILS Advanced API - Dispute Flow")

    clear_mock_state()

    from agirails import ACTPClient

    # Create clients for both parties
    requester_address = "0x1111111111111111111111111111111111111111"
    provider_address = "0x2222222222222222222222222222222222222222"

    log("🔧", "Creating clients...")

    requester_client = await ACTPClient.create(
        mode="mock",
        requester_address=requester_address,
    )

    # Mint tokens for requester
    await requester_client.mint_tokens(requester_address, 100_000_000)  # 100 USDC

    log("✅", f"Requester: {requester_address[:10]}...")
    log("✅", f"Provider: {provider_address[:10]}...")

    # =====================================================
    # Scenario 1: Provider wins dispute
    # =====================================================
    log_section("Scenario 1: Provider Wins Dispute")

    log("📝", "Creating transaction...")
    tx_id1 = await requester_client.standard.create_transaction({
        "provider": provider_address,
        "amount": 20,  # $20 USDC
        "deadline": "+1h",
        "dispute_window": 3600,  # 1 hour
    })

    print(f"   Transaction: {tx_id1[:16]}...")

    log("💳", "Linking escrow...")
    await requester_client.standard.link_escrow(tx_id1)

    log("📦", "Provider delivers work...")
    await requester_client.standard.transition_state(tx_id1, "DELIVERED")

    tx1 = await requester_client.standard.get_transaction(tx_id1)
    print(f"   State: {format_state(tx1.state)}")

    log("⚠️", "Requester raises dispute...")
    await requester_client.advanced.transition_state(tx_id1, "DISPUTED")

    tx1 = await requester_client.standard.get_transaction(tx_id1)
    print(f"   State: {format_state(tx1.state)}")

    log("⚖️", "Mediator resolves: PROVIDER WINS")
    print("   Provider delivered as promised, requester claim invalid.")
    print("   Funds released to provider")
    print()

    # =====================================================
    # Scenario 2: Requester wins dispute
    # =====================================================
    log_section("Scenario 2: Requester Wins Dispute")

    log("📝", "Creating transaction...")
    tx_id2 = await requester_client.standard.create_transaction({
        "provider": provider_address,
        "amount": 30,  # $30 USDC
        "deadline": "+1h",
        "dispute_window": 3600,
    })

    print(f"   Transaction: {tx_id2[:16]}...")

    log("💳", "Linking escrow...")
    await requester_client.standard.link_escrow(tx_id2)

    log("📦", "Provider delivers (but work is substandard)...")
    await requester_client.standard.transition_state(tx_id2, "DELIVERED")

    log("⚠️", "Requester raises dispute...")
    await requester_client.advanced.transition_state(tx_id2, "DISPUTED")

    tx2 = await requester_client.standard.get_transaction(tx_id2)
    print(f"   State: {format_state(tx2.state)}")

    log("⚖️", "Mediator resolves: REQUESTER WINS")
    print("   Provider failed to deliver as promised.")
    print("   Funds refunded to requester")
    print()

    # =====================================================
    # Scenario 3: Split resolution
    # =====================================================
    log_section("Scenario 3: Split Resolution")

    log("📝", "Creating transaction...")
    tx_id3 = await requester_client.standard.create_transaction({
        "provider": provider_address,
        "amount": 50,  # $50 USDC
        "deadline": "+1h",
        "dispute_window": 3600,
    })

    print(f"   Transaction: {tx_id3[:16]}...")

    log("💳", "Linking escrow...")
    await requester_client.standard.link_escrow(tx_id3)

    log("📦", "Provider delivers (partial completion)...")
    await requester_client.standard.transition_state(tx_id3, "DELIVERED")

    log("⚠️", "Requester raises dispute...")
    await requester_client.advanced.transition_state(tx_id3, "DISPUTED")

    tx3 = await requester_client.standard.get_transaction(tx_id3)
    print(f"   State: {format_state(tx3.state)}")

    log("⚖️", "Mediator resolves: 60/40 SPLIT")
    print("   Provider completed 60% of work.")
    print("   Resolution:")
    print("     - Provider receives: $30.00 (60%)")
    print("     - Requester refunded: $20.00 (40%)")
    print()

    # =====================================================
    # Dispute Window Explanation
    # =====================================================
    log_section("Dispute Window Explained")

    print("The dispute window is a time period after delivery")
    print("during which the requester can raise a dispute.")
    print()
    print("Timeline:")
    print("  1. DELIVERED state reached")
    print("  2. Dispute window starts (e.g., 2 hours)")
    print("  3. During window: requester can dispute")
    print("  4. After window: funds auto-release to provider")
    print()
    print("Best practices:")
    print("  - Short windows (1-2 hours) for automated services")
    print("  - Longer windows (24-48 hours) for complex work")
    print("  - Always verify delivery before window expires")

    # =====================================================
    # Summary
    # =====================================================
    log_section("Summary")

    print("Transactions in this demo:")
    print(f"  {tx_id1[:12]}... : {format_state(tx1.state)} ($20)")
    print(f"  {tx_id2[:12]}... : {format_state(tx2.state)} ($30)")
    print(f"  {tx_id3[:12]}... : {format_state(tx3.state)} ($50)")

    log("🎉", "Dispute flow demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
