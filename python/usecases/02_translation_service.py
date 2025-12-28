#!/usr/bin/env python3
"""
Use Case: Translation Service

Demonstrates a per-word pricing model for translation services.
Common in real-world translation APIs.

Pricing Model:
- Base fee: $0.50 per request
- Per-word fee: $0.01 per word
- Minimum: $1.00

Run: python usecases/02_translation_service.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.helpers import clear_mock_state, log, log_section, format_usdc


# Pricing constants
BASE_FEE = 0.50  # $0.50 base
PER_WORD_FEE = 0.01  # $0.01 per word
MINIMUM_FEE = 1.00  # $1.00 minimum


def calculate_price(word_count: int) -> float:
    """Calculate translation price based on word count."""
    price = BASE_FEE + (word_count * PER_WORD_FEE)
    return max(price, MINIMUM_FEE)


# Mock translations
MOCK_TRANSLATIONS = {
    "de": {
        "hello": "hallo",
        "world": "welt",
        "the": "die",
        "quick": "schnell",
        "brown": "braun",
        "fox": "fuchs",
        "jumps": "springt",
        "over": "über",
        "lazy": "faul",
        "dog": "hund",
    },
    "es": {
        "hello": "hola",
        "world": "mundo",
        "the": "el",
        "quick": "rápido",
        "brown": "marrón",
        "fox": "zorro",
        "jumps": "salta",
        "over": "sobre",
        "lazy": "perezoso",
        "dog": "perro",
    },
}


def mock_translate(text: str, target: str) -> str:
    """Mock translation function."""
    words = text.lower().split()
    translations = MOCK_TRANSLATIONS.get(target, {})
    translated = [translations.get(w, w) for w in words]
    return " ".join(translated).capitalize()


async def main() -> None:
    log_section("AGIRAILS Use Case - Translation Service")

    clear_mock_state()

    from agirails import ACTPClient
    from agirails.level0 import provide, request, set_provider_client, start_provider, stop_provider

    REQUESTER = "0x1111111111111111111111111111111111111111"
    PROVIDER = "0x2222222222222222222222222222222222222222"

    # =====================================================
    # Pricing Model
    # =====================================================
    log_section("Pricing Model")

    print("Translation Service Pricing:")
    print(f"  Base fee: ${BASE_FEE:.2f}")
    print(f"  Per-word fee: ${PER_WORD_FEE:.2f}")
    print(f"  Minimum fee: ${MINIMUM_FEE:.2f}")
    print()
    print("Example prices:")
    for words in [10, 50, 100, 500, 1000]:
        price = calculate_price(words)
        print(f"  {words:4d} words: ${price:.2f}")
    print()

    # =====================================================
    # Start Translation Service
    # =====================================================
    log_section("Start Translation Service")

    async def translate_handler(data: dict) -> dict:
        """Translation service handler."""
        text = data.get("text", "")
        target_lang = data.get("targetLang", "de")
        source_lang = data.get("sourceLang", "en")

        word_count = len(text.split())
        price = calculate_price(word_count)

        print(f"  [Provider] Translating {word_count} words to {target_lang.upper()}")
        print(f"  [Provider] Price: ${price:.2f}")

        # Simulate processing time
        await asyncio.sleep(0.1 * (word_count / 100 + 1))

        translated = mock_translate(text, target_lang)

        return {
            "original": text,
            "translated": translated,
            "sourceLang": source_lang,
            "targetLang": target_lang,
            "wordCount": word_count,
            "price": price,
        }

    provider = provide("translate", translate_handler)

    client = await ACTPClient.create(mode="mock", requester_address=REQUESTER)
    await client.mint_tokens(REQUESTER, 100_000_000)
    await client.mint_tokens(PROVIDER, 10_000_000)

    set_provider_client(client, address=PROVIDER)
    await start_provider()

    print("Translation service active")
    print()

    # =====================================================
    # Test Translations
    # =====================================================
    log_section("Test Translations")

    test_cases = [
        {
            "text": "Hello world",
            "targetLang": "de",
            "description": "Short phrase (2 words)",
        },
        {
            "text": "The quick brown fox jumps over the lazy dog",
            "targetLang": "es",
            "description": "Classic sentence (9 words)",
        },
        {
            "text": " ".join(["Hello world"] * 25),  # 50 words
            "targetLang": "de",
            "description": "Medium text (50 words)",
        },
    ]

    total_spent = 0
    total_words = 0

    for i, test in enumerate(test_cases, 1):
        log(f"{i}️⃣", test["description"])

        word_count = len(test["text"].split())
        expected_price = calculate_price(word_count)

        print(f"   Words: {word_count}")
        print(f"   Expected price: ${expected_price:.2f}")

        result = await request(
            "translate",
            input={"text": test["text"], "targetLang": test["targetLang"]},
            budget=expected_price * 1.1,  # 10% buffer
            client=client,
            provider=PROVIDER,
        )

        output = result.result
        print(f"   Translated: \"{output['translated'][:50]}...\"")
        print(f"   Actual cost: {format_usdc(result.transaction.amount)}")
        print()

        total_spent += result.transaction.amount
        total_words += word_count

    # =====================================================
    # Summary
    # =====================================================
    log_section("Summary")

    print("Session Statistics:")
    print(f"  Total translations: {len(test_cases)}")
    print(f"  Total words: {total_words}")
    print(f"  Total spent: {format_usdc(total_spent)}")
    print(f"  Avg cost per word: ${total_spent / 1_000_000 / total_words:.4f}")
    print()

    print("Provider Earnings:")
    provider_balance = await client.get_balance(PROVIDER)
    print(f"  Balance: {format_usdc(provider_balance)}")

    await stop_provider()
    log("🎉", "Translation service demo complete!")


if __name__ == "__main__":
    asyncio.run(main())
