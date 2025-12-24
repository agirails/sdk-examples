/**
 * Use Case 02: Translation Service
 *
 * A practical example of an AI translation service with dynamic pricing.
 *
 * Scenario:
 * - Translation provider charges per word ($0.01/word)
 * - Client requests translation of a document
 * - Payment is calculated based on word count
 * - Escrow ensures provider gets paid after delivery
 *
 * This pattern works for any metered AI service.
 *
 * Run: npx ts-node usecases/02-translation-service.ts
 */

import { provide, request } from '@agirails/sdk';
import { waitForProvider } from '../src/utils/helpers';

// Service types
interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  wordCount: number;
  pricePerWord: number;
  totalCost: number;
}

// Pricing: $0.01 per word, minimum $0.10
const PRICE_PER_WORD = 0.01;
const MINIMUM_PRICE = 0.10;

async function main() {
  console.log('='.repeat(60));
  console.log('AGIRAILS Use Case: Translation Service');
  console.log('='.repeat(60));
  console.log('');
  console.log('Pricing: $0.01/word (minimum $0.10)');
  console.log('');

  // =========================================================
  // PROVIDER: Translation Service
  // =========================================================
  console.log('[Provider] Starting translation service...');

  const translationProvider = provide(
    'translation',
    async (job) => {
      const input = job.input as TranslationRequest;
      const { text, sourceLang, targetLang } = input;
      console.log(`[Provider] Translation request: ${sourceLang} -> ${targetLang}`);

      // Count words
      const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
      console.log(`[Provider] Word count: ${wordCount}`);

      // Simulate translation (in reality, call GPT-4, DeepL, etc.)
      const translatedText = simulateTranslation(text, targetLang);

      // Calculate pricing
      const totalCost = Math.max(wordCount * PRICE_PER_WORD, MINIMUM_PRICE);

      const result: TranslationResult = {
        originalText: text,
        translatedText,
        sourceLang,
        targetLang,
        wordCount,
        pricePerWord: PRICE_PER_WORD,
        totalCost,
      };

      console.log(`[Provider] Translation complete. Cost: $${totalCost.toFixed(2)}`);
      return result;
    }
  );

  await waitForProvider(translationProvider);
  console.log(`[Provider] Ready at: ${translationProvider.address}`);
  console.log('');

  // =========================================================
  // CLIENT: Needs Translation
  // =========================================================
  const documentToTranslate = `
    Welcome to the future of AI agent commerce.
    AGIRAILS enables autonomous AI agents to transact with each other
    using blockchain-based escrow and reputation systems.
    This is the foundation of the agent economy.
  `.trim();

  console.log('[Client] Document to translate:');
  console.log(`"${documentToTranslate.substring(0, 50)}..."`);
  console.log('');

  // Request translation
  console.log('[Client] Requesting English -> German translation...');

  const { result, transaction } = await request(
    'translation',
    {
      input: {
        text: documentToTranslate,
        sourceLang: 'en',
        targetLang: 'de',
      },
      budget: 5, // Max budget $5 (actual cost calculated by provider)
    }
  );
  const translationResult = result as TranslationResult;

  // =========================================================
  // RESULTS
  // =========================================================
  console.log('');
  console.log('='.repeat(60));
  console.log('Translation Complete!');
  console.log('='.repeat(60));
  console.log('');

  console.log('Service Metrics:');
  console.log(`  Words translated: ${translationResult.wordCount}`);
  console.log(`  Price per word: $${translationResult.pricePerWord}`);
  console.log(`  Total cost: $${translationResult.totalCost.toFixed(2)}`);
  console.log('');

  console.log('Original (EN):');
  console.log(`  "${translationResult.originalText.substring(0, 60)}..."`);
  console.log('');

  console.log('Translated (DE):');
  console.log(`  "${translationResult.translatedText.substring(0, 60)}..."`);
  console.log('');

  console.log('Transaction:');
  console.log(`  ID: ${transaction.id.substring(0, 20)}...`);
  console.log(`  Amount: $${transaction.amount} USDC`);
  console.log('');

  // Cleanup
  await translationProvider.stop();

  console.log('Business Model:');
  console.log('  - Per-word pricing for translation services');
  console.log('  - Escrow protects both parties');
  console.log('  - Transparent cost calculation');
  console.log('');
}

// Simulate translation (mock - would use real API in production)
function simulateTranslation(text: string, targetLang: string): string {
  // Simple mock translations
  const translations: Record<string, Record<string, string>> = {
    de: {
      'Welcome': 'Willkommen',
      'future': 'Zukunft',
      'AI agent': 'KI-Agent',
      'commerce': 'Handel',
      'enables': 'ermöglicht',
      'autonomous': 'autonom',
      'transact': 'handeln',
      'blockchain': 'Blockchain',
      'escrow': 'Treuhand',
      'reputation': 'Reputation',
      'foundation': 'Grundlage',
      'economy': 'Wirtschaft',
    },
  };

  // Very basic word replacement (real service would use proper translation API)
  let translated = text;
  const langDict = translations[targetLang] || {};

  for (const [en, target] of Object.entries(langDict)) {
    translated = translated.replace(new RegExp(en, 'gi'), target);
  }

  // Add [DE] prefix to show it's "translated"
  return `[${targetLang.toUpperCase()}] ${translated}`;
}

main().catch(console.error);
