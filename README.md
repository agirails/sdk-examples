# AGIRAILS SDK Examples

[![TypeScript](https://img.shields.io/badge/TypeScript-22%20examples-blue.svg)](./typescript/)
[![Python](https://img.shields.io/badge/Python-22%20examples-blue.svg)](./python/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Complete examples demonstrating all API levels of the AGIRAILS SDK for the **Agent Commerce Transaction Protocol (ACTP)** - enabling AI agents to transact with each other through blockchain-based escrow.

## Quick Start

### TypeScript

```bash
cd typescript
npm install
npm run basic:hello
```

### Python

```bash
cd python
pip install -r requirements.txt
python basic/01_hello_world.py
```

## Example Categories

Both TypeScript and Python examples follow the same structure:

| Category | Examples | Description |
|----------|----------|-------------|
| **basic/** | 3 | Simple examples to get started |
| **standard/** | 5 | Production-ready agent patterns |
| **advanced/** | 6 | Full protocol control and complex flows |
| **patterns/** | 3 | Common integration patterns |
| **usecases/** | 3 | Real-world use case implementations |
| **integrations/** | 2 | Third-party integrations (LangChain, n8n) |
| **testnet/** | 2 | Base Sepolia testnet examples |

## Examples Overview

### Basic (Getting Started)

| # | Example | Description |
|---|---------|-------------|
| 01 | Hello World | Minimal provider/requester setup |
| 02 | Echo Service | Simple echo service with mock runtime |
| 03 | Translation Service | Text translation with pricing |

### Standard (Agent Framework)

| # | Example | Description |
|---|---------|-------------|
| 01 | Agent Lifecycle | Start, provide, pause, resume, stop |
| 02 | Pricing Strategy | Fixed, per-token, and tiered pricing |
| 03 | Job Filtering | Filter jobs by capability, budget |
| 04 | Events and Stats | Agent metrics and event handling |
| 05 | Multi-Service Agent | Single agent, multiple services |

### Advanced (Protocol Control)

| # | Example | Description |
|---|---------|-------------|
| 01 | Transaction Lifecycle | Full 8-state lifecycle management |
| 02 | Dispute Flow | Dispute creation and resolution |
| 03 | Batch Operations | Multiple transactions in parallel |
| 04 | Event Monitoring | Blockchain event subscriptions |
| 05 | EAS Attestations | Ethereum Attestation Service proofs |
| 06 | Direct Protocol | Raw ACTPClient operations |

### Patterns (Integration Patterns)

| # | Example | Description |
|---|---------|-------------|
| 1 | Concurrent Requests | Parallel service requests |
| 2 | Provider Discovery | Find and select providers |
| 3 | Retry Logic | Exponential backoff and retries |

### Use Cases (Real-World)

| # | Example | Description |
|---|---------|-------------|
| 01 | AI-to-AI Payment | GPT-4 pays Claude for analysis |
| 02 | Translation Service | Production translation agent |
| 03 | Code Review Agent | Automated code review service |

### Integrations (Third-Party)

| # | Example | Description |
|---|---------|-------------|
| 1 | LangChain Tool | ACTP as a LangChain tool |
| 2 | n8n Webhook | Webhook handler for n8n |

### Testnet (Base Sepolia)

| # | Example | Description |
|---|---------|-------------|
| 01 | Real Transaction | End-to-end testnet transaction |
| 2 | Mint USDC | Mint test USDC tokens |

## SDK API Levels

Both language implementations follow the same three-tier API design:

```
┌─────────────────────────────────────────────────────────────┐
│                        Basic API                             │
│              provide() / request() functions                 │
│                  Quick prototyping, demos                    │
├─────────────────────────────────────────────────────────────┤
│                      Standard API                            │
│                     Agent class                              │
│            Production agents with lifecycle                  │
├─────────────────────────────────────────────────────────────┤
│                      Advanced API                            │
│                    ACTPClient                                │
│              Full protocol control                           │
└─────────────────────────────────────────────────────────────┘
```

| API Level | Use Case | Key Classes/Functions |
|-----------|----------|----------------------|
| **Basic** | Quick prototyping, demos | `provide()`, `request()` |
| **Standard** | Production agents | `Agent`, `AgentConfig`, `Job` |
| **Advanced** | Full protocol control | `ACTPClient`, `Kernel`, `Escrow` |

## Transaction Lifecycle

All examples work with the 8-state ACTP lifecycle:

```
INITIATED → QUOTED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED
                ↘                      ↘              ↘
              CANCELLED              CANCELLED      DISPUTED → SETTLED
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Mock mode (default - no blockchain needed)
ACTP_MODE=mock

# Testnet mode (Base Sepolia)
ACTP_MODE=testnet
PRIVATE_KEY=0x...
RPC_URL=https://sepolia.base.org

# Mainnet mode (Base)
ACTP_MODE=mainnet
PRIVATE_KEY=0x...
RPC_URL=https://mainnet.base.org
```

### TypeScript Configuration

```bash
cd typescript
cp .env.example .env
# Edit .env with your settings
npm install
```

### Python Configuration

```bash
cd python
cp .env.example .env
# Edit .env with your settings
pip install -r requirements.txt
```

## Running Examples

### TypeScript

```bash
# Basic examples
npm run basic:hello
npm run basic:echo
npm run basic:translate

# Standard examples
npm run standard:lifecycle
npm run standard:pricing

# Advanced examples
npm run advanced:lifecycle
npm run advanced:dispute

# All examples in a category
npm run basic:all
npm run standard:all
```

### Python

```bash
# Basic examples
python basic/01_hello_world.py
python basic/02_echo_service.py
python basic/03_translation_service.py

# Standard examples
python standard/01_agent_lifecycle.py
python standard/02_pricing_strategy.py

# Advanced examples
python advanced/01_transaction_lifecycle.py
python advanced/02_dispute_flow.py
```

## Directory Structure

```
sdk-examples/
├── README.md              # This file
├── LICENSE                # Apache 2.0
│
├── typescript/            # TypeScript examples
│   ├── README.md          # TypeScript-specific docs
│   ├── package.json       # Dependencies
│   ├── tsconfig.json      # TypeScript config
│   ├── .env.example       # Environment template
│   ├── basic/             # Getting started
│   ├── standard/          # Agent framework
│   ├── advanced/          # Protocol control
│   ├── patterns/          # Integration patterns
│   ├── usecases/          # Real-world examples
│   ├── integrations/      # Third-party
│   └── testnet/           # Base Sepolia
│
└── python/                # Python examples
    ├── README.md          # Python-specific docs
    ├── requirements.txt   # Dependencies
    ├── pyproject.toml     # Package config
    ├── .env.example       # Environment template
    ├── basic/             # Getting started
    ├── standard/          # Agent framework
    ├── advanced/          # Protocol control
    ├── patterns/          # Integration patterns
    ├── usecases/          # Real-world examples
    ├── integrations/      # Third-party
    └── testnet/           # Base Sepolia
```

## Requirements

### TypeScript
- Node.js >= 18
- npm >= 9
- @agirails/sdk >= 2.0.0

### Python
- Python >= 3.9
- agirails >= 2.0.0

## Related Packages

| Package | Description | Links |
|---------|-------------|-------|
| **@agirails/sdk** | TypeScript SDK | [GitHub](https://github.com/agirails/sdk-js) · [npm](https://www.npmjs.com/package/@agirails/sdk) |
| **agirails** | Python SDK | [GitHub](https://github.com/agirails/sdk-python) · [PyPI](https://pypi.org/project/agirails/) |
| **n8n-nodes-actp** | n8n Community Node | [GitHub](https://github.com/agirails/n8n-nodes-actp) · [npm](https://www.npmjs.com/package/n8n-nodes-actp) |

## Links

- [AGIRAILS Documentation](https://docs.agirails.io)
- [SDK Reference](https://docs.agirails.io/sdk-reference)
- [Discord](https://discord.gg/nuhCt75qe4)
- [AGIRAILS Website](https://agirails.io)

## License

[Apache-2.0](./LICENSE)
