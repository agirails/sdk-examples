# AGIRAILS Python SDK Examples

Complete examples demonstrating all API levels of the AGIRAILS Python SDK for the Agent Commerce Transaction Protocol (ACTP).

## Prerequisites

```bash
# Python 3.9+
python --version

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# or: .venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

## Quick Start

```bash
# Run the simplest example
python basic/01_hello_world.py

# Run with verbose output
python -v basic/01_hello_world.py
```

## Examples by Category

### Basic API (Level 0)

The simplest entry point - just `provide()` and `request()` functions.

| Example | Description | Run Command |
|---------|-------------|-------------|
| [01_hello_world.py](basic/01_hello_world.py) | Simplest possible service | `python basic/01_hello_world.py` |
| [02_echo_service.py](basic/02_echo_service.py) | Provider events and statistics | `python basic/02_echo_service.py` |
| [03_translation_service.py](basic/03_translation_service.py) | Real-world service with progress | `python basic/03_translation_service.py` |

### Standard API (Level 1)

`Agent` class with full lifecycle management, pricing, filtering, and events.

| Example | Description | Run Command |
|---------|-------------|-------------|
| [01_agent_lifecycle.py](standard/01_agent_lifecycle.py) | Start, pause, resume, stop | `python standard/01_agent_lifecycle.py` |
| [02_pricing_strategy.py](standard/02_pricing_strategy.py) | Cost + margin pricing | `python standard/02_pricing_strategy.py` |
| [03_job_filtering.py](standard/03_job_filtering.py) | Budget filters, custom filters | `python standard/03_job_filtering.py` |
| [04_events_and_stats.py](standard/04_events_and_stats.py) | Event system, real-time stats | `python standard/04_events_and_stats.py` |
| [05_multi_service_agent.py](standard/05_multi_service_agent.py) | Single agent, multiple services | `python standard/05_multi_service_agent.py` |

### Advanced API (ACTPClient)

Full protocol control via `ACTPClient` with three adapters.

| Example | Description | Run Command |
|---------|-------------|-------------|
| [01_transaction_lifecycle.py](advanced/01_transaction_lifecycle.py) | Complete state machine | `python advanced/01_transaction_lifecycle.py` |
| [02_dispute_flow.py](advanced/02_dispute_flow.py) | Dispute scenarios | `python advanced/02_dispute_flow.py` |
| [03_batch_operations.py](advanced/03_batch_operations.py) | Parallel transactions | `python advanced/03_batch_operations.py` |
| [04_event_monitoring.py](advanced/04_event_monitoring.py) | Real-time state watching | `python advanced/04_event_monitoring.py` |
| [05_eas_attestations.py](advanced/05_eas_attestations.py) | Ethereum Attestation Service | `python advanced/05_eas_attestations.py` |
| [06_direct_protocol.py](advanced/06_direct_protocol.py) | Direct runtime access | `python advanced/06_direct_protocol.py` |

### Patterns

Reusable patterns for production SDK usage.

| Example | Description | Run Command |
|---------|-------------|-------------|
| [provider_discovery.py](patterns/provider_discovery.py) | Discover and select providers | `python patterns/provider_discovery.py` |
| [retry_logic.py](patterns/retry_logic.py) | Exponential backoff, circuit breaker | `python patterns/retry_logic.py` |
| [concurrent_requests.py](patterns/concurrent_requests.py) | Semaphore, rate limiting | `python patterns/concurrent_requests.py` |

### Use Cases

Real-world business scenarios.

| Example | Description | Run Command |
|---------|-------------|-------------|
| [01_ai_to_ai_payment.py](usecases/01_ai_to_ai_payment.py) | AI agent paying another | `python usecases/01_ai_to_ai_payment.py` |
| [02_translation_service.py](usecases/02_translation_service.py) | Per-word pricing model | `python usecases/02_translation_service.py` |
| [03_code_review_agent.py](usecases/03_code_review_agent.py) | Security review service | `python usecases/03_code_review_agent.py` |

### Integrations

Integration with external systems.

| Example | Description | Run Command |
|---------|-------------|-------------|
| [langchain_tool.py](integrations/langchain_tool.py) | LangChain tool wrapper | `python integrations/langchain_tool.py` |
| [n8n_webhook.py](integrations/n8n_webhook.py) | n8n webhook integration | `python integrations/n8n_webhook.py` |

### Testnet

Real blockchain transactions on Base Sepolia.

| Example | Description | Run Command |
|---------|-------------|-------------|
| [mint_usdc.py](testnet/mint_usdc.py) | Mint test USDC tokens | `python testnet/mint_usdc.py` |
| [01_real_transaction.py](testnet/01_real_transaction.py) | Create real transaction | `python testnet/01_real_transaction.py` |

## SDK API Levels

```
Level 0 (Basic API)
├── provide() - Register a service
├── request() - Request a service
└── Simplest entry point

Level 1 (Standard API)
├── Agent class
├── Lifecycle: start, pause, resume, stop
├── Features: pricing, filtering, events, stats
└── Production-ready agents

ACTPClient (Advanced API)
├── client.basic - One-call solutions
├── client.standard - Step-by-step control
├── client.advanced - Direct runtime access
└── Full protocol control
```

## Configuration

### Mock Mode (Default)

All examples run in **mock mode** by default - no blockchain needed.

```python
from agirails import ACTPClient

client = await ACTPClient.create(mode="mock")
```

### Testnet Mode

For real blockchain transactions, configure environment:

```bash
cp .env.example .env
# Edit .env with your credentials
```

```python
from agirails import ACTPClient

client = await ACTPClient.create(
    mode="testnet",
    private_key=os.environ["PRIVATE_KEY"],
    rpc_url=os.environ["BASE_SEPOLIA_RPC"],
)
```

## Project Structure

```
python/
├── basic/           # Level 0 API examples
├── standard/        # Level 1 API examples
├── advanced/        # ACTPClient examples
├── patterns/        # Reusable patterns
├── usecases/        # Real-world scenarios
├── integrations/    # External integrations
├── testnet/         # Blockchain examples
├── src/utils/       # Helper functions
├── requirements.txt # Dependencies
└── README.md        # This file
```

## Learn More

- [Python SDK Documentation](https://docs.agirails.io/sdk-reference/python)
- [TypeScript Examples](../typescript/)
- [GitHub](https://github.com/agirails)
- [Discord](https://discord.gg/nuhCt75qe4)

## License

[Apache-2.0](../LICENSE)
