#!/usr/bin/env python3
"""
Integration: n8n Webhook

Demonstrates integrating AGIRAILS with n8n workflow automation.
Exposes AGIRAILS services as webhook endpoints.

Requirements:
    pip install flask requests

Run: python integrations/n8n_webhook.py
"""

import asyncio
import sys
import threading
import time
from pathlib import Path
from dataclasses import dataclass
from typing import Any, Dict, Optional
from queue import Queue
import json

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section


# Check if Flask is available
try:
    from flask import Flask, request as flask_request, jsonify
    HAS_FLASK = True
except ImportError:
    HAS_FLASK = False
    print("Flask not installed. Run: pip install flask")
    print("This example will show the conceptual implementation.\n")


@dataclass
class WebhookConfig:
    """Configuration for webhook server."""
    host: str = "0.0.0.0"
    port: int = 5000
    debug: bool = False


@dataclass
class AsyncJob:
    """Represents an async job."""
    id: str
    service: str
    input: Dict[str, Any]
    callback_url: Optional[str] = None
    status: str = "pending"
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class AGIRAILSWebhookServer:
    """Webhook server for AGIRAILS services."""

    def __init__(self, client, provider_address: str, config: WebhookConfig = None):
        self.client = client
        self.provider_address = provider_address
        self.config = config or WebhookConfig()
        self.jobs: Dict[str, AsyncJob] = {}
        self.job_queue: Queue = Queue()
        self._loop = asyncio.new_event_loop()

        if HAS_FLASK:
            self.app = Flask(__name__)
            self._setup_routes()

    def _setup_routes(self):
        """Setup Flask routes."""

        @self.app.route("/health", methods=["GET"])
        def health():
            return jsonify({"status": "ok", "service": "agirails-webhook"})

        @self.app.route("/webhook/<service>", methods=["POST"])
        def handle_sync_webhook(service: str):
            """Synchronous webhook - waits for result."""
            data = flask_request.json or {}
            budget = data.pop("budget", 1.0)

            try:
                result = self._execute_request(service, data, budget)
                return jsonify({
                    "success": True,
                    "result": result,
                })
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": str(e),
                }), 500

        @self.app.route("/webhook/<service>/async", methods=["POST"])
        def handle_async_webhook(service: str):
            """Async webhook - returns job ID immediately."""
            data = flask_request.json or {}
            callback_url = data.pop("callback_url", None)
            budget = data.pop("budget", 1.0)

            import uuid
            job_id = str(uuid.uuid4())

            job = AsyncJob(
                id=job_id,
                service=service,
                input=data,
                callback_url=callback_url,
            )
            self.jobs[job_id] = job
            self.job_queue.put((job, budget))

            return jsonify({
                "success": True,
                "job_id": job_id,
                "status_url": f"/jobs/{job_id}",
            }), 202

        @self.app.route("/jobs/<job_id>", methods=["GET"])
        def get_job_status(job_id: str):
            """Get job status."""
            job = self.jobs.get(job_id)
            if not job:
                return jsonify({"error": "Job not found"}), 404

            return jsonify({
                "job_id": job.id,
                "service": job.service,
                "status": job.status,
                "result": job.result,
                "error": job.error,
            })

    def _execute_request(self, service: str, input_data: dict, budget: float) -> dict:
        """Execute AGIRAILS request synchronously."""
        from agirails.level0 import request

        async def _async_request():
            result = await request(
                service,
                input=input_data,
                budget=budget,
                client=self.client,
                provider=self.provider_address,
            )
            return result.result

        return self._loop.run_until_complete(_async_request())

    def run(self):
        """Run the webhook server."""
        if HAS_FLASK:
            self.app.run(
                host=self.config.host,
                port=self.config.port,
                debug=self.config.debug,
            )


async def main() -> None:
    log_section("AGIRAILS Integration - n8n Webhook")

    clear_mock_state()

    from agirails import ACTPClient
    from agirails.level0 import provide, set_provider_client, start_provider, stop_provider

    REQUESTER = "0x1111111111111111111111111111111111111111"
    PROVIDER = "0x2222222222222222222222222222222222222222"

    # =====================================================
    # Part 1: Setup AGIRAILS Services
    # =====================================================
    log_section("Part 1: Setup AGIRAILS Services")

    # Translation service
    async def translate_handler(data: dict) -> dict:
        text = data.get("text", "")
        target = data.get("targetLang", "de")
        return {
            "translated": f"[{target.upper()}] {text}",
            "sourceLang": "en",
            "targetLang": target,
        }

    # Summarization service
    async def summarize_handler(data: dict) -> dict:
        text = data.get("text", "")
        max_length = data.get("maxLength", 100)
        summary = text[:max_length] + "..." if len(text) > max_length else text
        return {
            "summary": summary,
            "originalLength": len(text),
            "summaryLength": len(summary),
        }

    provide("translate", translate_handler)
    provide("summarize", summarize_handler)

    client = await ACTPClient.create(mode="mock", requester_address=REQUESTER)
    await client.mint_tokens(REQUESTER, 100_000_000)
    await client.mint_tokens(PROVIDER, 10_000_000)

    set_provider_client(client, address=PROVIDER)
    await start_provider()

    print("Services active: translate, summarize")
    print()

    # =====================================================
    # Part 2: Webhook Server Architecture
    # =====================================================
    log_section("Part 2: Webhook Server Architecture")

    print("Webhook endpoints:")
    print()
    print("  GET  /health")
    print("       Health check endpoint")
    print()
    print("  POST /webhook/<service>")
    print("       Synchronous - waits for result")
    print("       Body: { input data, budget: 1.0 }")
    print()
    print("  POST /webhook/<service>/async")
    print("       Asynchronous - returns job ID")
    print("       Body: { input data, budget: 1.0, callback_url: '...' }")
    print()
    print("  GET  /jobs/<job_id>")
    print("       Check async job status")
    print()

    # =====================================================
    # Part 3: n8n Workflow Configuration
    # =====================================================
    log_section("Part 3: n8n Workflow Configuration")

    print("n8n HTTP Request node configuration:")
    print()
    print("```json")
    print(json.dumps({
        "method": "POST",
        "url": "http://localhost:5000/webhook/translate",
        "headers": {
            "Content-Type": "application/json"
        },
        "body": {
            "text": "{{ $json.textToTranslate }}",
            "targetLang": "de",
            "budget": 1.0
        }
    }, indent=2))
    print("```")
    print()

    # =====================================================
    # Part 4: Example Workflows
    # =====================================================
    log_section("Part 4: Example n8n Workflows")

    print("Workflow 1: Email Translation")
    print("  1. Trigger: New email received")
    print("  2. HTTP Request: POST /webhook/translate")
    print("  3. Email: Send translated version")
    print()

    print("Workflow 2: Document Processing")
    print("  1. Trigger: File uploaded to Google Drive")
    print("  2. HTTP Request: POST /webhook/summarize")
    print("  3. Slack: Post summary to channel")
    print()

    print("Workflow 3: Async Processing")
    print("  1. Trigger: Webhook receives document")
    print("  2. HTTP Request: POST /webhook/analyze/async")
    print("  3. Wait: Poll /jobs/{id} until complete")
    print("  4. HTTP Request: POST callback with results")
    print()

    # =====================================================
    # Part 5: Flask Implementation
    # =====================================================
    log_section("Part 5: Flask Implementation")

    print("Complete Flask server code:")
    print()
    print("```python")
    print("from flask import Flask, request, jsonify")
    print("from agirails.level0 import request as agirails_request")
    print()
    print("app = Flask(__name__)")
    print()
    print("@app.route('/webhook/<service>', methods=['POST'])")
    print("async def webhook(service: str):")
    print("    data = request.json")
    print("    budget = data.pop('budget', 1.0)")
    print("    ")
    print("    result = await agirails_request(")
    print("        service,")
    print("        input=data,")
    print("        budget=budget,")
    print("    )")
    print("    ")
    print("    return jsonify({")
    print("        'success': True,")
    print("        'result': result.result,")
    print("    })")
    print()
    print("if __name__ == '__main__':")
    print("    app.run(port=5000)")
    print("```")
    print()

    # =====================================================
    # Part 6: Testing with curl
    # =====================================================
    log_section("Part 6: Testing")

    print("Test with curl:")
    print()
    print("# Synchronous request")
    print("curl -X POST http://localhost:5000/webhook/translate \\")
    print("  -H 'Content-Type: application/json' \\")
    print("  -d '{\"text\": \"Hello world\", \"targetLang\": \"de\", \"budget\": 1.0}'")
    print()
    print("# Async request")
    print("curl -X POST http://localhost:5000/webhook/translate/async \\")
    print("  -H 'Content-Type: application/json' \\")
    print("  -d '{\"text\": \"Long document...\", \"callback_url\": \"https://example.com/callback\"}'")
    print()
    print("# Check job status")
    print("curl http://localhost:5000/jobs/<job_id>")
    print()

    # =====================================================
    # Part 7: Production Considerations
    # =====================================================
    log_section("Part 7: Production")

    print("Production deployment considerations:")
    print()
    print("1. Authentication")
    print("   - API keys for webhook access")
    print("   - HMAC signature verification")
    print("   - Rate limiting per client")
    print()
    print("2. Reliability")
    print("   - Queue async jobs (Redis, RabbitMQ)")
    print("   - Retry failed callbacks")
    print("   - Dead letter queue for failures")
    print()
    print("3. Monitoring")
    print("   - Request/response logging")
    print("   - Job processing metrics")
    print("   - Error alerting")
    print()
    print("4. Scaling")
    print("   - Multiple worker processes")
    print("   - Load balancer (nginx)")
    print("   - Kubernetes deployment")

    await stop_provider()
    log("🎉", "n8n webhook integration demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
