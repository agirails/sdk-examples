#!/usr/bin/env python3
"""
Use Case: AI-to-AI Payment

Demonstrates the core AGIRAILS use case: one AI agent paying
another for a service, completely autonomously.

This example shows:
- Agent A (Requester): Needs data analysis
- Agent B (Provider): Offers analysis service
- Complete payment flow without human intervention

Run: python usecases/01_ai_to_ai_payment.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section, format_usdc


async def main() -> None:
    log_section("AGIRAILS Use Case - AI-to-AI Payment")

    clear_mock_state()

    from agirails import ACTPClient
    from agirails.level0 import provide, request, set_provider_client, start_provider, stop_provider

    # =====================================================
    # Setup: Two AI Agents
    # =====================================================
    log_section("Setup: Two AI Agents")

    AGENT_A_ADDRESS = "0xAAAA000000000000000000000000000000000001"  # Requester
    AGENT_B_ADDRESS = "0xBBBB000000000000000000000000000000000002"  # Provider

    print("Agent A (Requester):")
    print("  - Role: Investment Analysis AI")
    print("  - Needs: Market data analysis")
    print(f"  - Address: {AGENT_A_ADDRESS[:16]}...")
    print()
    print("Agent B (Provider):")
    print("  - Role: Data Analysis AI")
    print("  - Offers: Real-time market analysis")
    print(f"  - Address: {AGENT_B_ADDRESS[:16]}...")
    print()

    # =====================================================
    # Agent B: Start Service
    # =====================================================
    log_section("Agent B: Starting Analysis Service")

    async def analyze_market_data(data: dict) -> dict:
        """Agent B's analysis service."""
        symbols = data.get("symbols", [])
        timeframe = data.get("timeframe", "1h")

        print(f"  [Agent B] Analyzing {len(symbols)} symbols ({timeframe})")

        # Simulate analysis
        await asyncio.sleep(0.5)

        # Generate mock analysis results
        results = {}
        for symbol in symbols:
            results[symbol] = {
                "trend": "bullish" if hash(symbol) % 2 == 0 else "bearish",
                "confidence": 0.75 + (hash(symbol) % 25) / 100,
                "recommendation": "buy" if hash(symbol) % 3 == 0 else "hold",
            }

        return {
            "analysis": results,
            "timeframe": timeframe,
            "model": "MarketAnalyzerV2",
            "symbols_analyzed": len(symbols),
        }

    # Register Agent B's service
    provider = provide(
        "market-analysis",
        analyze_market_data,
        description="Real-time market data analysis",
    )

    # Create shared client
    client = await ACTPClient.create(mode="mock", requester_address=AGENT_A_ADDRESS)

    # Fund both agents
    await client.mint_tokens(AGENT_A_ADDRESS, 100_000_000)  # 100 USDC
    await client.mint_tokens(AGENT_B_ADDRESS, 10_000_000)  # 10 USDC

    # Connect Agent B to runtime
    set_provider_client(client, address=AGENT_B_ADDRESS)
    await start_provider()

    print(f"Agent B service active: market-analysis")
    print(f"Agent B balance: {format_usdc(await client.get_balance(AGENT_B_ADDRESS))}")
    print()

    # =====================================================
    # Agent A: Request Analysis
    # =====================================================
    log_section("Agent A: Requesting Analysis")

    agent_a_balance_before = await client.get_balance(AGENT_A_ADDRESS)
    agent_b_balance_before = await client.get_balance(AGENT_B_ADDRESS)

    print(f"Agent A balance before: {format_usdc(agent_a_balance_before)}")
    print(f"Agent B balance before: {format_usdc(agent_b_balance_before)}")
    print()

    log("📊", "Agent A requesting market analysis...")

    analysis_request = {
        "symbols": ["BTC", "ETH", "SOL", "AVAX", "MATIC"],
        "timeframe": "4h",
        "depth": "detailed",
    }

    result = await request(
        "market-analysis",
        input=analysis_request,
        budget=5.00,  # $5 for analysis
        client=client,
        provider=AGENT_B_ADDRESS,
    )

    print()
    print("Analysis received:")
    analysis = result.result.get("analysis", {})
    for symbol, data in analysis.items():
        trend = "📈" if data["trend"] == "bullish" else "📉"
        print(f"  {symbol}: {trend} {data['trend']} ({data['confidence']:.0%} confidence) -> {data['recommendation'].upper()}")

    print()
    print(f"Model used: {result.result.get('model')}")
    print(f"Transaction: {result.transaction.id[:16]}...")
    print(f"Amount paid: {format_usdc(result.transaction.amount)}")

    # =====================================================
    # Settlement Complete
    # =====================================================
    log_section("Settlement Complete")

    agent_a_balance_after = await client.get_balance(AGENT_A_ADDRESS)
    agent_b_balance_after = await client.get_balance(AGENT_B_ADDRESS)

    print("Balance changes:")
    print(f"  Agent A: {format_usdc(agent_a_balance_before)} -> {format_usdc(agent_a_balance_after)}")
    print(f"  Agent B: {format_usdc(agent_b_balance_before)} -> {format_usdc(agent_b_balance_after)}")
    print()

    # Calculate fees
    amount_transferred = agent_b_balance_after - agent_b_balance_before
    agent_a_spent = agent_a_balance_before - agent_a_balance_after
    platform_fee = agent_a_spent - amount_transferred

    print(f"Agent A spent: {format_usdc(agent_a_spent)}")
    print(f"Agent B received: {format_usdc(amount_transferred)}")
    print(f"Platform fee (1%): {format_usdc(platform_fee)}")

    # =====================================================
    # Why This Matters
    # =====================================================
    log_section("Why This Matters")

    print("This transaction demonstrates:")
    print()
    print("1. Autonomous Operation")
    print("   - No human intervention required")
    print("   - Agents negotiate, transact, and settle automatically")
    print()
    print("2. Trust Without Intermediaries")
    print("   - Escrow ensures payment only after delivery")
    print("   - Smart contracts enforce the rules")
    print()
    print("3. Composable AI Economy")
    print("   - Agent A can call Agent B, who calls Agent C...")
    print("   - Each specializes in their domain")
    print()
    print("4. Transparent Pricing")
    print("   - Clear cost structure (1% platform fee)")
    print("   - No hidden charges or markup")

    await stop_provider()
    log("🎉", "AI-to-AI payment demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
