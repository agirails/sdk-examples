#!/usr/bin/env python3
"""
Standard API Example 05: Multi-Service Agent

Demonstrates a single agent providing multiple services.
This is the common production pattern - one agent, many capabilities.

This example demonstrates:
- Registering multiple services on one agent
- Service-specific configuration
- Shared state across services
- Resource management

Run: python standard/05_multi_service_agent.py
"""

import asyncio
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state


async def main() -> None:
    print("AGIRAILS Standard API - Multi-Service Agent\n")

    clear_mock_state()

    from agirails.level1 import (
        Agent,
        AgentConfig,
        AgentBehavior,
        Job,
        JobContext,
        PricingStrategy,
        CostModel,
    )

    # Shared state for all services
    shared_state = {
        "total_requests": 0,
        "cache": {},  # Shared cache
        "rate_limits": {},  # Per-service rate limits
    }

    # Create a multi-service agent
    agent = Agent(
        AgentConfig(
            name="MultiServiceBot",
            description="AI agent offering multiple services",
            network="mock",
            behavior=AgentBehavior(
                auto_accept=True,
                concurrency=10,  # Handle 10 concurrent jobs
            ),
        )
    )

    # Service 1: Text Translation
    translation_pricing = PricingStrategy(
        cost=CostModel(base=0.10, per_unit=0.005, unit="word"),
        margin=0.30,
    )

    @agent.provide("translate", pricing=translation_pricing)
    async def handle_translate(job: Job, ctx: JobContext) -> dict:
        shared_state["total_requests"] += 1

        text = job.input.get("text", "") if isinstance(job.input, dict) else str(job.input)
        target = job.input.get("target", "es") if isinstance(job.input, dict) else "es"

        ctx.progress(0, "Starting translation...")

        # Check cache
        cache_key = f"translate:{hash(text)}:{target}"
        if cache_key in shared_state["cache"]:
            ctx.log.info("Cache hit!")
            return shared_state["cache"][cache_key]

        # Simulate translation
        await asyncio.sleep(0.2)
        ctx.progress(50, "Translating...")

        await asyncio.sleep(0.2)
        ctx.progress(100, "Done")

        result = {
            "original": text,
            "translated": f"[{target.upper()}] {text}",
            "word_count": len(text.split()),
        }

        # Cache result
        shared_state["cache"][cache_key] = result
        return result

    # Service 2: Text Summarization
    summarize_pricing = PricingStrategy(
        cost=CostModel(base=0.20, per_unit=0.01, unit="sentence"),
        margin=0.25,
    )

    @agent.provide("summarize", pricing=summarize_pricing)
    async def handle_summarize(job: Job, ctx: JobContext) -> dict:
        shared_state["total_requests"] += 1

        text = job.input.get("text", "") if isinstance(job.input, dict) else str(job.input)
        max_length = job.input.get("maxLength", 100) if isinstance(job.input, dict) else 100

        ctx.progress(0, "Analyzing text...")
        await asyncio.sleep(0.3)

        ctx.progress(50, "Generating summary...")
        await asyncio.sleep(0.3)

        # Simple summarization (first N characters)
        summary = text[:max_length] + "..." if len(text) > max_length else text

        ctx.progress(100, "Done")

        return {
            "original_length": len(text),
            "summary": summary,
            "compression_ratio": len(summary) / max(len(text), 1),
        }

    # Service 3: Sentiment Analysis
    @agent.provide("sentiment")
    async def handle_sentiment(job: Job, ctx: JobContext) -> dict:
        shared_state["total_requests"] += 1

        text = job.input.get("text", "") if isinstance(job.input, dict) else str(job.input)

        ctx.progress(50, "Analyzing sentiment...")
        await asyncio.sleep(0.2)

        # Simple sentiment (mock)
        positive_words = ["good", "great", "excellent", "happy", "love", "amazing"]
        negative_words = ["bad", "terrible", "awful", "sad", "hate", "horrible"]

        text_lower = text.lower()
        pos_count = sum(1 for w in positive_words if w in text_lower)
        neg_count = sum(1 for w in negative_words if w in text_lower)

        if pos_count > neg_count:
            sentiment = "positive"
            score = 0.5 + (pos_count * 0.1)
        elif neg_count > pos_count:
            sentiment = "negative"
            score = 0.5 - (neg_count * 0.1)
        else:
            sentiment = "neutral"
            score = 0.5

        ctx.progress(100, "Done")

        return {
            "sentiment": sentiment,
            "score": min(1.0, max(0.0, score)),
            "confidence": 0.85,
        }

    # Service 4: Named Entity Recognition
    @agent.provide("entities")
    async def handle_entities(job: Job, ctx: JobContext) -> dict:
        shared_state["total_requests"] += 1

        text = job.input.get("text", "") if isinstance(job.input, dict) else str(job.input)

        ctx.progress(50, "Extracting entities...")
        await asyncio.sleep(0.2)

        # Simple entity extraction (mock - find capitalized words)
        words = text.split()
        entities = []

        for word in words:
            clean_word = word.strip(".,!?\"'")
            if clean_word and clean_word[0].isupper() and len(clean_word) > 1:
                entities.append({
                    "text": clean_word,
                    "type": "UNKNOWN",  # In production: PERSON, ORG, LOCATION, etc.
                })

        ctx.progress(100, "Done")

        return {
            "entities": entities,
            "count": len(entities),
        }

    # Start the agent
    await agent.start()

    print(f"Multi-service agent started: {agent.address[:16]}...")
    print(f"Services available: {', '.join(agent.service_names)}")
    print()

    # Show service configurations
    print("=" * 60)
    print("Service Configuration")
    print("=" * 60)
    print()
    print("1. translate")
    print(f"   Pricing: $0.10 base + $0.005/word (30% margin)")
    print()
    print("2. summarize")
    print(f"   Pricing: $0.20 base + $0.01/sentence (25% margin)")
    print()
    print("3. sentiment")
    print(f"   Pricing: Default (no custom pricing)")
    print()
    print("4. entities")
    print(f"   Pricing: Default (no custom pricing)")
    print()

    # Demo: show agent is ready
    print("=" * 60)
    print("Agent Status")
    print("=" * 60)
    print()
    print(f"Status: {agent.status.value}")
    print(f"Address: {agent.address}")
    print(f"Services: {len(agent.service_names)}")
    print(f"Concurrency: 10 jobs max")
    print()

    # Wait a bit to simulate activity
    await asyncio.sleep(2)

    # Final stats
    print("=" * 60)
    print("Agent Statistics")
    print("=" * 60)
    print()
    print(f"Total requests (shared): {shared_state['total_requests']}")
    print(f"Cache entries: {len(shared_state['cache'])}")
    print(f"Jobs completed: {agent.stats.jobs_completed}")
    print(f"Total earned: ${agent.stats.total_earned:.2f}")
    print()

    await agent.stop()
    print("Multi-service demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
