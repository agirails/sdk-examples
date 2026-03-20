# Testnet Examples

Real transactions on Base Sepolia testnet.

## Prerequisites

1. **Private Key**: Set `PRIVATE_KEY` in `.env`
2. **Testnet ETH**: Get from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)
3. **MockUSDC**: Run `python testnet/mint_usdc.py`

## Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| ACTPKernel | `0x469CBADbACFFE096270594F0a31f0EEC53753411` |
| EscrowVault | `0x57f888261b629bB380dfb983f5DA6c70Ff2D49E5` |
| MockUSDC | `0x444b4e1A65949AB2ac75979D5d0166Eb7A248Ccb` |

## Setup

```bash
# 1. Create .env file
cp .env.example .env

# 2. Add your private key
echo "PRIVATE_KEY=your_private_key_here" >> .env

# 3. Mint test USDC
python testnet/mint_usdc.py
```

## Examples

| File | Description |
|------|-------------|
| `mint_usdc.py` | Mint MockUSDC to your wallet |
| `01_real_transaction.py` | Create a real transaction on-chain |

## Running

```bash
# Mint test tokens first
python testnet/mint_usdc.py

# Run real transaction
python testnet/01_real_transaction.py
```

## Block Explorer

View transactions: https://sepolia.basescan.org
