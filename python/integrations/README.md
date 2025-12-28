# AGIRAILS Integrations

Integration examples with external systems and frameworks.

## Examples

| Integration | Description | Use Case |
|-------------|-------------|----------|
| [langchain_tool.py](langchain_tool.py) | LangChain tool wrapper | AI orchestration |
| [n8n_webhook.py](n8n_webhook.py) | n8n webhook integration | Workflow automation |

## LangChain Integration

Wrap AGIRAILS services as LangChain tools:

```python
from langchain.tools import Tool

translate_tool = Tool(
    name="translate",
    description="Translate text to another language",
    func=lambda x: asyncio.run(request("translate", input=x, budget=1.0))
)

# Use in LangChain agents
agent.run("Translate 'Hello world' to German")
```

## n8n Integration

Expose AGIRAILS as webhook endpoints:

```python
@app.route('/webhook/translate', methods=['POST'])
def translate_webhook():
    data = request.json
    result = asyncio.run(request("translate", input=data, budget=1.0))
    return jsonify(result)
```

## Other Integrations

AGIRAILS can integrate with:
- **Zapier**: Via webhooks
- **Make (Integromat)**: Via HTTP requests
- **Custom APIs**: REST/GraphQL wrappers
- **Message Queues**: RabbitMQ, Kafka adapters
