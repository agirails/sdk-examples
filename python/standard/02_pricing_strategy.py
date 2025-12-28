#!/usr/bin/env python3
"""
Standard API Example 02: Pricing Strategy

Demonstrates how to configure pricing for your services.
The Agent can automatically accept/reject jobs based on profitability.

This example demonstrates:
- Cost + margin pricing model
- Per-unit pricing (e.g., per word, per image)
- Automatic profitability checks
- Below-cost behavior configuration

Run: python standard/02_pricing_strategy.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state


async def main() -> None:
    print("AGIRAILS Standard API - Pricing Strategy\n")

    clear_mock_state()

    from agirails.level1 import (
        Agent,
        AgentConfig,
        Job,
        JobContext,
        PricingStrategy,
        CostModel,
    )

    # Define pricing strategy for translation service
    translation_pricing = PricingStrategy(
        # Base cost for running the service
        cost=CostModel(
            base=0.50,  # $0.50 base cost per job
            per_unit=0.01,  # $0.01 per word
            unit="word",
        ),
        # Desired profit margin (40%)
        margin=0.40,
        # Minimum price floor
        min_price=1.00,
    )

    # Create agent with pricing-aware service
    agent = Agent(
        AgentConfig(
            name="TranslationAgent",
            network="mock",
        )
    )

    # Track jobs for demo
    job_log = []

    # Register service with pricing
    @agent.provide("translate", pricing=translation_pricing)
    async def handle_translation(job: Job, ctx: JobContext) -> dict:
        text = job.input.get("text", "") if isinstance(job.input, dict) else ""
        target_lang = job.input.get("targetLang", "de") if isinstance(job.input, dict) else "de"

        word_count = len(text.split())
        ctx.log.info(f"Translating {word_count} words to {target_lang}")

        # Calculate expected cost
        expected_cost = translation_pricing.cost.base + (word_count * translation_pricing.cost.per_unit)
        min_price = expected_cost / (1 - translation_pricing.margin)

        job_log.append({
            "word_count": word_count,
            "expected_cost": expected_cost,
            "min_price": min_price,
            "budget": job.budget,
        })

        # Simulate translation
        await asyncio.sleep(0.2)

        return {
            "translated": f"[{target_lang.upper()}] {text}",
            "word_count": word_count,
            "target_lang": target_lang,
        }

    await agent.start()
    print(f"Translation agent started: {agent.address[:16]}...")
    print()

    # Test cases with different budgets
    test_cases = [
        {
            "name": "Fair price ($5 for ~100 words)",
            "input": {"text": "Hello world " * 50, "targetLang": "de"},
            "budget": 5.00,
            "expected": "ACCEPTED",
        },
        {
            "name": "Low price ($0.50 for ~100 words)",
            "input": {"text": "Hello world " * 50, "targetLang": "es"},
            "budget": 0.50,
            "expected": "REJECTED (below cost)",
        },
        {
            "name": "Marginal price ($2.50 for ~100 words)",
            "input": {"text": "Hello world " * 50, "targetLang": "fr"},
            "budget": 2.50,
            "expected": "ACCEPTED (at threshold)",
        },
    ]

    # Note: In this demo, we simulate the pricing checks
    # In production, the Agent framework handles this automatically
    for i, test in enumerate(test_cases, 1):
        print(f"Test {i}: {test['name']}")

        # Calculate pricing
        word_count = len(test["input"]["text"].split())
        cost = translation_pricing.cost.base + (word_count * translation_pricing.cost.per_unit)
        min_price = cost / (1 - translation_pricing.margin)

        print(f"  Words: {word_count}")
        print(f"  Cost: ${cost:.2f}")
        print(f"  Min price (with {int(translation_pricing.margin * 100)}% margin): ${min_price:.2f}")
        print(f"  Budget offered: ${test['budget']:.2f}")

        # Check if job would be accepted
        if test["budget"] < cost:
            print(f"  Result: REJECTED (below cost)")
        elif test["budget"] < min_price:
            print(f"  Result: REJECTED (below min price with margin)")
        else:
            print(f"  Result: ACCEPTED")

        print()

    # Show agent stats
    print("=" * 40)
    print("Agent Stats:")
    print(f"  Jobs received: {agent.stats.jobs_received}")
    print(f"  Jobs completed: {agent.stats.jobs_completed}")
    print(f"  Total earned: ${agent.stats.total_earned:.2f}")
    print("=" * 40)

    await agent.stop()
    print("\nPricing demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
