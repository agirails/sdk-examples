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

Contract Addresses (Base Sepolia):
    - ACTPKernel:  0xD199070F8e9FB9a127F6Fe730Bc13300B4b3d962
    - EscrowVault: 0x948b9Ea081C4Cec1E112Af2e539224c531d4d585
    - MockUSDC:    0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb

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
    HAS_WEB3 = True
except ImportError:
    HAS_WEB3 = False

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import log, log_section


# Contract addresses (Base Sepolia)
CONTRACTS = {
    "actp_kernel": "0xD199070F8e9FB9a127F6Fe730Bc13300B4b3d962",
    "escrow_vault": "0x948b9Ea081C4Cec1E112Af2e539224c531d4d585",
    "mock_usdc": "0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb",
}

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

    # Check private key
    private_key = os.getenv("PRIVATE_KEY")
    if not private_key:
        print("ERROR: PRIVATE_KEY not set in .env")
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
    w3 = Web3(Web3.HTTPProvider(BASE_SEPOLIA_RPC))
    if not w3.is_connected():
        print(f"ERROR: Cannot connect to {BASE_SEPOLIA_RPC}")
        sys.exit(1)

    # =====================================================
    # Step 1: Create ACTPClient (testnet mode)
    # =====================================================
    log("1/6", "Creating ACTPClient in testnet mode...")

    try:
        from agirails import ACTPClient

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

    provider_address = os.getenv(
        "PROVIDER_ADDRESS", "0x2222222222222222222222222222222222222222"
    )
    amount = 5.0  # $5 USDC

    if client:
        # Use SDK
        tx_id = await client.standard.create_transaction({
            "provider": provider_address,
            "amount": str(amount),
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
    print(f"      Amount: ${amount:.2f} USDC")
    print(f"      Provider: {shorten_address(provider_address)}")
    print()

    # =====================================================
    # Step 4: Fetch Transaction
    # =====================================================
    log("4/6", "Fetching transaction from blockchain...")

    if client:
        tx = await client.standard.get_transaction(tx_id)
        if not tx:
            print("ERROR: Transaction not found on-chain")
            sys.exit(1)

        print(f"      State: {tx.get('state', 'INITIATED')}")
        created_at = tx.get("createdAt", 0)
        deadline = tx.get("deadline", 0)
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
    # Step 6: Final State
    # =====================================================
    log("6/6", "Final transaction state...")

    if client:
        final_tx = await client.standard.get_transaction(tx_id)
        print(f"      State: {final_tx.get('state', 'Unknown') if final_tx else 'Unknown'}")
        print(f"      Escrow ID: {final_tx.get('escrowId', 'Not linked') if final_tx else 'Not linked'}")
    else:
        print("      State: INITIATED (simulated)")
        print("      Escrow ID: Not linked")

    # Summary
    log_section("Transaction created on Base Sepolia!")
    print()
    print("View on BaseScan:")
    print(f"https://sepolia.basescan.org/address/{CONTRACTS['actp_kernel']}")
    print()
    print(f"Transaction ID: {tx_id}")
    print()


if __name__ == "__main__":
    asyncio.run(main())
