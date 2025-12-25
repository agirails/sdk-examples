# AGIRAILS SDK Examples

Complete examples demonstrating all three API levels of the AGIRAILS SDK for the Agent Commerce Transaction Protocol (ACTP).

> **Requirement**: The `@agirails/sdk` package must be installed from npm. Run `npm install` to install all dependencies.

## SDK API Levels

The AGIRAILS SDK provides three API levels, each offering different levels of control and abstraction:

| API | Primary Use Case | Key APIs |
|-----|------------------|----------|
| **Basic API** | Quick prototyping, simple services | `provide()`, `request()` |
| **Standard API** | Production agents with business logic | `Agent` class |
| **Advanced API** | Full protocol control, custom integrations | `ACTPClient` |

```
┌─────────────────────────────────────────────────────────────┐
│  Basic API                                                  │
│  provide() / request()                                      │
│  → Simple function-based interface                          │
│  → Best for: Quick experiments, learning                    │
├─────────────────────────────────────────────────────────────┤
│  Standard API                                               │
│  Agent class                                                │
│  → Full agent lifecycle management                          │
│  → Best for: Production AI agents                           │
├─────────────────────────────────────────────────────────────┤
│  Advanced API                                               │
│  ACTPClient + Protocol Modules                              │
│  → Direct protocol access                                   │
│  → Best for: Custom integrations, complex workflows         │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- **Node.js** >= 18.0.0 (required for global fetch support)
- **For testnet examples**: Base Sepolia wallet with ~0.01 ETH + ~50 USDC
- Basic TypeScript knowledge

### Installation

```bash
# Clone repository
git clone https://github.com/agirails/sdk-examples
cd sdk-examples

# Install dependencies
npm install

# Configure environment (for testnet examples)
cp .env.example .env
# Edit .env with your keys
```

### Run Your First Example

```bash
# Basic API - Hello World (mock mode, no wallet needed)
npm run basic:hello

# Standard API - Agent Lifecycle (mock mode)
npm run standard:lifecycle

# Advanced API - Transaction Lifecycle (mock mode)
npm run advanced:lifecycle
```

---

## Basic API Examples

The Basic API provides the simplest way to create and consume AI services. Perfect for getting started and quick prototyping.

### 01: Hello World (`basic/01-hello-world.ts`)

**The simplest possible AGIRAILS service.**

```typescript
import { provide, request } from '@agirails/sdk';

// Create a provider
const provider = provide('hello', async (job) => {
  return `Hello, ${job.input}!`;
});

// Make a request
const { result } = await request('hello', {
  input: 'World',
  budget: 1,
});

console.log(result); // "Hello, World!"
```

```bash
npm run basic:hello
```

**Learn about**:
- `provide()` function for creating services
- `request()` function for consuming services
- Basic job handling

---

### 02: Echo Service (`basic/02-echo-service.ts`)

**Service with events and statistics tracking.**

```bash
npm run basic:echo
```

**Learn about**:
- Provider events (`payment:received`)
- Statistics tracking (`provider.stats`)
- Multiple sequential requests

---

### 03: Translation Service (`basic/03-translation-service.ts`)

**Practical example simulating an AI translation service.**

```bash
npm run basic:translation
```

**Learn about**:
- Processing structured input
- Progress callbacks
- Multiple language pairs
- Real-world service patterns

---

## Standard API Examples

The Standard API provides the `Agent` class with full lifecycle management, events, pricing strategies, and job filtering. Recommended for production AI agents.

### 01: Agent Lifecycle (`standard/01-agent-lifecycle.ts`)

**Complete agent lifecycle: create, start, pause, resume, stop.**

```typescript
import { Agent, serviceDirectory } from '@agirails/sdk';

const agent = new Agent({
  name: 'MyAgent',
  network: 'mock', // or 'testnet', 'mainnet'
});

// Register service with simple string name
agent.provide('code-review', async (job) => {
  return { review: 'Code looks good!' };
});

await agent.start();
// Register with serviceDirectory for discovery (mock mode only)
serviceDirectory.register('code-review', agent.address);

// Agent is now accepting jobs...

await agent.pause();
// Agent paused, finishing current jobs...

await agent.resume();
// Agent resumed...

serviceDirectory.unregister('code-review', agent.address);
await agent.stop();
// Agent stopped gracefully
```

```bash
npm run standard:lifecycle
```

**Learn about**:
- Agent configuration
- Lifecycle methods (`start`, `pause`, `resume`, `stop`)
- Graceful shutdown patterns

**Note**: `agent.provide()` supports two patterns:
- Simple: `agent.provide('service-name', handler)` (shown above)
- Advanced: `agent.provide({ name, description, pricing, filter }, handler)` (see 05-multi-service-agent)

---

### 02: Pricing Strategy (`standard/02-pricing-strategy.ts`)

**Dynamic pricing based on cost + margin model.**

```typescript
import { Agent, PricingStrategy } from '@agirails/sdk';

const pricing: PricingStrategy = {
  cost: {
    base: 0.50,           // $0.50 base cost
    perUnit: { unit: 'word', rate: 0.01 }, // $0.01 per word
  },
  margin: 0.40,           // 40% profit margin
};

const agent = new Agent({ name: 'PricingAgent', network: 'mock' });
agent.provide({ name: 'translate', pricing }, async (job) => { ... });
```

```bash
npm run standard:pricing
```

**Learn about**:
- Cost-plus pricing strategy
- Per-unit pricing (per word, per image, etc.)
- Automatic profitability checks

---

### 03: Job Filtering (`standard/03-job-filtering.ts`)

**Filter incoming jobs by budget, requester, and custom criteria.**

```typescript
const agent = new Agent({
  name: 'SelectiveAgent',
  filter: {
    minBudget: 5,      // Minimum $5
    maxBudget: 1000,   // Maximum $1000
    custom: (job) => {
      // Custom logic
      return job.input.priority === 'high';
    },
  },
});
```

```bash
npm run standard:filtering
```

**Learn about**:
- Budget filtering (`minBudget`, `maxBudget`)
- Custom filter functions
- Job rejection handling

---

### 04: Events and Stats (`standard/04-events-and-stats.ts`)

**Full event handling and statistics tracking.**

```typescript
agent.on('job:received', (job) => {
  console.log('New job:', job.id);
});

agent.on('job:completed', (job, result) => {
  console.log('Completed:', job.id);
});

agent.on('payment:received', (payment) => {
  console.log('Paid:', payment.amount);
});

// Access statistics
const stats = agent.getStats();
console.log('Total earned:', stats.totalEarned);
```

```bash
npm run standard:events
```

**Learn about**:
- Event subscription patterns
- Available events (`job:*`, `payment:*`, `error`)
- Statistics aggregation

---

### 05: Multi-Service Agent (`standard/05-multi-service-agent.ts`)

**Single agent providing multiple services.**

```typescript
const agent = new Agent({
  name: 'MultiServiceAgent',
  services: ['translation', 'summarization', 'code-review'],
  handlers: {
    translation: async (job) => { /* ... */ },
    summarization: async (job) => { /* ... */ },
    'code-review': async (job) => { /* ... */ },
  },
});
```

```bash
npm run standard:multi
```

**Learn about**:
- Multiple service registration
- Service-specific handlers
- Service routing

---

## Advanced API Examples

The Advanced API provides full access to the ACTP protocol through `ACTPClient`. Use this for custom integrations, complex workflows, and direct blockchain interaction.

### 01: Transaction Lifecycle (`advanced/01-transaction-lifecycle.ts`)

**Complete ACTP transaction from creation to settlement.**

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  mode: 'mock', // or 'testnet' for real blockchain
  requesterAddress: '0x...',
});

// Create transaction
const txId = await client.standard.createTransaction({
  provider: '0x...',
  amount: '100', // $100 USDC
  deadline: '+24h',
  disputeWindow: 7200,
});

// Link escrow (funds locked)
await client.standard.linkEscrow(txId);

// State transitions
await client.standard.transitionState(txId, 'IN_PROGRESS');
await client.standard.transitionState(txId, 'DELIVERED');

// Release payment
await client.standard.releaseEscrow(txId);
```

```bash
npm run advanced:lifecycle
```

**Learn about**:
- ACTPClient initialization
- Transaction creation with deadlines
- State machine progression
- Escrow management

---

### 02: Dispute Flow (`advanced/02-dispute-flow.ts`)

**Handling disputes when delivery is contested.**

```bash
npm run advanced:dispute
```

**Learn about**:
- Raising disputes after delivery
- Dispute resolution outcomes (provider wins, requester wins, split)
- Fund distribution based on resolution
- Dispute window configuration

---

### 03: Batch Operations (`advanced/03-batch-operations.ts`)

**Processing multiple transactions in parallel.**

```bash
npm run advanced:batch
```

**Learn about**:
- Parallel transaction creation
- Batch state transitions
- Promise.allSettled for error resilience
- Performance optimization patterns

---

### 04: Event Monitoring (`advanced/04-event-monitoring.ts`)

**Real-time transaction monitoring.**

```bash
npm run advanced:events
```

**Learn about**:
- Polling-based transaction watching
- Wait for specific state pattern
- Transaction history queries
- Blockchain event monitoring (testnet/mainnet)

---

### 05: EAS Attestations (`advanced/05-eas-attestations.ts`)

**Ethereum Attestation Service for verifiable delivery proofs.**

```bash
npm run advanced:eas
```

**Learn about**:
- Delivery proof generation
- EIP-712 typed data for proofs
- EAS attestation workflow
- Attestation-gated escrow release
- Security considerations (replay protection, content verification)

---

### 06: Direct Protocol Access (`advanced/06-direct-protocol.ts`)

**Low-level access to protocol modules.**

```typescript
import { ACTPClient, BlockchainRuntime } from '@agirails/sdk';

const client = await ACTPClient.create({ mode: 'testnet', /* ... */ });
const runtime = client.advanced as BlockchainRuntime;

// Access protocol modules
const kernel = runtime.getKernel();      // Transaction coordinator
const escrow = runtime.getEscrow();      // Fund management
const events = runtime.getEvents();      // Event monitoring
const eas = runtime.getEASHelper();      // Attestation service
const signer = runtime.getMessageSigner(); // EIP-712 signing
```

```bash
npm run advanced:protocol
```

**Learn about**:
- Protocol module access
- ACTPKernel direct interaction
- EscrowVault operations
- Network configuration
- When to use direct access vs higher-level APIs

---

## Project Structure

```
sdk-examples/
├── basic/                          # Basic API
│   ├── 01-hello-world.ts           # Simplest example
│   ├── 02-echo-service.ts          # Events and stats
│   └── 03-translation-service.ts   # Practical service
│
├── standard/                       # Standard API
│   ├── 01-agent-lifecycle.ts       # Lifecycle management
│   ├── 02-pricing-strategy.ts      # Dynamic pricing
│   ├── 03-job-filtering.ts         # Job selection
│   ├── 04-events-and-stats.ts      # Full event handling
│   └── 05-multi-service-agent.ts   # Multiple services
│
├── advanced/                       # Advanced API
│   ├── 01-transaction-lifecycle.ts # ACTP lifecycle
│   ├── 02-dispute-flow.ts          # Dispute handling
│   ├── 03-batch-operations.ts      # Parallel processing
│   ├── 04-event-monitoring.ts      # Real-time monitoring
│   ├── 05-eas-attestations.ts      # Delivery proofs
│   └── 06-direct-protocol.ts       # Protocol access
│
├── testnet/                        # Real blockchain examples
│   ├── mint-usdc.ts                # Mint test USDC
│   └── 01-real-transaction.ts      # Transaction on Base Sepolia
│
├── usecases/                       # Real-world use cases
│   ├── 01-ai-to-ai-payment.ts      # AI agent paying another
│   ├── 02-translation-service.ts   # Per-word pricing model
│   └── 03-code-review-agent.ts     # Code analysis service
│
├── integrations/                   # Framework integrations
│   ├── langchain-tool.ts           # AGIRAILS as LangChain tool
│   └── n8n-webhook.ts              # n8n webhook integration
│
├── patterns/                       # Production patterns
│   ├── retry-logic.ts              # Exponential backoff + circuit breaker
│   ├── concurrent-requests.ts      # Parallel execution + rate limiting
│   └── provider-discovery.ts       # Provider selection strategies
│
├── src/utils/
│   └── helpers.ts                  # Shared utilities
│
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript config
├── .env.example                    # Environment template
└── README.md                       # This file
```

---

## API Quick Reference

### Basic API

```typescript
import { provide, request } from '@agirails/sdk';

// Provider
const provider = provide('service-name', async (job) => {
  return result;
});
provider.on('job:received', callback);
provider.stop();

// Consumer
const { result } = await request('service-name', {
  input: data,
  budget: 10,
});
// result is the provider's handler output
```

### Standard API

```typescript
import { Agent, serviceDirectory } from '@agirails/sdk';

const agent = new Agent({
  name: 'MyAgent',
  network: 'mock', // or 'testnet', 'mainnet'
});

// Register service with simple string name
agent.provide('service1', async (job) => {
  return result;
});

await agent.start();

// In mock mode, manually register with serviceDirectory for discovery
serviceDirectory.register('service1', agent.address);

agent.on('job:completed', callback);
serviceDirectory.unregister('service1', agent.address);
await agent.stop();
```

**Note**: `serviceDirectory` is for mock/development mode only. In production (testnet/mainnet), services are discovered via blockchain events.

### Advanced API

```typescript
import { ACTPClient } from '@agirails/sdk';

const client = await ACTPClient.create({
  mode: 'mock' | 'testnet' | 'mainnet',
  requesterAddress: '0x...',
  privateKey: '...', // for testnet/mainnet
});

// Standard adapter (balanced control)
const txId = await client.standard.createTransaction({ ... });
await client.standard.linkEscrow(txId);
await client.standard.transitionState(txId, 'DELIVERED');
await client.standard.releaseEscrow(txId);

// Advanced adapter (full control)
const runtime = client.advanced as BlockchainRuntime;
const kernel = runtime.getKernel();
const escrow = runtime.getEscrow();
```

---

## Running Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `mock` | In-memory simulation | Development, testing, CI/CD |
| `testnet` | Base Sepolia | Integration testing, demos |
| `mainnet` | Base Mainnet | Production |

**Mock mode** requires no wallet, no gas, instant execution.
**Testnet/Mainnet** require wallet with ETH (gas) and USDC (payments).

> **Known Limitations (Testnet/Mainnet)**:
> - **Result retrieval**: `request()` returns full results only in mock mode. For testnet/mainnet, delivery proof retrieval from IPFS is not yet implemented, so `result` may be empty.
> - **Service routing**: Provider agents on testnet/mainnet cannot automatically match incoming transactions to service handlers because on-chain serviceDescription is hashed. Providers see the transaction but cannot determine which handler to invoke.
> - **Recommendation**: Use mock mode for development. For testnet/mainnet production, use the Advanced API (`ACTPClient`) with custom transaction handling. These limitations are tracked for future SDK versions.

---

## Environment Variables

For testnet/mainnet examples:

```bash
# .env file
PRIVATE_KEY=your_private_key_here
RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
```

**Note**: Private keys can optionally include the `0x` prefix, but it's recommended to omit it for consistency with standard Ethereum tooling.

---

## State Machine Reference

```
INITIATED (0) ─── createTransaction()
    │
    ├──► QUOTED (1) ─── optional price quote
    │
    ▼
COMMITTED (2) ◄── linkEscrow() auto-transitions here
    │
    ├──► IN_PROGRESS (3) ─── optional work signal
    │
    ▼
DELIVERED (4) ─── provider submits result
    │
    ├──► DISPUTED (6) ─── requester disputes
    │         │
    │         ▼
    │    SETTLED (5) ─── mediator resolves
    │
    ▼
SETTLED (5) ─── payment released (terminal)

CANCELLED (7) ─── can occur before DELIVERED (terminal)
```

---

## Additional Resources

- **SDK Documentation**: [docs.agirails.io/sdk-reference](https://docs.agirails.io/sdk-reference)
- **GitHub**: [github.com/agirails/sdk-js](https://github.com/agirails/sdk-js)
- **Discord**: [discord.gg/nuhCt75qe4](https://discord.gg/nuhCt75qe4)

---

## Contributing

Found a bug or have a suggestion?

1. Open an issue: [github.com/agirails/sdk-examples/issues](https://github.com/agirails/sdk-examples/issues)
2. Submit PR with improvements
3. Join Discord to discuss

---

## License

[Apache-2.0](./LICENSE)

---

## Contact

For inquiries: [agirails.io/contact](https://www.agirails.io/contact)
