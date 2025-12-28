#!/usr/bin/env python3
"""
Pattern: Provider Discovery

Demonstrates how to discover, filter, and select the best provider
for a given service request.

This pattern shows:
- Service directory queries
- Provider filtering (price, reputation, availability)
- Best provider selection strategies
- Fallback mechanisms

Run: python patterns/provider_discovery.py
"""

import asyncio
import sys
import random
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional, Callable
from enum import Enum

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section


class SelectionStrategy(Enum):
    CHEAPEST = "cheapest"
    BEST_REPUTATION = "best_reputation"
    FASTEST = "fastest"
    ROUND_ROBIN = "round_robin"


@dataclass
class ProviderInfo:
    """Information about a provider."""
    address: str
    name: str
    services: List[str]
    price_per_request: float  # USDC
    reputation_score: float  # 0-100
    avg_response_time_ms: int
    success_rate: float  # 0-1
    is_available: bool


class ProviderDiscovery:
    """Discovers and selects providers for services."""

    def __init__(self):
        self.providers: List[ProviderInfo] = []
        self._round_robin_index = 0

    def register(self, provider: ProviderInfo) -> None:
        """Register a provider."""
        self.providers.append(provider)

    def discover(
        self,
        service: str,
        max_price: Optional[float] = None,
        min_reputation: Optional[float] = None,
        only_available: bool = True,
    ) -> List[ProviderInfo]:
        """Discover providers offering a service."""
        results = []

        for p in self.providers:
            # Check service
            if service not in p.services:
                continue

            # Check availability
            if only_available and not p.is_available:
                continue

            # Check price
            if max_price and p.price_per_request > max_price:
                continue

            # Check reputation
            if min_reputation and p.reputation_score < min_reputation:
                continue

            results.append(p)

        return results

    def select_best(
        self,
        providers: List[ProviderInfo],
        strategy: SelectionStrategy = SelectionStrategy.BEST_REPUTATION,
    ) -> Optional[ProviderInfo]:
        """Select the best provider using a strategy."""
        if not providers:
            return None

        if strategy == SelectionStrategy.CHEAPEST:
            return min(providers, key=lambda p: p.price_per_request)

        elif strategy == SelectionStrategy.BEST_REPUTATION:
            return max(providers, key=lambda p: p.reputation_score)

        elif strategy == SelectionStrategy.FASTEST:
            return min(providers, key=lambda p: p.avg_response_time_ms)

        elif strategy == SelectionStrategy.ROUND_ROBIN:
            selected = providers[self._round_robin_index % len(providers)]
            self._round_robin_index += 1
            return selected

        return providers[0]

    def select_with_fallback(
        self,
        service: str,
        strategies: List[SelectionStrategy],
        **filters,
    ) -> Optional[ProviderInfo]:
        """Try multiple strategies until one succeeds."""
        for strategy in strategies:
            providers = self.discover(service, **filters)
            if providers:
                selected = self.select_best(providers, strategy)
                if selected:
                    return selected

        # Last resort: any available provider
        all_providers = self.discover(service, only_available=True)
        return all_providers[0] if all_providers else None


async def main() -> None:
    log_section("AGIRAILS Pattern - Provider Discovery")

    clear_mock_state()

    # =====================================================
    # Part 1: Setup Mock Providers
    # =====================================================
    log_section("Part 1: Provider Registry")

    discovery = ProviderDiscovery()

    # Register mock providers
    providers_data = [
        ProviderInfo(
            address="0xAAAA" + "0" * 36,
            name="FastTranslate",
            services=["translate", "summarize"],
            price_per_request=0.50,
            reputation_score=85,
            avg_response_time_ms=200,
            success_rate=0.95,
            is_available=True,
        ),
        ProviderInfo(
            address="0xBBBB" + "0" * 36,
            name="QualityTranslate",
            services=["translate"],
            price_per_request=1.00,
            reputation_score=98,
            avg_response_time_ms=500,
            success_rate=0.99,
            is_available=True,
        ),
        ProviderInfo(
            address="0xCCCC" + "0" * 36,
            name="BudgetTranslate",
            services=["translate", "ocr"],
            price_per_request=0.25,
            reputation_score=70,
            avg_response_time_ms=800,
            success_rate=0.85,
            is_available=True,
        ),
        ProviderInfo(
            address="0xDDDD" + "0" * 36,
            name="OfflineProvider",
            services=["translate"],
            price_per_request=0.30,
            reputation_score=90,
            avg_response_time_ms=300,
            success_rate=0.92,
            is_available=False,
        ),
    ]

    for p in providers_data:
        discovery.register(p)
        status = "✅" if p.is_available else "❌"
        print(f"{status} {p.name}")
        print(f"   Services: {', '.join(p.services)}")
        print(f"   Price: ${p.price_per_request:.2f} | Rep: {p.reputation_score} | Speed: {p.avg_response_time_ms}ms")

    print()

    # =====================================================
    # Part 2: Basic Discovery
    # =====================================================
    log_section("Part 2: Basic Discovery")

    log("🔍", "Finding all 'translate' providers...")
    translate_providers = discovery.discover("translate")
    print(f"   Found: {len(translate_providers)} providers")
    for p in translate_providers:
        print(f"   - {p.name} (${p.price_per_request})")
    print()

    log("🔍", "Finding 'translate' providers under $0.50...")
    cheap_providers = discovery.discover("translate", max_price=0.50)
    print(f"   Found: {len(cheap_providers)} providers")
    for p in cheap_providers:
        print(f"   - {p.name} (${p.price_per_request})")
    print()

    log("🔍", "Finding 'translate' providers with reputation >= 90...")
    quality_providers = discovery.discover("translate", min_reputation=90)
    print(f"   Found: {len(quality_providers)} providers")
    for p in quality_providers:
        print(f"   - {p.name} (rep: {p.reputation_score})")

    # =====================================================
    # Part 3: Selection Strategies
    # =====================================================
    log_section("Part 3: Selection Strategies")

    all_translate = discovery.discover("translate")

    strategies = [
        (SelectionStrategy.CHEAPEST, "Cheapest"),
        (SelectionStrategy.BEST_REPUTATION, "Best Reputation"),
        (SelectionStrategy.FASTEST, "Fastest"),
    ]

    for strategy, name in strategies:
        selected = discovery.select_best(all_translate, strategy)
        if selected:
            print(f"{name}: {selected.name}")
            print(f"   Price: ${selected.price_per_request} | Rep: {selected.reputation_score} | Speed: {selected.avg_response_time_ms}ms")
        print()

    # Round robin
    log("🔄", "Round Robin (3 selections):")
    for i in range(3):
        selected = discovery.select_best(all_translate, SelectionStrategy.ROUND_ROBIN)
        print(f"   Selection {i + 1}: {selected.name}")

    # =====================================================
    # Part 4: Fallback Mechanism
    # =====================================================
    log_section("Part 4: Fallback Mechanism")

    log("🔍", "Looking for premium provider (rep >= 95, price <= $0.30)...")

    # This combination might not exist
    result = discovery.select_with_fallback(
        "translate",
        strategies=[
            SelectionStrategy.BEST_REPUTATION,
            SelectionStrategy.CHEAPEST,
        ],
        min_reputation=95,
        max_price=0.30,
    )

    if result:
        print(f"   Found: {result.name}")
    else:
        print("   No exact match, trying fallback...")

        # Relax constraints
        result = discovery.select_with_fallback(
            "translate",
            strategies=[SelectionStrategy.BEST_REPUTATION],
            min_reputation=80,
        )
        if result:
            print(f"   Fallback: {result.name} (relaxed constraints)")

    # =====================================================
    # Part 5: Integration with SDK
    # =====================================================
    log_section("Part 5: Integration with SDK")

    print("Usage with AGIRAILS SDK:")
    print()
    print("```python")
    print("# Discover best provider")
    print("providers = discovery.discover('translate', min_reputation=80)")
    print("best = discovery.select_best(providers, SelectionStrategy.BEST_REPUTATION)")
    print()
    print("# Use with request()")
    print("result = await request(")
    print("    'translate',")
    print("    input={'text': 'Hello'},")
    print("    budget=best.price_per_request * 1.1,  # 10% buffer")
    print("    provider=best.address,  # Specify provider")
    print(")")
    print("```")

    log("🎉", "Provider discovery demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
