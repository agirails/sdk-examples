/**
 * Basic API Example 03: Translation Service
 *
 * A practical example showing how AI agents can provide
 * translation services and get paid automatically.
 *
 * This example demonstrates:
 * - Real-world service pattern
 * - Structured input/output
 * - Budget and timeout configuration
 * - Progress callbacks
 *
 * Run: npx ts-node basic/03-translation-service.ts
 */

import { provide, request } from '@agirails/sdk';
import { waitForProvider } from '../src/utils/helpers';

// Simple mock translation (in production, use actual translation API)
function translate(text: string, from: string, to: string): string {
  const translations: Record<string, Record<string, string>> = {
    'Hello': { de: 'Hallo', es: 'Hola', fr: 'Bonjour', hr: 'Bok' },
    'Thank you': { de: 'Danke', es: 'Gracias', fr: 'Merci', hr: 'Hvala' },
    'Goodbye': { de: 'Auf Wiedersehen', es: 'Adiós', fr: 'Au revoir', hr: 'Doviđenja' },
  };

  return translations[text]?.[to] || `[${to}] ${text}`;
}

async function main() {
  console.log('AGIRAILS Basic API - Translation Service\n');

  // 1. Create translation service provider
  const provider = provide('translation', async (job) => {
    const { text, from, to } = job.input;

    console.log(`  Translating "${text}" from ${from} to ${to}...`);

    // Simulate API call delay
    await new Promise((r) => setTimeout(r, 500));

    const translated = translate(text, from, to);

    return {
      original: text,
      translated,
      from,
      to,
      provider: 'AGIRAILS Demo Translator',
    };
  });

  // Wait for provider to be ready
  await waitForProvider(provider);
  console.log('Translation provider ready:', provider.address);
  console.log('');

  // 2. Request translations
  const phrases = [
    { text: 'Hello', from: 'en', to: 'hr' },
    { text: 'Thank you', from: 'en', to: 'de' },
    { text: 'Goodbye', from: 'en', to: 'es' },
  ];

  for (const phrase of phrases) {
    console.log(`Requesting translation: "${phrase.text}" -> ${phrase.to}`);

    const { result, transaction } = await request('translation', {
      input: phrase,
      budget: 2, // $2 USDC per translation
      timeout: 30000, // 30 seconds timeout
      onProgress: (status) => {
        console.log(`  Status: ${status.state} (${status.progress}%)`);
      },
    });

    const translationResult = result as { original: string; translated: string; from: string; to: string };
    console.log(`  Result: "${translationResult.translated}"`);
    console.log(`  Cost: $${transaction.amount.toFixed(2)} (fee: $${transaction.fee.toFixed(2)})`);
    console.log(`  Duration: ${transaction.duration}ms`);
    console.log('');
  }

  // 3. Show earnings
  console.log('Provider earnings:');
  console.log(`  Total: $${provider.stats.totalEarned.toFixed(2)} USDC`);
  console.log(`  Jobs: ${provider.stats.jobsCompleted}`);

  // 4. Cleanup
  await provider.stop();
  console.log('\nService stopped.');
}

main().catch(console.error);
