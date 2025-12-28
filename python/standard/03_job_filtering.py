#!/usr/bin/env python3
"""
Standard API Example 03: Job Filtering

Demonstrates how to filter which jobs your agent accepts.
Useful for specializing in certain types of work.

This example demonstrates:
- Budget filters (min_budget, max_budget)
- Custom filter functions
- Combining filters with pricing

Run: python standard/03_job_filtering.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state


async def main() -> None:
    print("AGIRAILS Standard API - Job Filtering\n")

    clear_mock_state()

    from agirails.level1 import (
        Agent,
        AgentConfig,
        Job,
        JobContext,
        ServiceFilter,
    )

    # Create agent
    agent = Agent(
        AgentConfig(
            name="FilteringAgent",
            network="mock",
        )
    )

    # Service 1: With budget filters
    premium_filter = ServiceFilter(
        min_budget=10.0,  # Minimum $10
        max_budget=1000.0,  # Maximum $1000
    )

    @agent.provide("premium-analysis", filter=premium_filter)
    async def handle_premium(job: Job, ctx: JobContext) -> dict:
        ctx.log.info(f"Processing premium analysis (budget: ${job.budget})")
        return {"analysis": "Premium insights", "quality": "high"}

    # Service 2: With custom filter function
    def image_size_filter(job: Job) -> bool:
        """Only accept images under 10MB."""
        size_bytes = job.input.get("sizeInBytes", 0) if isinstance(job.input, dict) else 0
        size_mb = size_bytes / (1024 * 1024)
        if size_mb > 10:
            print(f"  [Filter] Rejected: Image too large ({size_mb:.1f}MB)")
            return False
        return True

    image_filter = ServiceFilter(custom=image_size_filter)

    @agent.provide("image-processing", filter=image_filter)
    async def handle_image(job: Job, ctx: JobContext) -> dict:
        size_kb = job.input.get("sizeInBytes", 0) / 1024 if isinstance(job.input, dict) else 0
        ctx.log.info(f"Processing image ({size_kb:.0f}KB)")
        return {"processed": True, "format": job.input.get("format", "unknown")}

    # Service 3: Complex filter with multiple conditions
    def coding_language_filter(job: Job) -> bool:
        """Only accept certain programming languages."""
        supported_langs = ["typescript", "javascript", "python", "solidity"]
        lang = job.input.get("language", "").lower() if isinstance(job.input, dict) else ""
        if lang not in supported_langs:
            print(f"  [Filter] Rejected: Unsupported language ({lang})")
            return False
        return True

    coding_filter = ServiceFilter(
        min_budget=5.0,
        custom=coding_language_filter,
    )

    @agent.provide("ai-coding", filter=coding_filter)
    async def handle_coding(job: Job, ctx: JobContext) -> dict:
        lang = job.input.get("language", "unknown") if isinstance(job.input, dict) else "unknown"
        ctx.log.info(f"Generating {lang} code...")
        return {"code": f"# {lang} code here", "language": lang}

    await agent.start()
    print(f"Filtering agent started: {agent.address[:16]}...")
    print(f"Services: {', '.join(agent.service_names)}")
    print()

    # Demo: Show filter behavior with test cases
    print("=" * 50)
    print("Filter Demonstration")
    print("=" * 50)

    # Test premium-analysis
    print("\n=== Testing premium-analysis ===\n")

    test_budgets = [
        (5.0, "Below minimum ($10)"),
        (50.0, "Within range"),
        (1500.0, "Above maximum ($1000)"),
    ]

    for budget, desc in test_budgets:
        print(f"Test: ${budget:.0f} budget - {desc}")
        if budget < premium_filter.min_budget:
            print("  Result: REJECTED (below min_budget)")
        elif budget > premium_filter.max_budget:
            print("  Result: REJECTED (above max_budget)")
        else:
            print("  Result: ACCEPTED")
        print()

    # Test image-processing
    print("=== Testing image-processing ===\n")

    test_sizes = [
        (5 * 1024 * 1024, "5MB - within limit"),
        (15 * 1024 * 1024, "15MB - above limit"),
    ]

    for size, desc in test_sizes:
        print(f"Test: {desc}")
        # Simulate filter check
        if size / (1024 * 1024) > 10:
            print("  Result: REJECTED (file too large)")
        else:
            print("  Result: ACCEPTED")
        print()

    # Test ai-coding
    print("=== Testing ai-coding ===\n")

    test_langs = [
        ("typescript", 10.0, "TypeScript - supported"),
        ("python", 10.0, "Python - supported"),
        ("rust", 10.0, "Rust - not supported"),
        ("python", 2.0, "Python - budget too low"),
    ]

    for lang, budget, desc in test_langs:
        print(f"Test: {desc}")
        supported = lang in ["typescript", "javascript", "python", "solidity"]
        if budget < coding_filter.min_budget:
            print("  Result: REJECTED (below min_budget)")
        elif not supported:
            print("  Result: REJECTED (unsupported language)")
        else:
            print("  Result: ACCEPTED")
        print()

    # Summary
    print("=" * 50)
    print("Summary")
    print("=" * 50)
    print(f"Services registered: {len(agent.service_names)}")
    print(f"  - premium-analysis: min=$10, max=$1000")
    print(f"  - image-processing: max 10MB file size")
    print(f"  - ai-coding: min=$5, languages=[ts, js, py, sol]")

    await agent.stop()
    print("\nFiltering demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
