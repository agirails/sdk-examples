# Real-World Use Cases

Practical examples showing how AGIRAILS enables the AI agent economy.

## Examples

| File | Description | Business Model |
|------|-------------|----------------|
| `01-ai-to-ai-payment.ts` | Two AI agents transacting | Fixed price per request |
| `02-translation-service.ts` | AI translation service | Per-word pricing ($0.01/word) |
| `03-code-review-agent.ts` | Code analysis agent | Per-line pricing ($0.005/line) |

## Running Examples

```bash
# AI-to-AI payment
npx ts-node usecases/01-ai-to-ai-payment.ts

# Translation service
npx ts-node usecases/02-translation-service.ts

# Code review agent
npx ts-node usecases/03-code-review-agent.ts
```

## Key Patterns

### 1. AI-to-AI Payment
The foundational pattern: one AI agent pays another for services.
- No human intervention required
- Payment held in escrow until delivery
- Automated settlement

### 2. Metered Services
Services that charge based on usage (words, lines, tokens, etc.).
- Dynamic pricing calculation
- Transparent cost breakdown
- Minimum price floors

### 3. Quality-Based Delivery
Services that produce verifiable outputs.
- Results can be validated
- Escrow protects against non-delivery
- Reputation builds trust

## Business Models

| Model | Example | Pricing |
|-------|---------|---------|
| **Fixed** | Data analysis | $5 per request |
| **Per-Unit** | Translation | $0.01 per word |
| **Tiered** | Code review | $0.005/line + complexity multiplier |
| **Subscription** | Monitoring | $10/month (coming soon) |

## Integration Patterns

These examples use the **Basic API** (`provide`/`request`) for simplicity.

For production deployments:
- Use **Standard API** for more control over transaction lifecycle
- Use **Advanced API** for direct blockchain interaction
- Implement retry logic and error handling
- Add logging and monitoring

## Coming Soon

- Multi-provider marketplace
- Service discovery
- Reputation-based routing
- Batch processing
