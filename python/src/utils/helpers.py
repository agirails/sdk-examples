"""
AGIRAILS SDK Examples - Helper Functions

Utility functions used across all examples for consistent output formatting,
provider management, and state handling.
"""

import asyncio
import shutil
from pathlib import Path
from typing import Any, Optional


# State name mapping for display
STATE_NAMES = {
    0: "INITIATED",
    1: "QUOTED",
    2: "COMMITTED",
    3: "IN_PROGRESS",
    4: "DELIVERED",
    5: "SETTLED",
    6: "DISPUTED",
    7: "CANCELLED",
}


def log(emoji: str, message: str) -> None:
    """Log a message with an emoji prefix."""
    print(f"{emoji} {message}")


def log_section(title: str) -> None:
    """Print a section header."""
    print()
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)
    print()


def format_state(state: Any) -> str:
    """Format a transaction state for display.

    Args:
        state: State value (int, string, or enum)

    Returns:
        Human-readable state name
    """
    if isinstance(state, int):
        return STATE_NAMES.get(state, f"UNKNOWN({state})")
    if hasattr(state, "value"):
        return STATE_NAMES.get(state.value, str(state))
    return str(state)


def format_usdc(amount: int, decimals: int = 6) -> str:
    """Format a USDC amount from wei to human-readable.

    Args:
        amount: Amount in wei (smallest unit)
        decimals: Number of decimals (default: 6 for USDC)

    Returns:
        Formatted string like "$10.50"
    """
    value = amount / (10 ** decimals)
    return f"${value:.2f}"


def shorten_address(address: str, chars: int = 6) -> str:
    """Shorten an Ethereum address for display.

    Args:
        address: Full Ethereum address
        chars: Number of characters to show on each end

    Returns:
        Shortened address like "0x1234...5678"
    """
    if len(address) <= chars * 2 + 3:
        return address
    return f"{address[:chars]}...{address[-chars:]}"


async def wait_for_provider(provider: Any, timeout: float = 5.0) -> None:
    """Wait for a provider to be ready to accept requests.

    Args:
        provider: Provider instance from provide()
        timeout: Maximum time to wait in seconds

    Raises:
        TimeoutError: If provider doesn't become ready in time
    """
    start = asyncio.get_event_loop().time()

    while True:
        # Check if provider has address (means it's registered)
        if hasattr(provider, "address") and provider.address:
            return

        # Check if provider has status indicating ready
        if hasattr(provider, "status"):
            status = provider.status
            if hasattr(status, "value"):
                status = status.value
            if status in ("running", "started", "ready"):
                return

        # Check timeout
        elapsed = asyncio.get_event_loop().time() - start
        if elapsed >= timeout:
            raise TimeoutError(f"Provider not ready after {timeout}s")

        await asyncio.sleep(0.1)


def clear_mock_state(state_dir: Optional[str] = None) -> None:
    """Clear any previous mock state files.

    Args:
        state_dir: Path to state directory (default: ".actp")
    """
    actp_dir = Path(state_dir or ".actp")
    if actp_dir.exists():
        shutil.rmtree(actp_dir)


def print_transaction(tx: Any, prefix: str = "") -> None:
    """Print transaction details in a formatted way.

    Args:
        tx: Transaction object with id, state, amount, etc.
        prefix: Optional prefix for each line
    """
    print(f"{prefix}Transaction ID: {shorten_address(tx.id, 8)}")
    print(f"{prefix}State: {format_state(tx.state)}")
    if hasattr(tx, "amount"):
        print(f"{prefix}Amount: {format_usdc(tx.amount)}")
    if hasattr(tx, "provider"):
        print(f"{prefix}Provider: {shorten_address(tx.provider, 6)}")
    if hasattr(tx, "requester"):
        print(f"{prefix}Requester: {shorten_address(tx.requester, 6)}")


def print_result(result: Any, prefix: str = "") -> None:
    """Print a request result in a formatted way.

    Args:
        result: RequestResult with result and transaction
        prefix: Optional prefix for each line
    """
    print(f"{prefix}Result: {result.result}")
    if hasattr(result, "transaction"):
        tx = result.transaction
        print(f"{prefix}Transaction ID: {shorten_address(tx.id, 8)}")
        if hasattr(tx, "amount"):
            print(f"{prefix}Amount: {format_usdc(tx.amount)}")
        if hasattr(tx, "duration"):
            print(f"{prefix}Duration: {tx.duration}ms")
