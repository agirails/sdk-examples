#!/usr/bin/env python3
"""
Advanced API Example 01: Transaction Lifecycle

Demonstrates the complete ACTP transaction lifecycle using ACTPClient.
This gives you full control over each step of the process.

Transaction States:
INITIATED -> COMMITTED -> IN_PROGRESS -> DELIVERED -> SETTLED

This example demonstrates:
- ACTPClient creation and configuration
- Three API levels: basic, standard, advanced
- Full transaction lifecycle control
- Escrow management

Run: python advanced/01_transaction_lifecycle.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section, format_state, format_usdc


async def main() -> None:
    log_section("AGIRAILS Advanced API - Transaction Lifecycle")

    clear_mock_state()

    from agirails import ACTPClient, is_mock_runtime

    # 1. Create ACTPClient in mock mode
    log("🔧", "Creating ACTPClient...")

    client = await ACTPClient.create(
        mode="mock",  # Use 'testnet' or 'mainnet' for real blockchain
        requester_address="0x1111111111111111111111111111111111111111",
    )

    my_address = client.address
    log("✅", f"Client ready: {my_address[:16]}...")
    print(f"   Mode: {client.get_mode()}")

    # 2. Mint some test tokens (mock mode only)
    log("💰", "Minting test tokens...")
    await client.mint_tokens(my_address, 100_000_000)  # 100 USDC
    balance = await client.get_balance(my_address)
    print(f"   Balance: {format_usdc(balance)}")

    # =====================================================
    # METHOD 1: Basic API (simplest)
    # =====================================================
    log_section("Method 1: Basic API")

    log("📝", "Using basic.pay() - one call does everything")

    basic_result = await client.basic.pay({
        "to": "0x2222222222222222222222222222222222222222",
        "amount": 10,  # $10 USDC
        "deadline": "+2h",  # 2 hours from now
        "description": "Basic API demo transaction",
    })

    print(f"   Transaction ID: {basic_result.tx_id[:16]}...")
    print(f"   Amount: {format_usdc(basic_result.amount)}")
    print(f"   State: {format_state(basic_result.state)}")  # Already COMMITTED!

    # =====================================================
    # METHOD 2: Standard API (more control)
    # =====================================================
    log_section("Method 2: Standard API")

    log("📝", "Step 1: Create transaction")

    tx_id = await client.standard.create_transaction({
        "provider": "0x3333333333333333333333333333333333333333",
        "amount": 25,  # $25 USDC
        "deadline": "+3h",
        "dispute_window": 3600,  # 1 hour minimum
    })

    print(f"   Transaction ID: {tx_id[:16]}...")

    # Get transaction details
    tx = await client.standard.get_transaction(tx_id)
    if not tx:
        raise Exception("Transaction not found")
    print(f"   State: {format_state(tx.state)}")

    log("💳", "Step 2: Link escrow (locks funds)")
    await client.standard.link_escrow(tx_id)

    tx = await client.standard.get_transaction(tx_id)
    print(f"   State: {format_state(tx.state)}")  # COMMITTED

    log("🔨", "Step 3: Transition to IN_PROGRESS")
    await client.standard.transition_state(tx_id, "IN_PROGRESS")

    tx = await client.standard.get_transaction(tx_id)
    print(f"   State: {format_state(tx.state)}")

    log("📦", "Step 4: Transition to DELIVERED")
    await client.standard.transition_state(tx_id, "DELIVERED")

    tx = await client.standard.get_transaction(tx_id)
    print(f"   State: {format_state(tx.state)}")

    # Wait for dispute window (use time manipulation in mock mode)
    log("⏳", "Advancing time past dispute window (mock mode)...")
    runtime = client.advanced
    if is_mock_runtime(runtime):
        await runtime.time.advance_time(3700)  # Advance 1 hour + 100 seconds

    log("💸", "Step 5: Release escrow")
    if tx.escrow_id:
        await client.standard.release_escrow(tx.escrow_id)

    tx = await client.standard.get_transaction(tx_id)
    print(f"   State: {format_state(tx.state)}")  # SETTLED

    # =====================================================
    # METHOD 3: Advanced API (full protocol access)
    # =====================================================
    log_section("Method 3: Advanced API")

    log("📝", "Direct runtime access for full control")

    runtime = client.advanced

    # Create transaction with all parameters using dataclass
    import time
    from agirails.runtime.base import CreateTransactionParams

    adv_params = CreateTransactionParams(
        provider="0x4444444444444444444444444444444444444444",
        requester=my_address,
        amount=str(50_000_000),  # 50 USDC in wei (6 decimals), as string
        deadline=int(time.time()) + 7200,  # 2 hours
        dispute_window=3600,  # 1 hour (minimum allowed)
        service_description='{"service": "advanced-demo", "input": {"data": "test"}}',
    )
    adv_tx_id = await runtime.create_transaction(adv_params)

    print(f"   Transaction ID: {adv_tx_id[:16]}...")

    # Link escrow
    escrow_id = await runtime.link_escrow(adv_tx_id, 50_000_000)
    print(f"   Escrow ID: {escrow_id[:16]}...")

    # Get transaction via advanced API
    adv_tx = await runtime.get_transaction(adv_tx_id)
    print(f"   State: {format_state(adv_tx.state)}")

    # Time manipulation (mock mode only)
    if is_mock_runtime(runtime):
        log("⏰", "Time manipulation (mock mode)")
        print(f"   Current time: {runtime.time.now()}")

    # =====================================================
    # Summary
    # =====================================================
    log_section("Summary")

    print("Transactions created in this demo:")
    print(f"  - Basic API: {basic_result.tx_id[:12]}...")
    print(f"  - Standard API: {tx_id[:12]}...")
    print(f"  - Advanced API: {adv_tx_id[:12]}...")

    # Check final balance
    final_balance = await client.get_balance(my_address)
    print(f"\nFinal balance: {format_usdc(final_balance)}")

    log("🎉", "Transaction lifecycle demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
