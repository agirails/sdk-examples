#!/usr/bin/env python3
"""
Testnet Helper: Mint MockUSDC

MockUSDC on Base Sepolia has OPEN MINTING - anyone can mint!
This script mints test USDC to your wallet.

Prerequisites:
    1. Set PRIVATE_KEY in .env
    2. Have testnet ETH for gas

Run: python testnet/mint_usdc.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check if web3 is available
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


# Contract addresses (Base Sepolia)
CONTRACTS = {
    "actp_kernel": "0xD199070F8e9FB9a127F6Fe730Bc13300B4b3d962",
    "escrow_vault": "0x948b9Ea081C4Cec1E112Af2e539224c531d4d585",
    "mock_usdc": "0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb",
}

# Network config
BASE_SEPOLIA_RPC = os.getenv("RPC_URL", "https://sepolia.base.org")
CHAIN_ID = 84532

# Mint amount
MINT_AMOUNT = 1000  # 1000 USDC
USDC_DECIMALS = 6

# MockUSDC ABI (minimal)
USDC_ABI = [
    {
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]


def format_usdc(amount_wei: int) -> str:
    """Format wei to USDC string."""
    return f"{amount_wei / 10**USDC_DECIMALS:.2f}"


def main() -> None:
    print("Minting MockUSDC on Base Sepolia\n")

    # Check web3 installation
    if not HAS_WEB3:
        print("ERROR: web3 not installed")
        print("Run: pip install web3")
        sys.exit(1)

    # Check private key (try both names)
    private_key = os.getenv("PRIVATE_KEY") or os.getenv("CLIENT_PRIVATE_KEY")
    if not private_key:
        print("ERROR: Set PRIVATE_KEY or CLIENT_PRIVATE_KEY in .env")
        print()
        print("Example:")
        print('  echo "PRIVATE_KEY=0x..." >> .env')
        sys.exit(1)

    # Add 0x prefix if missing
    if not private_key.startswith("0x"):
        private_key = f"0x{private_key}"

    # Connect to Base Sepolia
    w3 = create_web3(BASE_SEPOLIA_RPC)
    # Test connection
    try:
        w3.eth.block_number
    except Exception:
        print(f"ERROR: Cannot connect to {BASE_SEPOLIA_RPC}")
        sys.exit(1)

    # Create account from private key
    account = Account.from_key(private_key)
    wallet_address = account.address

    print(f"Wallet: {wallet_address}")
    print(f"MockUSDC: {CONTRACTS['mock_usdc']}")
    print()

    # Check ETH balance
    eth_balance = w3.eth.get_balance(wallet_address)
    print(f"ETH Balance: {w3.from_wei(eth_balance, 'ether'):.6f} ETH")

    if eth_balance < w3.to_wei(0.0001, "ether"):
        print()
        print("ERROR: Need ETH for gas")
        print("Get from: https://www.coinbase.com/faucets/base-sepolia-faucet")
        sys.exit(1)

    # Create USDC contract instance
    usdc = w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACTS["mock_usdc"]),
        abi=USDC_ABI,
    )

    # Check current balance
    balance_before = usdc.functions.balanceOf(wallet_address).call()
    print(f"USDC Before: {format_usdc(balance_before)} USDC")
    print()

    # Mint tokens
    print(f"Minting {MINT_AMOUNT} USDC...")
    mint_amount_wei = MINT_AMOUNT * 10**USDC_DECIMALS

    # Build transaction
    nonce = w3.eth.get_transaction_count(wallet_address)
    gas_price = w3.eth.gas_price

    tx = usdc.functions.mint(wallet_address, mint_amount_wei).build_transaction({
        "chainId": CHAIN_ID,
        "from": wallet_address,
        "nonce": nonce,
        "gas": 100000,
        "gasPrice": gas_price,
    })

    # Sign and send
    signed_tx = w3.eth.account.sign_transaction(tx, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print(f"TX Hash: {tx_hash.hex()}")
    print("Waiting for confirmation...")

    # Wait for receipt
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    if receipt.status == 1:
        print("Confirmed!")
    else:
        print("Transaction failed!")
        sys.exit(1)
    print()

    # Check new balance
    balance_after = usdc.functions.balanceOf(wallet_address).call()
    print(f"USDC After: {format_usdc(balance_after)} USDC")
    print()
    print("Done! You can now run testnet examples.")


if __name__ == "__main__":
    main()
