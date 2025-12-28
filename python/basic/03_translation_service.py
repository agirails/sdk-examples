#!/usr/bin/env python3
"""
Basic API Example 03: Translation Service

A real-world service example with structured input/output and progress reporting.

This example demonstrates:
- Structured input validation
- Progress callbacks during processing
- Timeout configuration
- Rich result objects

Run: python basic/03_translation_service.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, format_usdc


# Simulated translations (in production, use a real API)
TRANSLATIONS = {
    "de": {
        "Hello": "Hallo",
        "World": "Welt",
        "AGIRAILS": "AGIRAILS",
        "is": "ist",
        "awesome": "fantastisch",
    },
    "es": {
        "Hello": "Hola",
        "World": "Mundo",
        "AGIRAILS": "AGIRAILS",
        "is": "es",
        "awesome": "increíble",
    },
    "fr": {
        "Hello": "Bonjour",
        "World": "Monde",
        "AGIRAILS": "AGIRAILS",
        "is": "est",
        "awesome": "génial",
    },
}


async def main() -> None:
    print("AGIRAILS Basic API - Translation Service\n")

    clear_mock_state()

    from agirails import ACTPClient
    from agirails.level0 import (
        provide,
        request,
        set_provider_client,
        start_provider,
        stop_provider,
    )

    REQUESTER = "0x1111111111111111111111111111111111111111"
    PROVIDER = "0x2222222222222222222222222222222222222222"

    # 1. Create translation service
    async def translate_handler(data: dict) -> dict:
        """Translate text to target language."""
        text = data.get("text", "")
        target_lang = data.get("targetLang", "de")
        source_lang = data.get("sourceLang", "en")

        # Get translation dictionary
        translations = TRANSLATIONS.get(target_lang, {})

        # Simulate word-by-word translation
        words = text.split()
        translated_words = []

        for i, word in enumerate(words):
            # Simulate processing time
            await asyncio.sleep(0.1)

            # Translate or keep original
            translated = translations.get(word, word)
            translated_words.append(translated)

        translated_text = " ".join(translated_words)

        return {
            "original": text,
            "translated": translated_text,
            "sourceLang": source_lang,
            "targetLang": target_lang,
            "wordCount": len(words),
        }

    provider = provide(
        "translate",
        translate_handler,
        description="AI-powered translation service",
    )

    # Set up client and provider
    client = await ACTPClient.create(mode="mock", requester_address=REQUESTER)
    await client.mint_tokens(PROVIDER, 10_000_000)
    set_provider_client(client, address=PROVIDER)
    await start_provider()

    print(f"Translation provider started: {PROVIDER[:10]}...")
    print()

    try:
        # 2. Test translations to different languages
        test_cases = [
            {"text": "Hello World", "targetLang": "de"},
            {"text": "AGIRAILS is awesome", "targetLang": "es"},
            {"text": "Hello AGIRAILS", "targetLang": "fr"},
        ]

        for test in test_cases:
            print(f"Translating to {test['targetLang'].upper()}: \"{test['text']}\"")

            # Progress callback
            def on_progress(status):
                if status.progress:
                    print(f"  Progress: {status.progress}%")

            result = await request(
                "translate",
                input=test,
                budget=2.00,  # $2 per translation
                timeout=30000,  # 30 second timeout
                on_progress=on_progress,
                client=client,
                provider=PROVIDER,
            )

            output = result.result
            print(f"  Result: \"{output['translated']}\"")
            print(f"  Words: {output['wordCount']}")
            print(f"  Cost: {format_usdc(result.transaction.amount)}")
            print()

        # 3. Summary
        print("=" * 40)
        print("Translation Service Demo Complete!")
        print(f"Total translations: {len(test_cases)}")
        print("=" * 40)

    finally:
        await stop_provider()

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
