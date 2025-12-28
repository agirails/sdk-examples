#!/usr/bin/env python3
"""
Standard API Example 04: Events and Stats

Demonstrates the Agent event system and real-time statistics tracking.

This example demonstrates:
- Event listener registration
- Lifecycle events (started, stopped, paused, resumed)
- Job events (received, completed, failed, progress)
- Payment events
- Real-time statistics

Run: python standard/04_events_and_stats.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state


async def main() -> None:
    print("AGIRAILS Standard API - Events and Stats\n")

    clear_mock_state()

    from agirails.level1 import Agent, AgentConfig, Job, JobContext

    # Create agent
    agent = Agent(
        AgentConfig(
            name="EventsDemo",
            description="Demonstrates event handling",
            network="mock",
        )
    )

    # Event counters for demo
    event_counts = {
        "started": 0,
        "stopped": 0,
        "paused": 0,
        "resumed": 0,
        "job:received": 0,
        "job:completed": 0,
        "job:failed": 0,
        "payment:received": 0,
        "error": 0,
    }

    # 1. Register lifecycle event handlers
    def on_started():
        event_counts["started"] += 1
        print("[EVENT] Agent started")

    def on_stopped():
        event_counts["stopped"] += 1
        print("[EVENT] Agent stopped")

    def on_paused():
        event_counts["paused"] += 1
        print("[EVENT] Agent paused")

    def on_resumed():
        event_counts["resumed"] += 1
        print("[EVENT] Agent resumed")

    agent.on("started", on_started)
    agent.on("stopped", on_stopped)
    agent.on("paused", on_paused)
    agent.on("resumed", on_resumed)

    # 2. Register job event handlers
    def on_job_received(job: Job):
        event_counts["job:received"] += 1
        print(f"[EVENT] Job received: {job.id[:12]}... (service: {job.service})")

    def on_job_completed(job: Job, result: dict):
        event_counts["job:completed"] += 1
        print(f"[EVENT] Job completed: {job.id[:12]}...")

    def on_job_failed(job: Job, error: Exception):
        event_counts["job:failed"] += 1
        print(f"[EVENT] Job failed: {job.id[:12]}... - {error}")

    def on_job_progress(job: Job, progress: int, message: str):
        print(f"[EVENT] Job progress: {job.id[:12]}... - {progress}% - {message}")

    agent.on("job:received", on_job_received)
    agent.on("job:completed", on_job_completed)
    agent.on("job:failed", on_job_failed)
    agent.on("job:progress", on_job_progress)

    # 3. Register payment event handler
    def on_payment(amount: float, tx_id: str):
        event_counts["payment:received"] += 1
        print(f"[EVENT] Payment received: ${amount:.2f} (tx: {tx_id[:12]}...)")

    agent.on("payment:received", on_payment)

    # 4. Register error handler
    def on_error(error: Exception):
        event_counts["error"] += 1
        print(f"[EVENT] Error: {error}")

    agent.on("error", on_error)

    # 5. Register services
    @agent.provide("fast-service")
    async def handle_fast(job: Job, ctx: JobContext) -> dict:
        ctx.progress(50, "Processing...")
        await asyncio.sleep(0.1)
        ctx.progress(100, "Done")
        return {"result": "fast", "duration_ms": 100}

    @agent.provide("slow-service")
    async def handle_slow(job: Job, ctx: JobContext) -> dict:
        for i in range(5):
            ctx.progress(i * 20, f"Step {i + 1}/5")
            await asyncio.sleep(0.2)
        ctx.progress(100, "Complete")
        return {"result": "slow", "duration_ms": 1000}

    print("Registered event handlers for:")
    print("  - Lifecycle: started, stopped, paused, resumed")
    print("  - Jobs: received, completed, failed, progress")
    print("  - Payments: received")
    print("  - Errors")
    print()

    # 6. Start agent (triggers 'started' event)
    print("Starting agent...")
    await agent.start()
    print()

    # 7. Demonstrate lifecycle events
    print("Testing lifecycle events...")
    await asyncio.sleep(0.5)

    agent.pause()  # Triggers 'paused' event
    await asyncio.sleep(0.5)

    agent.resume()  # Triggers 'resumed' event
    await asyncio.sleep(0.5)
    print()

    # 8. Show real-time stats
    print("=" * 50)
    print("Real-time Agent Statistics")
    print("=" * 50)
    print()

    def print_stats():
        stats = agent.stats
        print(f"Jobs Received:    {stats.jobs_received}")
        print(f"Jobs Completed:   {stats.jobs_completed}")
        print(f"Jobs Failed:      {stats.jobs_failed}")
        print(f"Jobs In Progress: {stats.jobs_in_progress}")
        print(f"Total Earned:     ${stats.total_earned:.2f}")
        print(f"Total Spent:      ${stats.total_spent:.2f}")
        print(f"Success Rate:     {stats.success_rate:.1f}%")
        print(f"Avg Job Time:     {stats.average_job_time}ms")

    print("Initial stats:")
    print_stats()
    print()

    # 9. Simulate some activity
    print("Simulating agent activity...")
    await asyncio.sleep(2)
    print()

    print("Stats after activity:")
    print_stats()
    print()

    # 10. Event summary
    print("=" * 50)
    print("Event Summary")
    print("=" * 50)
    for event_name, count in event_counts.items():
        print(f"  {event_name}: {count}")
    print()

    # 11. Stop agent (triggers 'stopped' event)
    print("Stopping agent...")
    await agent.stop()

    print("\nEvents demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
