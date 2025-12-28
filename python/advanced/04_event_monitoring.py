#!/usr/bin/env python3
"""
Advanced API Example 04: Event Monitoring

Demonstrates real-time transaction state monitoring.
Useful for building dashboards and notification systems.

This example demonstrates:
- Transaction state watching
- Polling patterns
- Event streaming simulation
- State change callbacks

Run: python advanced/04_event_monitoring.py
"""

import asyncio
import sys
from pathlib import Path
from typing import Any, Callable, List, Optional
from dataclasses import dataclass
from enum import Enum

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section, format_state


class WatcherState(Enum):
    IDLE = "idle"
    WATCHING = "watching"
    STOPPED = "stopped"


@dataclass
class StateChange:
    """Represents a state change event."""
    tx_id: str
    old_state: Any
    new_state: Any
    timestamp: float


class TransactionWatcher:
    """Watches transactions for state changes."""

    def __init__(self, client: Any, poll_interval: float = 0.5):
        self.client = client
        self.poll_interval = poll_interval
        self.watched_txs: dict[str, Any] = {}  # tx_id -> last known state
        self.callbacks: List[Callable[[StateChange], None]] = []
        self.state = WatcherState.IDLE
        self._task: Optional[asyncio.Task] = None

    def watch(self, tx_id: str) -> None:
        """Add a transaction to the watch list."""
        if tx_id not in self.watched_txs:
            self.watched_txs[tx_id] = None
            print(f"[Watcher] Now watching: {tx_id[:16]}...")

    def unwatch(self, tx_id: str) -> None:
        """Remove a transaction from the watch list."""
        if tx_id in self.watched_txs:
            del self.watched_txs[tx_id]
            print(f"[Watcher] Stopped watching: {tx_id[:16]}...")

    def on_state_change(self, callback: Callable[[StateChange], None]) -> None:
        """Register a callback for state changes."""
        self.callbacks.append(callback)

    async def start(self) -> None:
        """Start the watcher."""
        if self.state == WatcherState.WATCHING:
            return

        self.state = WatcherState.WATCHING
        self._task = asyncio.create_task(self._poll_loop())
        print("[Watcher] Started")

    async def stop(self) -> None:
        """Stop the watcher."""
        if self._task:
            self.state = WatcherState.STOPPED
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        print("[Watcher] Stopped")

    async def _poll_loop(self) -> None:
        """Main polling loop."""
        import time

        while self.state == WatcherState.WATCHING:
            for tx_id, last_state in list(self.watched_txs.items()):
                try:
                    tx = await self.client.standard.get_transaction(tx_id)
                    if tx:
                        current_state = tx.state
                        if last_state is not None and current_state != last_state:
                            # State changed!
                            change = StateChange(
                                tx_id=tx_id,
                                old_state=last_state,
                                new_state=current_state,
                                timestamp=time.time(),
                            )
                            for callback in self.callbacks:
                                callback(change)
                        self.watched_txs[tx_id] = current_state
                except Exception as e:
                    print(f"[Watcher] Error checking {tx_id[:16]}...: {e}")

            await asyncio.sleep(self.poll_interval)


async def main() -> None:
    log_section("AGIRAILS Advanced API - Event Monitoring")

    clear_mock_state()

    from agirails import ACTPClient, is_mock_runtime

    requester_address = "0x1111111111111111111111111111111111111111"
    provider_address = "0x2222222222222222222222222222222222222222"

    log("🔧", "Creating client...")

    client = await ACTPClient.create(
        mode="mock",
        requester_address=requester_address,
    )

    await client.mint_tokens(requester_address, 100_000_000)
    log("✅", "Client ready")

    # =====================================================
    # Part 1: Transaction Watcher Setup
    # =====================================================
    log_section("Part 1: Setting Up Watcher")

    watcher = TransactionWatcher(client, poll_interval=0.2)

    # Track state changes
    state_changes: List[StateChange] = []

    def on_change(change: StateChange) -> None:
        state_changes.append(change)
        print(
            f"[EVENT] State change: "
            f"{change.tx_id[:12]}... "
            f"{format_state(change.old_state)} -> {format_state(change.new_state)}"
        )

    watcher.on_state_change(on_change)

    await watcher.start()
    print()

    # =====================================================
    # Part 2: Create and Watch Transactions
    # =====================================================
    log_section("Part 2: Creating Transactions")

    # Create multiple transactions
    tx_ids = []
    for i in range(3):
        tx_id = await client.standard.create_transaction({
            "provider": provider_address,
            "amount": 10 * (i + 1),  # $10, $20, $30
            "deadline": "+1h",
            "dispute_window": 3600,
        })
        tx_ids.append(tx_id)
        watcher.watch(tx_id)
        print(f"Created TX {i + 1}: {tx_id[:16]}... (${10 * (i + 1)})")

    await asyncio.sleep(0.5)  # Let watcher pick up initial states
    print()

    # =====================================================
    # Part 3: Trigger State Changes
    # =====================================================
    log_section("Part 3: Triggering State Changes")

    log("💳", "Linking escrow for all transactions...")
    for tx_id in tx_ids:
        await client.standard.link_escrow(tx_id)
        await asyncio.sleep(0.3)  # Allow watcher to detect each change

    print()

    log("📦", "Transitioning to DELIVERED...")
    for tx_id in tx_ids:
        await client.standard.transition_state(tx_id, "DELIVERED")
        await asyncio.sleep(0.3)

    print()

    # Advance time and settle
    runtime = client.advanced
    if is_mock_runtime(runtime):
        log("⏳", "Advancing time past dispute window...")
        await runtime.time.advance_time(3700)

    log("💸", "Releasing escrow...")
    for tx_id in tx_ids:
        tx = await client.standard.get_transaction(tx_id)
        if tx and tx.escrow_id:
            await client.standard.release_escrow(tx.escrow_id)
            await asyncio.sleep(0.3)

    await asyncio.sleep(0.5)  # Final poll

    # =====================================================
    # Part 4: Event Summary
    # =====================================================
    log_section("Part 4: Event Summary")

    print(f"Total state changes detected: {len(state_changes)}")
    print()

    # Group by transaction
    from collections import defaultdict
    by_tx: dict[str, List[StateChange]] = defaultdict(list)
    for change in state_changes:
        by_tx[change.tx_id].append(change)

    for tx_id, changes in by_tx.items():
        print(f"Transaction {tx_id[:12]}...:")
        for change in changes:
            print(f"  {format_state(change.old_state)} -> {format_state(change.new_state)}")
        print()

    # =====================================================
    # Part 5: Real-World Usage
    # =====================================================
    log_section("Part 5: Real-World Usage Patterns")

    print("Common monitoring patterns:")
    print()
    print("1. Dashboard Updates")
    print("   - Poll transactions every 5-10 seconds")
    print("   - Update UI on state changes")
    print("   - Show notifications for DELIVERED/DISPUTED")
    print()
    print("2. Webhook Integration")
    print("   - Watch for DELIVERED state")
    print("   - Send webhook to external system")
    print("   - Trigger automated verification")
    print()
    print("3. Alert System")
    print("   - Monitor for DISPUTED state")
    print("   - Alert operations team")
    print("   - Track dispute window expiry")
    print()
    print("4. Analytics Pipeline")
    print("   - Stream all state changes to data warehouse")
    print("   - Calculate metrics: settlement time, dispute rate")
    print("   - Generate reports")

    # Stop watcher
    await watcher.stop()

    log("🎉", "Event monitoring demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
