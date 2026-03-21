#!/usr/bin/env python3
"""
Testnet Example 01: Real Transaction on Base Sepolia

This example creates an ACTUAL transaction on the Base Sepolia testnet.
Real ETH (for gas) and MockUSDC are used.

Prerequisites:
    1. Set PRIVATE_KEY in .env (wallet with testnet ETH)
    2. Set PROVIDER_PRIVATE_KEY in .env (optional, for full flow)
    3. Get testnet ETH from https://www.coinbase.com/faucets/base-sepolia-faucet
    4. Mint MockUSDC: python testnet/mint_usdc.py

Contract addresses are loaded from SDK's network config.
Use `from agirails import get_network` to access them programmatically.

Run: python testnet/01_real_transaction.py
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check if required packages are available
try:
    from web3 import Web3
    from eth_account import Account
    import requests as req_lib
    HAS_WEB3 = True
except ImportError:
    HAS_WEB3 = False


def create_web3(rpc_url: str) -> "Web3":
    """Create Web3 instance with custom user-agent to avoid 403 from public RPCs."""
    class CustomHTTPProvider(Web3.HTTPProvider):
        def make_request(self, method, params):
            response = req_lib.post(
                self.endpoint_uri,
                json={"jsonrpc": "2.0", "method": method, "params": params, "id": 1},
                headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
                timeout=30,
            )
            return response.json()
    return Web3(CustomHTTPProvider(rpc_url))

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import log, log_section


# Contract addresses loaded from SDK (Base Sepolia)
# Use get_network('base-sepolia').contracts for programmatic access
CONTRACTS = None  # Will be loaded from SDK

# Network config
BASE_SEPOLIA_RPC = os.getenv("RPC_URL", "https://sepolia.base.org")
CHAIN_ID = 84532
USDC_DECIMALS = 6


def format_usdc(amount_wei: int) -> str:
    """Format wei to USDC string."""
    return f"${amount_wei / 10**USDC_DECIMALS:.2f}"


def parse_usdc(amount: float) -> int:
    """Parse USDC amount to wei."""
    return int(amount * 10**USDC_DECIMALS)


def shorten_address(addr: str) -> str:
    """Shorten address for display."""
    return f"{addr[:10]}..."


# USDC ABI (minimal)
USDC_ABI = [
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]


async def main() -> None:
    log_section("AGIRAILS Testnet - Real Transaction on Base Sepolia")

    # Check web3 installation
    if not HAS_WEB3:
        print("ERROR: web3 not installed")
        print("Run: pip install web3")
        sys.exit(1)

    # Check private key (try both names)
    private_key = os.getenv("PRIVATE_KEY") or os.getenv("CLIENT_PRIVATE_KEY")
    if not private_key:
        print("ERROR: PRIVATE_KEY or CLIENT_PRIVATE_KEY not set in .env")
        print()
        print("To run this example:")
        print("1. Create a .env file with PRIVATE_KEY=your_key_here")
        print("2. Get testnet ETH from Base Sepolia faucet")
        print("3. Run: python testnet/mint_usdc.py")
        sys.exit(1)

    # Add 0x prefix if missing
    if not private_key.startswith("0x"):
        private_key = f"0x{private_key}"

    # Create wallet
    account = Account.from_key(private_key)
    wallet_address = account.address

    print(f"Network: Base Sepolia (chainId: {CHAIN_ID})")
    print(f"Requester: {wallet_address}")
    print()

    # Connect to Base Sepolia
    w3 = create_web3(BASE_SEPOLIA_RPC)
    # Test connection
    try:
        w3.eth.block_number
    except Exception:
        print(f"ERROR: Cannot connect to {BASE_SEPOLIA_RPC}")
        sys.exit(1)

    # =====================================================
    # Step 1: Create ACTPClient (testnet mode)
    # =====================================================
    log("1/6", "Creating ACTPClient in testnet mode...")

    try:
        from agirails import ACTPClient, get_network

        # Load contract addresses from SDK
        global CONTRACTS
        network = get_network("base-sepolia")
        CONTRACTS = {
            "actp_kernel": network.contracts.actp_kernel,
            "escrow_vault": network.contracts.escrow_vault,
            "mock_usdc": network.contracts.usdc,
        }

        client = await ACTPClient.create(
            mode="testnet",
            requester_address=wallet_address,
            private_key=private_key,
            rpc_url=BASE_SEPOLIA_RPC,
        )
        print(f"      Mode: {client.get_mode()}")
        print("      Connected to blockchain")
    except ImportError:
        print("      AGIRAILS SDK not installed, using web3 directly")
        # Fallback to hardcoded addresses
        CONTRACTS = {
            "actp_kernel": "0x0ba0b17554601b30F5406e74d2208f567C12CcFE",
            "escrow_vault": "0xedC62264301A119207f1f89C6bDE4Fd7a7A4CeB4",
            "mock_usdc": "0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb",
        }
        client = None
    print()

    # =====================================================
    # Step 2: Check Balances
    # =====================================================
    log("2/6", "Checking balances...")

    # ETH balance
    eth_balance = w3.eth.get_balance(wallet_address)
    eth_formatted = w3.from_wei(eth_balance, "ether")
    print(f"      ETH Balance: {eth_formatted:.6f} ETH")

    if eth_balance < w3.to_wei(0.001, "ether"):
        print()
        print("ERROR: Insufficient ETH for gas")
        print("Get testnet ETH from: https://www.coinbase.com/faucets/base-sepolia-faucet")
        sys.exit(1)

    # USDC balance
    usdc = w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACTS["mock_usdc"]),
        abi=USDC_ABI,
    )
    usdc_balance = usdc.functions.balanceOf(wallet_address).call()
    print(f"      USDC Balance: {format_usdc(usdc_balance)}")

    if usdc_balance < parse_usdc(10):
        print()
        print("ERROR: Insufficient USDC (need at least $10)")
        print("Run: python testnet/mint_usdc.py")
        sys.exit(1)
    print()

    # =====================================================
    # Step 3: Create Transaction
    # =====================================================
    log("3/6", "Creating transaction on-chain...")

    # Get provider address - try PROVIDER_ADDRESS first, then derive from PROVIDER_PRIVATE_KEY
    provider_address = os.getenv("PROVIDER_ADDRESS")
    if not provider_address:
        provider_key = os.getenv("PROVIDER_PRIVATE_KEY")
        if provider_key:
            provider_account = Account.from_key(provider_key)
            provider_address = provider_account.address
        else:
            # Default to a dummy address for demo purposes
            provider_address = "0x2222222222222222222222222222222222222222"
            print("      Note: Using dummy provider address (set PROVIDER_ADDRESS in .env)")

    amount_usdc = 5.0  # $5 USDC
    amount_wei = parse_usdc(amount_usdc)  # Convert to wei (6 decimals)

    if client:
        # Use SDK - amount in wei as string
        tx_id = await client.standard.create_transaction({
            "provider": provider_address,
            "amount": str(amount_wei),
            "deadline": "+1h",
            "dispute_window": 3600,  # 1 hour minimum
        })
    else:
        # Generate mock transaction ID
        import hashlib
        import time
        tx_id = "0x" + hashlib.sha256(
            f"{wallet_address}{time.time()}".encode()
        ).hexdigest()

    print(f"      Transaction ID: {tx_id}")
    print(f"      Amount: ${amount_usdc:.2f} USDC")
    print(f"      Provider: {shorten_address(provider_address)}")
    print()

    # =====================================================
    # Step 4: Fetch Transaction
    # =====================================================
    log("4/6", "Fetching transaction from blockchain...")

    # Wait for block confirmation (Base Sepolia ~2s block time)
    print("      Waiting for block confirmation...")
    await asyncio.sleep(5)

    if client:
        tx = await client.standard.get_transaction(tx_id)
        if not tx:
            print("ERROR: Transaction not found on-chain")
            print("      (This may be a timing issue - try running again)")
            sys.exit(1)

        # Handle both object and dict return types
        state = getattr(tx, "state", None) or tx.get("state", "INITIATED") if isinstance(tx, dict) else tx.state
        created_at = getattr(tx, "created_at", None) or getattr(tx, "createdAt", 0)
        deadline = getattr(tx, "deadline", 0)

        print(f"      State: {state}")
        if created_at:
            print(f"      Created: {datetime.fromtimestamp(created_at).isoformat()}")
        if deadline:
            print(f"      Deadline: {datetime.fromtimestamp(deadline).isoformat()}")
    else:
        print("      State: INITIATED (simulated)")
        print(f"      Created: {datetime.now().isoformat()}")
    print()

    # =====================================================
    # Step 5: Link Escrow
    # =====================================================
    log("5/6", "Linking escrow (locking funds)...")
    print("      This requires USDC approval + escrow creation...")

    if client:
        try:
            await client.standard.link_escrow(tx_id)
            print("      Escrow linked successfully!")
        except Exception as e:
            print(f"      Escrow linking failed: {e}")
            print()
            print("This is expected if:")
            print("- USDC allowance not set")
            print("- Insufficient USDC balance")
            print()
            print("The transaction was created but escrow not linked.")
    else:
        print("      (SDK not available, skipping escrow)")
    print()

    # =====================================================
    # Step 6: Complete Lifecycle (IN_PROGRESS → DELIVERED → SETTLED)
    # =====================================================
    log("6/9", "Transitioning to IN_PROGRESS...")

    if client:
        try:
            await client.standard.transition_state(tx_id, "IN_PROGRESS")
            print("      State: IN_PROGRESS")
        except Exception as e:
            print(f"      Transition failed: {e}")
            print("      (This is expected if escrow was not linked)")
    print()

    # =====================================================
    # Step 7: Transition to DELIVERED (requires proof on-chain)
    # =====================================================
    log("7/9", "Transitioning to DELIVERED...")
    print("      NOTE: On-chain DELIVERED requires dispute window proof")

    if client:
        try:
            # IMPORTANT: For testnet/mainnet, DELIVERED requires a proof parameter
            # The proof encodes the dispute window: abi.encode(['uint256'], [disputeWindowSeconds])
            from eth_abi import encode
            dispute_window_seconds = 3600  # Must match what was set in create_transaction
            proof = "0x" + encode(["uint256"], [dispute_window_seconds]).hex()

            await client.standard.transition_state(tx_id, "DELIVERED", proof=proof)
            print("      State: DELIVERED")
            print(f"      Dispute window: {dispute_window_seconds}s ({dispute_window_seconds // 60} min)")
        except Exception as e:
            print(f"      Transition failed: {e}")
    print()

    # =====================================================
    # Step 8: Wait for Dispute Window
    # =====================================================
    log("8/9", "Dispute window active...")
    print("      In production, wait for dispute window to expire before settling.")
    print("      For demo purposes, we'll skip ahead.")
    print()

    # =====================================================
    # Step 9: Final State
    # =====================================================
    log("9/9", "Final transaction state...")

    if client:
        final_tx = await client.standard.get_transaction(tx_id)
        if final_tx:
            final_state = getattr(final_tx, "state", "Unknown")
            escrow_id = getattr(final_tx, "escrow_id", None) or getattr(final_tx, "escrowId", "Not linked")
            print(f"      State: {final_state}")
            print(f"      Escrow ID: {escrow_id}")
        else:
            print("      State: Unknown")
            print("      Escrow ID: Not linked")
    else:
        print("      State: INITIATED (simulated)")
        print("      Escrow ID: Not linked")

    print()
    print("  NEXT STEPS (after dispute window expires):")
    print("  - Call client.standard.release_escrow(escrow_id) to settle")
    print("  - Funds will be released to provider")

    # Summary
    log_section("Transaction lifecycle demo on Base Sepolia!")
    print()
    print("View on BaseScan:")
    print(f"https://sepolia.basescan.org/address/{CONTRACTS['actp_kernel']}")
    print()
    print(f"Transaction ID: {tx_id}")
    print()


if __name__ == "__main__":
    asyncio.run(main())
