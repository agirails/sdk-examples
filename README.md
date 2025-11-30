# AGIRAILS SDK Examples

Complete, production-ready examples demonstrating the AGIRAILS SDK for the Agent Commerce Transaction Protocol (ACTP).

## Quick Start

### Prerequisites

- **Node.js** >= 16.0.0
- **Base Sepolia testnet wallets** with:
  - Requester key: ~0.01 ETH + ~50 USDC
  - Provider key: ~0.01 ETH (can reuse USDC from requester if desired)
  - Use faucets for ETH ([get from faucet](https://portal.cdp.coinbase.com/products/faucet))
  - Contact team for USDC or see [Installation Guide](https://docs.agirails.io/installation))
- Basic TypeScript/JavaScript knowledge

### Installation

```bash
# Clone repository
git clone https://github.com/agirails/sdk-examples
cd sdk-examples

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your PRIVATE_KEY (requester) and PROVIDER_PRIVATE_KEY (provider) without 0x prefix
```

### Run Examples

```bash
# Example 1: Complete transaction lifecycle (create → fund → deliver → settle)
npm run example:happy-path

# Example 2: Dispute flow demonstration
npm run example:dispute

# Example 3: Batch operations (multiple transactions in parallel)
npm run example:batch

# Example 4: Real-time event monitoring
npm run example:events

# Example 5: EAS attestations for delivery proofs
npm run example:eas
```

---

## Examples Overview

### 01: Happy Path (`examples/01-happy-path.ts`)

**What it does**: Demonstrates the complete ACTP transaction lifecycle from creation to settlement.

**Steps**:
1. Create transaction (requester pays provider)
2. Fund transaction (approve USDC + link escrow)
3. Transition to IN_PROGRESS (provider signals work started)
4. Transition to DELIVERED (provider completes work)
5. Wait for dispute window
6. Release escrow (settle payment)

**Gas note**: End-to-end lifecycle touches multiple contracts (kernel + escrow + token). Expect several hundred thousand gas across the flow; actual cost depends on network conditions.

**Learn about**:
- Transaction creation with deadlines
- Escrow funding and auto-transitions
- State machine progression
- Dispute windows
- Payment settlement

**Run time**: ~3-5 minutes (includes 2-minute dispute window)

---

### 02: Dispute Flow (`examples/02-dispute-flow.ts`)

**What it does**: Shows how disputes work when requester is unsatisfied with delivery.

**Steps**:
1. Create and fund transaction
2. Provider delivers work
3. Requester raises dispute with reason and evidence
4. Explains resolution process (requires mediator)

**Gas note**: Dispute paths add extra calls; expect higher gas than happy-path.

**Learn about**:
- Raising disputes with evidence (IPFS)
- Dispute state and mediator resolution
- Payment split mechanisms
- Penalty systems for false disputes

**Run time**: ~1-2 minutes

---

### 03: Batch Operations (`examples/03-batch-operations.ts`)

**What it does**: Demonstrates parallel transaction creation and state management for efficiency.

**Steps**:
1. Create 3 transactions in parallel
2. Fund all transactions simultaneously
3. Batch state transitions
4. Performance metrics and gas analysis

**Gas note**: Batch creation/funding multiplies gas by count; use for throughput, not savings.

**Learn about**:
- Promise.all for parallel execution
- Batch funding patterns
- Performance optimization
- Managing multiple providers

**Run time**: ~30 seconds

---

### 04: Event Monitoring (`examples/04-event-monitoring.ts`)

**What it does**: Real-time blockchain event monitoring for automated workflows.

**Steps**:
1. Subscribe to global events (TransactionCreated, StateChanged, EscrowReleased)
2. Watch specific transaction state changes
3. Use waitForState pattern with timeout
4. Query transaction history
5. Proper cleanup (unsubscribe)

**Gas note**: Event subscriptions are off-chain; on-chain queries still cost gas.

**Learn about**:
- Event listeners and subscriptions
- Real-time transaction monitoring
- Provider bot patterns
- Dashboard integration
- Event-driven automation

**Run time**: ~1 minute

---

### 05: EAS Attestations (`examples/05-eas-attestations.ts`)

**What it does**: Ethereum Attestation Service integration for cryptographic delivery proofs.

**Steps**:
1. Generate delivery proof (content hash)
2. Create on-chain EAS attestation
3. Anchor attestation UID to transaction
4. Verify attestation before settlement
5. Secure settlement with verification

**Gas note**: EAS attestation + verification adds extra on-chain cost; factor in attestation fees.

**Learn about**:
- EAS attestation creation
- Delivery proof generation
- On-chain verification
- Security best practices
- Attestation anchoring

**Run time**: ~6-8 minutes (includes dispute window)

---

## Project Structure

```
sdk-examples/
├── examples/
│   ├── 01-happy-path.ts         # Complete transaction lifecycle
│   ├── 02-dispute-flow.ts       # Dispute handling
│   ├── 03-batch-operations.ts   # Parallel transaction processing
│   ├── 04-event-monitoring.ts   # Real-time event watching
│   └── 05-eas-attestations.ts   # EAS delivery proofs
├── src/
│   └── utils/
│       └── helpers.ts           # Shared utilities (logging, formatting)
├── package.json                 # Scripts and dependencies
├── tsconfig.json                # TypeScript configuration
├── .env.example                 # Environment template
├── .gitignore
└── README.md                    # This file
```

---

## Common Patterns

### Initialize Client

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY
});

const myAddress = await client.getAddress();
```

### Create Transaction

```typescript
import { parseUnits } from 'ethers';

const txId = await client.kernel.createTransaction({
  requester: await client.getAddress(),
  provider: '0xProviderAddress...',
  amount: parseUnits('10', 6), // 10 USDC (6 decimals)
  deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours
  disputeWindow: 7200 // 2 hours
});
```

### Fund Transaction

```typescript
// Convenience method (approve + link escrow in one call)
const escrowId = await client.fundTransaction(txId);

// Or manual approach:
const config = client.getNetworkConfig();
await client.escrow.approveToken(config.contracts.usdc, amount);
const escrowId = ethers.id(`escrow-${Date.now()}`);
await client.kernel.linkEscrow(txId, config.contracts.escrowVault, escrowId);
```

### Monitor State Changes

```typescript
import { State } from '@agirails/sdk';

const unsubscribe = client.events.watchTransaction(txId, (state) => {
  console.log('New state:', State[state]);

  if (state === State.DELIVERED) {
    console.log('Provider delivered!');
  }
});

// Later: cleanup
unsubscribe();
```

### Wait for State

```typescript
import { State } from '@agirails/sdk';

try {
  await client.events.waitForState(txId, State.DELIVERED, 60000); // 1 minute timeout
  console.log('Transaction delivered!');
} catch (error) {
  console.error('Timeout waiting for delivery');
}
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Your private key (WITHOUT 0x prefix)
PRIVATE_KEY=your_private_key_here

# Optional: Custom RPC URL
# RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY

# Optional: Second wallet for testing
# PROVIDER_PRIVATE_KEY=another_private_key

# Network (base-sepolia or base-mainnet)
NETWORK=base-sepolia
```

**Security**:
- ✅ `.env` is in `.gitignore` (NEVER commit secrets!)
- ✅ Use testnet wallets only
- ✅ Keep private keys secure

---

## Gas Costs Summary

All costs estimated on **Base Sepolia** (L2 = very cheap):

| Operation | Gas Units | Cost (USD)* |
|-----------|-----------|-------------|
| Create Transaction | ~85,000 | ~$0.001 |
| Fund Transaction | ~120,000 | ~$0.001 |
| State Transition | ~45,000 | ~$0.0005 |
| Anchor Attestation | ~50,000 | ~$0.0005 |
| Release Escrow | ~65,000 | ~$0.0007 |
| **Full Happy Path** | **~365,000** | **~$0.004** |

*Costs at ~0.001 gwei Base L2 gas prices. May vary.

---

## Troubleshooting

### "PRIVATE_KEY not found"

- Make sure `.env` file exists
- Copy `.env.example` to `.env`
- Add your private key (without `0x` prefix)

### "Insufficient USDC balance"

- Get testnet USDC from faucet or contact team
- Check balance: See examples for balance checking code

### "Transaction reverted: Deadline passed"

- Increase deadline in transaction creation
- Current: 1 hour (`+ 3600`)
- Try: 24 hours (`+ 86400`)

### "Network error"

- Check internet connection
- Try custom RPC URL (Alchemy or Infura)
- Set `RPC_URL` in `.env`

### "Module not found"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Import Errors

```bash
# Rebuild TypeScript
npx tsc --build --force
```

---

## Additional Resources

- **SDK Documentation**: [docs.agirails.io/sdk-reference](https://docs.agirails.io/sdk-reference)
- **Protocol Spec (Yellow Paper)**: [docs.agirails.io/yellow-paper](https://docs.agirails.io/yellow-paper)
- **Installation Guide**: [docs.agirails.io/installation](https://docs.agirails.io/installation)
- **GitHub Repository**: [github.com/agirails/sdk-js](https://github.com/agirails/sdk-js)
- **Discord Community**: Join for support and updates

---

## State Machine Reference

```
INITIATED (0)
  ↓ (create transaction)
  ├→ QUOTED (1) [optional]
  │   ↓ (provider submits price quote)
  ├→ COMMITTED (2)
  │   ↓ (linkEscrow auto-transitions, funds locked)
  ├→ IN_PROGRESS (3) [optional]
  │   ↓ (provider signals active work)
  ├→ DELIVERED (4)
  │   ↓ (provider submits result + proof)
  │   ├→ DISPUTED (6)
  │   │   ↓ (mediator resolves)
  │   ├→ SETTLED (5) [terminal]
  │       (funds released)
  └→ CANCELLED (7) [terminal]
      (refunded before delivery)
```

**Key Rules**:
- All transitions are **one-way** (no backwards movement)
- **QUOTED** and **IN_PROGRESS** are optional states
- **linkEscrow()** auto-transitions to COMMITTED
- **SETTLED** and **CANCELLED** are terminal states

---

## Contributing

Found a bug or have a suggestion?

1. Open an issue: [github.com/agirails/sdk-examples/issues](https://github.com/agirails/sdk-examples/issues)
2. Submit PR with improvements
3. Join Discord to discuss

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

## Support

- **Documentation**: [docs.agirails.io](https://docs.agirails.io)
- **Email**: developers@agirails.io
- **Discord**: [discord.gg/agirails](https://discord.gg/agirails)
- **GitHub Issues**: [github.com/agirails/sdk-examples/issues](https://github.com/agirails/sdk-examples/issues)

---

Built with ❤️ by the AGIRAILS team
