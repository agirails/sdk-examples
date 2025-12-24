# Integrations Examples

Examples showing how to integrate AGIRAILS with popular AI and automation frameworks.

## Examples

### 1. LangChain Tool (`langchain-tool.ts`)

Wrap AGIRAILS services as LangChain tools for use in AI agents.

```bash
npx ts-node integrations/langchain-tool.ts
```

**Key Pattern:**
```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';
import { request } from '@agirails/sdk';

const myTool = new DynamicStructuredTool({
  name: 'my_service',
  description: 'My paid AI service ($0.50 via AGIRAILS)',
  schema: z.object({
    text: z.string().describe('Input text'),
  }),
  func: async (input) => {
    const { result } = await request('my-service', {
      input,
      budget: 0.5,
    });
    return JSON.stringify(result);
  },
});
```

**Use Cases:**
- AI agents that need to pay for external services
- Multi-agent systems with economic incentives
- Autonomous AI workflows with budget constraints

**Prerequisites:**
```bash
npm install @langchain/core @langchain/openai zod
```

---

### 2. n8n Webhook (`n8n-webhook.ts`)

Connect AGIRAILS to n8n workflows using webhooks.

```bash
npx ts-node integrations/n8n-webhook.ts
```

**Key Pattern:**
```typescript
import express from 'express';
import { request } from '@agirails/sdk';

const app = express();

app.post('/webhook/request', async (req, res) => {
  const { service, input, budget } = req.body;

  const { result, transaction } = await request(service, { input, budget });

  res.json({
    success: true,
    transactionId: transaction.id,
    result,
  });
});
```

**Endpoints Created:**
- `GET /health` - Health check
- `POST /webhook/request` - Sync request (waits for result)
- `POST /webhook/request-async` - Async request (returns immediately, calls back)

**n8n Configuration:**
1. Add HTTP Request node
2. Set URL to your webhook server
3. POST with JSON body: `{ "service": "...", "input": {...} }`
4. Parse JSON response

**Prerequisites:**
```bash
npm install express
```

---

## Adding More Integrations

### AutoGPT / AgentGPT

Similar to LangChain, wrap AGIRAILS requests as callable functions:

```typescript
// AutoGPT command
async function agirails_request(service: string, input: any, budget: number) {
  const { result } = await request(service, { input, budget });
  return result;
}
```

### Zapier

Use webhooks similar to n8n:
1. Create webhook endpoint
2. Configure Zapier to POST to your endpoint
3. Return results in Zapier-compatible format

### Make (Integromat)

Same webhook pattern as Zapier:
1. HTTP module makes POST request
2. JSON parser extracts result

### LangGraph

Use the same tools as LangChain with graph-based orchestration:

```typescript
import { StateGraph } from '@langchain/langgraph';
import { agirailsTools } from './langchain-tool';

const workflow = new StateGraph()
  .addNode('analyze', async (state) => {
    const result = await agirailsTools.sentiment.invoke(state.text);
    return { ...state, analysis: result };
  });
```

---

## Architecture Considerations

### Security

- **API Keys**: Store in environment variables, not code
- **Rate Limiting**: Implement on webhook server
- **Authentication**: Add API key validation to webhooks
- **HTTPS**: Use TLS in production

### Reliability

- **Retries**: Implement exponential backoff (see `patterns/retry-logic.ts`)
- **Timeouts**: Set appropriate timeouts for each service
- **Circuit Breaker**: Consider circuit breaker pattern for flaky services

### Monitoring

- **Logging**: Log all requests/responses
- **Metrics**: Track request counts, latencies, costs
- **Alerts**: Set up alerts for failures, budget overruns

---

## Cost Management

When integrating with AI agents, budget control is critical:

```typescript
// Per-tool budget limits
const tools = [
  createAGIRAILSTool('cheap-service', budget: 0.10),
  createAGIRAILSTool('expensive-service', budget: 5.00),
];

// Session budget tracking
let sessionSpend = 0;
const MAX_SESSION_BUDGET = 50.00;

async function trackSpend(amount: number) {
  sessionSpend += amount;
  if (sessionSpend > MAX_SESSION_BUDGET) {
    throw new Error('Session budget exceeded');
  }
}
```
