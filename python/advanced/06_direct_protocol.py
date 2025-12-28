#!/usr/bin/env python3
"""
Advanced API Example 06: Direct Protocol Access

Demonstrates direct access to ACTP protocol modules.
For advanced users who need full control over the protocol.

This example demonstrates:
- Direct runtime access
- Kernel module usage
- Escrow module usage
- Event monitoring module
- Time manipulation (mock mode)

Run: python advanced/06_direct_protocol.py
"""

import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section, format_state, format_usdc


async def main() -> None:
    log_section("AGIRAILS Advanced API - Direct Protocol Access")

    clear_mock_state()

    from agirails import (
        ACTPClient,
        MockRuntime,
        is_mock_runtime,
        State,
        CreateTransactionParams,
    )

    # =====================================================
    # Part 1: Runtime Architecture
    # =====================================================
    log_section("Part 1: Runtime Architecture")

    print("ACTP Protocol consists of several modules:")
    print()
    print("  IACTPRuntime (interface)")
    print("  ├── MockRuntime (in-memory, for testing)")
    print("  └── BlockchainRuntime (real blockchain)")
    print()
    print("  Runtime provides:")
    print("  ├── create_transaction()")
    print("  ├── link_escrow()")
    print("  ├── transition_state()")
    print("  ├── get_transaction()")
    print("  ├── get_balance()")
    print("  └── time (TimeInterface)")
    print()

    # =====================================================
    # Part 2: Direct Runtime Creation
    # =====================================================
    log_section("Part 2: Direct Runtime Creation")

    log("🔧", "Creating runtime directly (without ACTPClient)...")

    # Create mock runtime directly
    runtime = MockRuntime()
    await runtime.initialize()

    requester = "0x1111111111111111111111111111111111111111"
    provider = "0x2222222222222222222222222222222222222222"

    log("✅", "Runtime initialized")
    print(f"   Type: {type(runtime).__name__}")
    print(f"   Is Mock: {is_mock_runtime(runtime)}")
    print()

    # =====================================================
    # Part 3: Direct Transaction Creation
    # =====================================================
    log_section("Part 3: Direct Transaction Creation")

    log("📝", "Creating transaction with full parameters...")

    # Mint tokens first
    await runtime.mint_tokens(requester, 100_000_000)
    await runtime.mint_tokens(provider, 100_000_000)

    # Create transaction with all parameters
    tx_id = await runtime.create_transaction(CreateTransactionParams(
        provider=provider,
        requester=requester,
        amount=50_000_000,  # 50 USDC in wei
        deadline=int(time.time()) + 7200,  # 2 hours
        dispute_window=3600,  # 1 hour
        service_description='{"service": "direct-protocol-demo"}',
    ))

    print(f"   Transaction ID: {tx_id[:20]}...")

    # Get transaction details
    tx = await runtime.get_transaction(tx_id)
    print(f"   State: {format_state(tx.state)}")
    print(f"   Amount: {format_usdc(tx.amount)}")
    print(f"   Provider: {tx.provider[:16]}...")
    print(f"   Requester: {tx.requester[:16]}...")
    print()

    # =====================================================
    # Part 4: Direct Escrow Operations
    # =====================================================
    log_section("Part 4: Direct Escrow Operations")

    log("💳", "Linking escrow directly...")

    escrow_id = await runtime.link_escrow(tx_id, 50_000_000)
    print(f"   Escrow ID: {escrow_id[:20]}...")

    # Verify state changed to COMMITTED
    tx = await runtime.get_transaction(tx_id)
    print(f"   State: {format_state(tx.state)}")

    # Check balances
    requester_balance = await runtime.get_balance(requester)
    print(f"   Requester balance: {format_usdc(requester_balance)}")

    # =====================================================
    # Part 5: Direct State Transitions
    # =====================================================
    log_section("Part 5: Direct State Transitions")

    log("🔄", "Transitioning through states...")

    # COMMITTED -> IN_PROGRESS
    await runtime.transition_state(tx_id, State.IN_PROGRESS)
    tx = await runtime.get_transaction(tx_id)
    print(f"   State: {format_state(tx.state)}")

    # IN_PROGRESS -> DELIVERED
    await runtime.transition_state(tx_id, State.DELIVERED)
    tx = await runtime.get_transaction(tx_id)
    print(f"   State: {format_state(tx.state)}")

    # =====================================================
    # Part 6: Time Manipulation (Mock Only)
    # =====================================================
    log_section("Part 6: Time Manipulation")

    if is_mock_runtime(runtime):
        log("⏰", "Using MockRuntime time interface...")

        print(f"   Current time: {runtime.time.now()}")

        # Advance time
        await runtime.time.advance_time(1800)  # 30 minutes
        print(f"   After +30min: {runtime.time.now()}")

        # Advance past dispute window
        await runtime.time.advance_time(2000)  # +33 more minutes
        print(f"   After +33min: {runtime.time.now()}")

        # Set specific time
        specific_time = int(time.time()) + 86400  # Tomorrow
        runtime.time.set_time(specific_time)
        print(f"   Set to tomorrow: {runtime.time.now()}")

    else:
        print("   Time manipulation only available in mock mode")
    print()

    # =====================================================
    # Part 7: State Machine Rules
    # =====================================================
    log_section("Part 7: State Machine Rules")

    from agirails import is_valid_transition, is_terminal_state, STATE_TRANSITIONS

    print("Valid state transitions:")
    print()

    for state, valid_next in STATE_TRANSITIONS.items():
        next_states = ", ".join([format_state(s) for s in valid_next]) or "(none)"
        terminal = " [TERMINAL]" if is_terminal_state(state) else ""
        print(f"  {format_state(state)}{terminal}")
        print(f"    -> {next_states}")
        print()

    # =====================================================
    # Part 8: Error Handling
    # =====================================================
    log_section("Part 8: Error Handling")

    from agirails import (
        TransactionNotFoundError,
        InvalidStateTransitionError,
        InsufficientBalanceError,
    )

    log("⚠️", "Demonstrating protocol errors...")

    # Invalid transaction
    try:
        await runtime.get_transaction("0x" + "0" * 64)
        print("   (should have raised error)")
    except TransactionNotFoundError as e:
        print(f"   TransactionNotFoundError: {e.message[:40]}...")

    # Invalid state transition (can't go backwards)
    try:
        await runtime.transition_state(tx_id, State.COMMITTED)
    except InvalidStateTransitionError as e:
        print(f"   InvalidStateTransitionError: {e.message[:40]}...")

    print()

    # =====================================================
    # Part 9: Protocol Reset (Mock Only)
    # =====================================================
    log_section("Part 9: Protocol Reset")

    if is_mock_runtime(runtime):
        log("🔄", "Resetting mock runtime state...")

        # Count current state
        all_txs = await runtime.get_all_transactions()
        print(f"   Transactions before reset: {len(all_txs)}")

        # Reset
        await runtime.reset()

        all_txs = await runtime.get_all_transactions()
        print(f"   Transactions after reset: {len(all_txs)}")

    # =====================================================
    # Summary
    # =====================================================
    log_section("Summary")

    print("Direct protocol access provides:")
    print()
    print("  1. Full control over transaction lifecycle")
    print("  2. Direct escrow operations")
    print("  3. State machine manipulation")
    print("  4. Time control (mock mode)")
    print("  5. State reset (mock mode)")
    print()
    print("Use cases:")
    print("  - Custom transaction flows")
    print("  - Testing and simulation")
    print("  - Protocol-level integrations")
    print("  - Building alternative SDKs")

    log("🎉", "Direct protocol access demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
