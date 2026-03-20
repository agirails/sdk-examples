# Testnet Examples

Real transactions on Base Sepolia testnet.

## Prerequisites

1. **Private Key**: Set `PRIVATE_KEY` in `.env`
2. **Testnet ETH**: Get from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)
3. **MockUSDC**: Run `npx ts-node testnet/mint-usdc.ts`

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
npx ts-node testnet/mint-usdc.ts
```

## Examples

| File | Description |
|------|-------------|
| `mint-usdc.ts` | Mint MockUSDC to your wallet |
| `01-real-transaction.ts` | Create a real transaction on-chain |

## Running

```bash
# Mint test tokens first
npx ts-node testnet/mint-usdc.ts

# Run real transaction
npx ts-node testnet/01-real-transaction.ts
```

## Block Explorer

View transactions: https://sepolia.basescan.org
