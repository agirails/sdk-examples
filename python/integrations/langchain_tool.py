#!/usr/bin/env python3
"""
Integration: LangChain Tool

Demonstrates wrapping AGIRAILS services as LangChain tools.
Enables AI agents to use AGIRAILS services in their reasoning chains.

Requirements:
    pip install langchain langchain-core

Run: python integrations/langchain_tool.py
"""

import asyncio
import sys
from pathlib import Path
from typing import Any, Optional, Type
from dataclasses import dataclass

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section


# Check if LangChain is available
try:
    from langchain.tools import BaseTool
    from langchain.callbacks.manager import CallbackManagerForToolRun
    from pydantic import BaseModel, Field
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False
    print("LangChain not installed. Run: pip install langchain langchain-core")
    print("This example will show the conceptual implementation.\n")


@dataclass
class MockToolResult:
    """Mock result for demonstration without LangChain."""
    output: str


def create_agirails_tool_class():
    """Create AGIRAILS tool class (requires LangChain)."""

    if not HAS_LANGCHAIN:
        return None

    class TranslateInput(BaseModel):
        """Input schema for translation tool."""
        text: str = Field(description="Text to translate")
        target_lang: str = Field(default="de", description="Target language code (e.g., 'de', 'es', 'fr')")

    class AGIRAILSTranslateTool(BaseTool):
        """LangChain tool that uses AGIRAILS translation service."""

        name: str = "agirails_translate"
        description: str = "Translate text to another language using AGIRAILS. Input should be the text to translate."
        args_schema: Type[BaseModel] = TranslateInput

        # AGIRAILS configuration
        provider_address: str = "0x2222222222222222222222222222222222222222"
        budget: float = 1.0
        _client: Any = None
        _loop: Any = None

        def __init__(self, client=None, **kwargs):
            super().__init__(**kwargs)
            self._client = client
            self._loop = asyncio.new_event_loop()

        def _run(
            self,
            text: str,
            target_lang: str = "de",
            run_manager: Optional[CallbackManagerForToolRun] = None,
        ) -> str:
            """Execute the tool synchronously."""
            return self._loop.run_until_complete(
                self._arun(text, target_lang, run_manager)
            )

        async def _arun(
            self,
            text: str,
            target_lang: str = "de",
            run_manager: Optional[CallbackManagerForToolRun] = None,
        ) -> str:
            """Execute the tool asynchronously."""
            from agirails.level0 import request

            result = await request(
                "translate",
                input={"text": text, "targetLang": target_lang},
                budget=self.budget,
                client=self._client,
                provider=self.provider_address,
            )

            output = result.result
            return f"Translated ({output.get('sourceLang', 'en')} -> {target_lang}): {output.get('translated', text)}"

    return AGIRAILSTranslateTool


async def main() -> None:
    log_section("AGIRAILS Integration - LangChain Tool")

    clear_mock_state()

    from agirails import ACTPClient
    from agirails.level0 import provide, request, set_provider_client, start_provider, stop_provider

    REQUESTER = "0x1111111111111111111111111111111111111111"
    PROVIDER = "0x2222222222222222222222222222222222222222"

    # =====================================================
    # Part 1: Setup AGIRAILS Service
    # =====================================================
    log_section("Part 1: Setup AGIRAILS Service")

    # Mock translation
    async def translate_handler(data: dict) -> dict:
        text = data.get("text", "")
        target = data.get("targetLang", "de")
        # Simple mock translation
        translated = f"[{target.upper()}] {text}"
        return {
            "original": text,
            "translated": translated,
            "sourceLang": "en",
            "targetLang": target,
        }

    provide("translate", translate_handler)

    client = await ACTPClient.create(mode="mock", requester_address=REQUESTER)
    await client.mint_tokens(REQUESTER, 100_000_000)
    await client.mint_tokens(PROVIDER, 10_000_000)

    set_provider_client(client, address=PROVIDER)
    await start_provider()

    print("Translation service active")
    print()

    # =====================================================
    # Part 2: Create LangChain Tool
    # =====================================================
    log_section("Part 2: Create LangChain Tool")

    if HAS_LANGCHAIN:
        AGIRAILSTranslateTool = create_agirails_tool_class()
        tool = AGIRAILSTranslateTool(client=client)

        print(f"Tool name: {tool.name}")
        print(f"Tool description: {tool.description}")
        print()

        # Test the tool directly
        log("🔧", "Testing tool directly...")
        result = await tool._arun("Hello world", "de")
        print(f"   Result: {result}")
        print()
    else:
        print("Conceptual tool implementation:")
        print()
        print("```python")
        print("class AGIRAILSTranslateTool(BaseTool):")
        print("    name = 'agirails_translate'")
        print("    description = 'Translate text using AGIRAILS'")
        print("    ")
        print("    async def _arun(self, text: str, target_lang: str) -> str:")
        print("        result = await request(")
        print("            'translate',")
        print("            input={'text': text, 'targetLang': target_lang},")
        print("            budget=1.0")
        print("        )")
        print("        return result.result['translated']")
        print("```")
        print()

    # =====================================================
    # Part 3: LangChain Agent Usage (Conceptual)
    # =====================================================
    log_section("Part 3: LangChain Agent Usage")

    print("Using AGIRAILS tools with LangChain agents:")
    print()
    print("```python")
    print("from langchain.agents import initialize_agent, AgentType")
    print("from langchain.chat_models import ChatOpenAI")
    print()
    print("# Create tools")
    print("translate_tool = AGIRAILSTranslateTool(client=client)")
    print("summarize_tool = AGIRAILSSummarizeTool(client=client)")
    print()
    print("# Create agent with tools")
    print("llm = ChatOpenAI(model='gpt-4')")
    print("agent = initialize_agent(")
    print("    tools=[translate_tool, summarize_tool],")
    print("    llm=llm,")
    print("    agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,")
    print(")")
    print()
    print("# Run agent")
    print("result = agent.run(")
    print("    'Translate \"The quick brown fox\" to German, then summarize the result.'")
    print(")")
    print("```")
    print()

    # =====================================================
    # Part 4: Benefits
    # =====================================================
    log_section("Part 4: Benefits")

    print("Why use AGIRAILS with LangChain?")
    print()
    print("1. Paid Services in AI Chains")
    print("   - LangChain agent can pay for premium services")
    print("   - Services like translation, analysis, verification")
    print("   - Automatic budget management")
    print()
    print("2. Decentralized AI Ecosystem")
    print("   - Access services from any AGIRAILS provider")
    print("   - No vendor lock-in")
    print("   - Transparent pricing")
    print()
    print("3. Trust and Verification")
    print("   - Escrow ensures payment after delivery")
    print("   - EAS attestations for proof of work")
    print("   - Dispute resolution if needed")
    print()
    print("4. Composability")
    print("   - Chain multiple AGIRAILS services")
    print("   - Combine with other LangChain tools")
    print("   - Build complex AI workflows")

    # =====================================================
    # Part 5: Multiple Tools Example
    # =====================================================
    log_section("Part 5: Multiple Tools")

    print("Creating multiple AGIRAILS tools:")
    print()
    print("```python")
    print("# Translation tool")
    print("translate = AGIRAILSTool(")
    print("    name='translate',")
    print("    service='translate',")
    print("    description='Translate text to another language',")
    print("    budget=1.0,")
    print(")")
    print()
    print("# Code review tool")
    print("code_review = AGIRAILSTool(")
    print("    name='code_review',")
    print("    service='code-review',")
    print("    description='Review code for security issues',")
    print("    budget=5.0,")
    print(")")
    print()
    print("# Summarization tool")
    print("summarize = AGIRAILSTool(")
    print("    name='summarize',")
    print("    service='summarize',")
    print("    description='Summarize long text',")
    print("    budget=2.0,")
    print(")")
    print()
    print("# Use all tools in agent")
    print("agent = initialize_agent(")
    print("    tools=[translate, code_review, summarize],")
    print("    llm=llm,")
    print(")")
    print("```")

    await stop_provider()
    log("🎉", "LangChain integration demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
