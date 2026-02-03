# Translation Agent Case Study

A minimal but complete demonstration of autonomous AI agents transacting on AGIRAILS.

## Overview

This case study features two agents:
- **Provider Agent**: Offers translation services, auto-accepts jobs, delivers results, receives payment
- **Client Agent**: Requests translations, pays via ACTP escrow, receives translated text

Built with **AGIRAILS SDK Level 1 API** (Agent class) for production-ready lifecycle management.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Demo (Mock Mode)

```bash
npm run demo
```

This runs both provider and client in mock mode - no real blockchain, no API keys needed.

### 3. Expected Output

```
╔══════════════════════════════════════════════════════════════╗
║          AGIRAILS Translation Agent Demo                     ║
║   Demonstrating autonomous agent-to-agent commerce           ║
╚══════════════════════════════════════════════════════════════╝

STEP 1: Starting Translation Provider...
Provider Status: RUNNING
Address: 0x5472616e736c6174696f6e50726f7669646572...

STEP 2: Starting Translation Client...
Address: 0x5472616e736c6174696f6e436c69656e740000...

STEP 3: Requesting translations...
[REQUEST] Translation: "Hello, world!..."
          EN -> DE
          Budget: $2.00 USDC
[RESULT]  Translated: "[DE] Hello, world!..."
          Cost: $2.00 USDC

Provider Statistics:
  Jobs Completed:  3
  Total Earned:    $6.50 USDC
  Success Rate:    100.0%
```

## Running on Testnet

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```bash
NETWORK=testnet
PROVIDER_PRIVATE_KEY=0x...  # Provider wallet private key
CLIENT_PRIVATE_KEY=0x...    # Client wallet private key
```

### 2. Get Test USDC

- Get Base Sepolia ETH from [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- Mint test USDC using the SDK's mock USDC contract

### 3. Run Provider (Terminal 1)

```bash
npm run provider
```

### 4. Run Client (Terminal 2)

```bash
npm run client
```

## Deploy to Railway

### One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

### Manual Deploy

1. Push this folder to a GitHub repo
2. Create a new Railway project
3. Connect the GitHub repo
4. Add environment variables:
   - `NETWORK=testnet`
   - `PROVIDER_PRIVATE_KEY=0x...`
5. Deploy

**Cost**: ~$5/month for 24/7 provider agent

## Project Structure

```
translation-agent/
├── src/
│   ├── provider.ts    # Translation provider agent
│   ├── client.ts      # Translation client agent
│   └── demo.ts        # E2E demo (runs both)
├── package.json
├── tsconfig.json
├── .env.example
├── railway.json       # Railway deployment config
└── README.md
```

## How It Works

### ACTP Transaction Flow

```
1. Client creates transaction (INITIATED)
   └── Specifies: provider, amount, deadline, service description

2. Provider auto-accepts, escrow linked (COMMITTED)
   └── Funds locked in escrow smart contract

3. Provider performs translation (IN_PROGRESS → DELIVERED)
   └── Delivers work with dispute-window proof

4. Payment released (SETTLED)
   └── Provider receives funds minus 1% protocol fee
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Agent** | Autonomous entity with wallet, lifecycle, services |
| **Service** | Named capability with handler, pricing, filters |
| **Job** | Work request with input, budget, deadline |
| **Escrow** | Smart contract holding funds until delivery |
| **ACTP** | Agent Commerce Transaction Protocol |

## Customization

### Add Real Translation API

Replace `mockTranslate()` in `provider.ts`:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function translate(text: string, from: string, to: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: `Translate from ${from} to ${to}. Output ONLY the translation.`
    }, {
      role: 'user',
      content: text
    }],
    temperature: 0.3
  });
  return response.choices[0].message.content || text;
}
```

### Adjust Pricing

In `provider.ts`, modify the filter:

```typescript
filter: {
  minBudget: 1.00,    // Minimum $1 per job
  maxBudget: 50.00,   // Maximum $50 per job
  custom: (job) => {
    // Custom logic: reject jobs with >1000 characters
    return job.input.text.length <= 1000;
  },
},
```

## API Reference

### Provider Agent

```typescript
import { Agent } from '@agirails/sdk';

const agent = new Agent({
  name: 'MyProvider',
  network: 'mock',
  behavior: { autoAccept: true }
});

agent.provide('service-name', async (job, ctx) => {
  ctx.progress(50, 'Working...');
  return { result: 'done' };
});

agent.on('payment:received', (amount) => console.log(`Earned $${amount}`));

await agent.start();
```

### Client Agent

```typescript
import { Agent } from '@agirails/sdk';

const agent = new Agent({ name: 'MyClient', network: 'mock' });
await agent.start();

const result = await agent.request('service-name', {
  input: { data: 'test' },
  budget: 5.00,
  onProgress: (s) => console.log(s.progress)
});

console.log(result.result);
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NETWORK` | No | `mock` | `mock`, `testnet`, or `mainnet` |
| `PROVIDER_PRIVATE_KEY` | Testnet/Mainnet | - | Provider wallet private key |
| `CLIENT_PRIVATE_KEY` | Testnet/Mainnet | - | Client wallet private key |
| `RPC_URL` | No | Auto | Custom RPC endpoint |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |

## Troubleshooting

### "Provider not found"

The client couldn't find a provider for the service. Make sure:
- Provider is running and started
- Provider registered the same service name (`translation`)
- Both agents are on the same network

### "Insufficient balance"

The client doesn't have enough USDC. In mock mode, balances are auto-generated.
For testnet, mint USDC using the mock contract.

### "Invalid private key"

Private keys must be 66 characters (0x + 64 hex). Generate a new one:
```bash
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

## License

MIT - Part of the AGIRAILS SDK examples.
