#!/usr/bin/env python3
"""
Use Case: Code Review Agent

Demonstrates an AI-powered security code review service.
Charges per line of code analyzed.

Pricing Model:
- Per-line fee: $0.005 per line
- Minimum: $1.00
- Express review: 2x price

Run: python usecases/03_code_review_agent.py
"""

import asyncio
import sys
import re
from pathlib import Path
from dataclasses import dataclass
from typing import List
from enum import Enum

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section, format_usdc


# Pricing constants
PER_LINE_FEE = 0.005  # $0.005 per line
MINIMUM_FEE = 1.00
EXPRESS_MULTIPLIER = 2.0


class Severity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


@dataclass
class Issue:
    """A code review issue."""
    line: int
    severity: Severity
    title: str
    description: str
    suggestion: str


def calculate_price(line_count: int, express: bool = False) -> float:
    """Calculate review price."""
    price = line_count * PER_LINE_FEE
    if express:
        price *= EXPRESS_MULTIPLIER
    return max(price, MINIMUM_FEE)


# Mock vulnerability patterns
VULNERABILITY_PATTERNS = [
    {
        "pattern": r"eval\s*\(",
        "severity": Severity.CRITICAL,
        "title": "Eval Usage Detected",
        "description": "Using eval() can lead to code injection vulnerabilities",
        "suggestion": "Use ast.literal_eval() for safe evaluation or restructure code to avoid eval",
    },
    {
        "pattern": r"exec\s*\(",
        "severity": Severity.CRITICAL,
        "title": "Exec Usage Detected",
        "description": "Using exec() can lead to arbitrary code execution",
        "suggestion": "Avoid exec() - use explicit function calls instead",
    },
    {
        "pattern": r"subprocess\.call\([^,]+shell\s*=\s*True",
        "severity": Severity.HIGH,
        "title": "Shell Injection Risk",
        "description": "Using shell=True with subprocess can lead to command injection",
        "suggestion": "Use subprocess with shell=False and pass arguments as a list",
    },
    {
        "pattern": r"password\s*=\s*['\"][^'\"]+['\"]",
        "severity": Severity.HIGH,
        "title": "Hardcoded Password",
        "description": "Passwords should not be hardcoded in source code",
        "suggestion": "Use environment variables or secure secret management",
    },
    {
        "pattern": r"#\s*TODO|#\s*FIXME",
        "severity": Severity.LOW,
        "title": "TODO/FIXME Comment",
        "description": "Unresolved development note found",
        "suggestion": "Address or document the TODO/FIXME before production",
    },
]


def analyze_code(code: str) -> List[Issue]:
    """Analyze code for security issues."""
    issues = []
    lines = code.split("\n")

    for line_num, line in enumerate(lines, 1):
        for pattern_info in VULNERABILITY_PATTERNS:
            if re.search(pattern_info["pattern"], line, re.IGNORECASE):
                issues.append(Issue(
                    line=line_num,
                    severity=pattern_info["severity"],
                    title=pattern_info["title"],
                    description=pattern_info["description"],
                    suggestion=pattern_info["suggestion"],
                ))

    return issues


async def main() -> None:
    log_section("AGIRAILS Use Case - Code Review Agent")

    clear_mock_state()

    from agirails import ACTPClient
    from agirails.level0 import provide, request, set_provider_client, start_provider, stop_provider

    REQUESTER = "0x1111111111111111111111111111111111111111"
    PROVIDER = "0x2222222222222222222222222222222222222222"

    # =====================================================
    # Pricing Model
    # =====================================================
    log_section("Pricing Model")

    print("Code Review Pricing:")
    print(f"  Per-line fee: ${PER_LINE_FEE:.3f}")
    print(f"  Minimum fee: ${MINIMUM_FEE:.2f}")
    print(f"  Express multiplier: {EXPRESS_MULTIPLIER}x")
    print()
    print("Example prices:")
    for lines in [50, 100, 500, 1000, 5000]:
        standard = calculate_price(lines, express=False)
        express = calculate_price(lines, express=True)
        print(f"  {lines:4d} lines: ${standard:.2f} (standard) / ${express:.2f} (express)")
    print()

    # =====================================================
    # Start Code Review Service
    # =====================================================
    log_section("Start Code Review Service")

    async def review_handler(data: dict) -> dict:
        """Code review service handler."""
        code = data.get("code", "")
        language = data.get("language", "python")
        express = data.get("express", False)

        lines = code.split("\n")
        line_count = len(lines)
        price = calculate_price(line_count, express)

        mode = "EXPRESS" if express else "STANDARD"
        print(f"  [Provider] Reviewing {line_count} lines ({language}) - {mode}")

        # Simulate analysis time
        await asyncio.sleep(0.5 if express else 1.0)

        issues = analyze_code(code)

        # Sort by severity
        severity_order = {
            Severity.CRITICAL: 0,
            Severity.HIGH: 1,
            Severity.MEDIUM: 2,
            Severity.LOW: 3,
            Severity.INFO: 4,
        }
        issues.sort(key=lambda x: severity_order[x.severity])

        return {
            "language": language,
            "linesAnalyzed": line_count,
            "issuesFound": len(issues),
            "issues": [
                {
                    "line": i.line,
                    "severity": i.severity.value,
                    "title": i.title,
                    "description": i.description,
                    "suggestion": i.suggestion,
                }
                for i in issues
            ],
            "summary": {
                "critical": sum(1 for i in issues if i.severity == Severity.CRITICAL),
                "high": sum(1 for i in issues if i.severity == Severity.HIGH),
                "medium": sum(1 for i in issues if i.severity == Severity.MEDIUM),
                "low": sum(1 for i in issues if i.severity == Severity.LOW),
            },
            "price": price,
        }

    provider = provide("code-review", review_handler)

    client = await ACTPClient.create(mode="mock", requester_address=REQUESTER)
    await client.mint_tokens(REQUESTER, 100_000_000)
    await client.mint_tokens(PROVIDER, 10_000_000)

    set_provider_client(client, address=PROVIDER)
    await start_provider()

    print("Code review service active")
    print()

    # =====================================================
    # Test Code Review
    # =====================================================
    log_section("Test Code Review")

    # Sample vulnerable code
    sample_code = '''
import subprocess
import os

# Configuration
password = "supersecret123"  # TODO: Move to environment variable
api_key = os.getenv("API_KEY")

def execute_command(user_input):
    """Execute a shell command."""
    # FIXME: This is unsafe
    result = subprocess.call(user_input, shell=True)
    return result

def process_data(data):
    """Process user data."""
    # Evaluate user expression
    result = eval(data)
    return result

def main():
    user_cmd = input("Enter command: ")
    execute_command(user_cmd)
'''

    line_count = len(sample_code.split("\n"))
    expected_price = calculate_price(line_count)

    log("🔍", f"Submitting {line_count} lines for review...")
    print(f"   Expected price: ${expected_price:.2f}")
    print()

    result = await request(
        "code-review",
        input={
            "code": sample_code,
            "language": "python",
            "express": False,
        },
        budget=expected_price * 1.1,
        client=client,
        provider=PROVIDER,
    )

    output = result.result

    # Display results
    log("📋", "Review Results")
    print()
    print(f"Lines analyzed: {output['linesAnalyzed']}")
    print(f"Issues found: {output['issuesFound']}")
    print()

    print("Issue Summary:")
    summary = output["summary"]
    print(f"  🔴 Critical: {summary['critical']}")
    print(f"  🟠 High: {summary['high']}")
    print(f"  🟡 Medium: {summary['medium']}")
    print(f"  🟢 Low: {summary['low']}")
    print()

    print("Detailed Issues:")
    for issue in output["issues"]:
        severity_emoji = {
            "critical": "🔴",
            "high": "🟠",
            "medium": "🟡",
            "low": "🟢",
            "info": "🔵",
        }.get(issue["severity"], "⚪")

        print(f"  {severity_emoji} Line {issue['line']}: {issue['title']}")
        print(f"     {issue['description']}")
        print(f"     💡 {issue['suggestion']}")
        print()

    print(f"Review cost: {format_usdc(result.transaction.amount)}")

    # =====================================================
    # Express Review Demo
    # =====================================================
    log_section("Express Review")

    log("⚡", "Submitting same code for EXPRESS review...")

    express_price = calculate_price(line_count, express=True)
    print(f"   Express price: ${express_price:.2f} (2x standard)")

    express_result = await request(
        "code-review",
        input={
            "code": sample_code,
            "language": "python",
            "express": True,
        },
        budget=express_price * 1.1,
        client=client,
        provider=PROVIDER,
    )

    print(f"   Express review cost: {format_usdc(express_result.transaction.amount)}")

    await stop_provider()
    log("🎉", "Code review demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
