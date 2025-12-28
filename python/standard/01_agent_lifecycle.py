#!/usr/bin/env python3
"""
Standard API Example 01: Agent Lifecycle

Demonstrates the full Agent lifecycle: start, pause, resume, stop.
The Agent class provides more control than Basic API's provide().

This example demonstrates:
- Agent construction and configuration
- Lifecycle methods: start(), pause(), resume(), stop()
- Status tracking and events

Run: python standard/01_agent_lifecycle.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state


async def main() -> None:
    print("AGIRAILS Standard API - Agent Lifecycle\n")

    clear_mock_state()

    from agirails.level1 import Agent, AgentConfig, AgentBehavior, Job, JobContext

    # 1. Create an Agent with configuration
    agent = Agent(
        AgentConfig(
            name="LifecycleDemo",
            description="Demonstrates agent lifecycle management",
            network="mock",
            behavior=AgentBehavior(
                auto_accept=True,
                concurrency=5,  # Max 5 concurrent jobs
            ),
        )
    )

    print(f"Agent created: {agent.name}")
    print(f"Status: {agent.status.value}")  # 'idle'

    # 2. Register a service using decorator
    @agent.provide("ping")
    async def handle_ping(job: Job, ctx: JobContext) -> dict:
        ctx.log.info("Processing ping request")
        return {"pong": True, "message": "Hello from agent!"}

    print(f"Services: {', '.join(agent.service_names)}")

    # 3. Start the agent
    print("\nStarting agent...")
    await agent.start()

    print(f"Status: {agent.status.value}")  # 'running'
    print(f"Address: {agent.address}")

    # In mock mode, the agent handles jobs internally
    # In production, jobs come from blockchain events

    # 4. Demonstrate lifecycle operations
    await asyncio.sleep(1)

    # 5. Pause the agent
    print("\nPausing agent...")
    agent.pause()
    print(f"Status: {agent.status.value}")  # 'paused'

    # Agent won't accept new jobs while paused
    await asyncio.sleep(1)

    # 6. Resume the agent
    print("\nResuming agent...")
    agent.resume()
    print(f"Status: {agent.status.value}")  # 'running'

    await asyncio.sleep(1)

    # 7. Show stats
    print("\nAgent Stats:")
    print(f"  Jobs received: {agent.stats.jobs_received}")
    print(f"  Jobs completed: {agent.stats.jobs_completed}")
    print(f"  Total earned: ${agent.stats.total_earned:.2f}")
    print(f"  Success rate: {agent.stats.success_rate:.0f}%")

    # 8. Balance info
    print("\nAgent Balance:")
    print(f"  ETH: {agent.balance.eth}")
    print(f"  USDC: {agent.balance.usdc}")

    # 9. Stop the agent
    print("\nStopping agent...")
    await agent.stop()
    print(f"Status: {agent.status.value}")  # 'stopped'

    print("\nLifecycle demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
