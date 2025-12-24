/**
 * Standard API Example 05: Multi-Service Agent
 *
 * Demonstrates an agent that provides multiple services.
 * This is the recommended pattern for production agents.
 *
 * This example demonstrates:
 * - Single agent with multiple services
 * - Different pricing per service
 * - Shared state between services
 * - Service-specific configuration
 *
 * Run: npx ts-node standard/05-multi-service-agent.ts
 */

import { Agent, request, serviceDirectory } from '@agirails/sdk';

async function main() {
  console.log('AGIRAILS Standard API - Multi-Service Agent\n');

  // Create a multi-purpose AI agent
  const agent = new Agent({
    name: 'AIAssistant',
    description: 'Multi-purpose AI assistant providing various services',
    network: 'mock',
    behavior: {
      concurrency: 10, // Handle up to 10 jobs at once
    },
  });

  // Track cross-service statistics
  let totalRequests = 0;

  // === SERVICE 1: Text Summarization ===
  agent.provide(
    {
      name: 'summarize',
      description: 'Summarize long text into key points',
      pricing: {
        cost: { base: 0.25, perUnit: { unit: 'word', rate: 0.001 } },
        margin: 0.30,
      },
    },
    async (job) => {
      totalRequests++;
      const text = job.input.text || '';
      const wordCount = text.split(/\s+/).length;

      // Simulate AI processing
      await new Promise((r) => setTimeout(r, 100));

      return {
        summary: `Summary of ${wordCount} words: ${text.substring(0, 50)}...`,
        originalWords: wordCount,
        summaryWords: Math.floor(wordCount * 0.2),
      };
    }
  );

  // === SERVICE 2: Sentiment Analysis ===
  agent.provide(
    {
      name: 'sentiment',
      description: 'Analyze sentiment of text',
      pricing: {
        cost: { base: 0.10 },
        margin: 0.50,
      },
    },
    async (job) => {
      totalRequests++;
      const text = job.input.text || '';

      // Simple mock sentiment analysis
      const positiveWords = ['good', 'great', 'excellent', 'love', 'happy'];
      const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'sad'];

      const words = text.toLowerCase().split(/\s+/);
      const positiveCount = words.filter((w: string) => positiveWords.includes(w)).length;
      const negativeCount = words.filter((w: string) => negativeWords.includes(w)).length;

      let sentiment: string;
      let score: number;

      if (positiveCount > negativeCount) {
        sentiment = 'positive';
        score = 0.5 + (positiveCount / words.length) * 0.5;
      } else if (negativeCount > positiveCount) {
        sentiment = 'negative';
        score = 0.5 - (negativeCount / words.length) * 0.5;
      } else {
        sentiment = 'neutral';
        score = 0.5;
      }

      return { sentiment, score: Math.round(score * 100) / 100, wordCount: words.length };
    }
  );

  // === SERVICE 3: Language Detection ===
  agent.provide(
    {
      name: 'detect-language',
      description: 'Detect the language of text',
      pricing: {
        cost: { base: 0.05 },
        margin: 0.40,
      },
    },
    async (job) => {
      totalRequests++;
      const text = job.input.text || '';

      // Simple mock language detection
      const croatianWords = ['je', 'i', 'da', 'ne', 'za', 'na'];
      const germanWords = ['der', 'die', 'das', 'und', 'ist', 'nicht'];

      const words = text.toLowerCase().split(/\s+/);

      let detected = 'en'; // Default English
      let confidence = 0.7;

      const croatianCount = words.filter((w: string) => croatianWords.includes(w)).length;
      const germanCount = words.filter((w: string) => germanWords.includes(w)).length;

      if (croatianCount > 2) {
        detected = 'hr';
        confidence = 0.8 + croatianCount * 0.02;
      } else if (germanCount > 2) {
        detected = 'de';
        confidence = 0.8 + germanCount * 0.02;
      }

      return {
        language: detected,
        confidence: Math.min(0.99, confidence),
        alternatives: detected === 'en' ? ['de', 'hr'] : ['en'],
      };
    }
  );

  // === SERVICE 4: Text Translation (combining with detection) ===
  agent.provide(
    {
      name: 'translate',
      description: 'Translate text between languages',
      pricing: {
        cost: { base: 0.50, perUnit: { unit: 'word', rate: 0.005 } },
        margin: 0.35,
      },
      filter: {
        minBudget: 1.0, // Minimum $1 for translations
      },
    },
    async (job) => {
      totalRequests++;
      const { text, to } = job.input;

      // In production, use actual translation API
      return {
        original: text,
        translated: `[${to}] ${text}`,
        from: 'auto-detected',
        to,
        wordCount: text.split(/\s+/).length,
      };
    }
  );

  // Start the agent
  await agent.start();

  // Register all services with service directory
  serviceDirectory.register('summarize', agent.address);
  serviceDirectory.register('sentiment', agent.address);
  serviceDirectory.register('detect-language', agent.address);
  serviceDirectory.register('translate', agent.address);

  console.log('Multi-service agent started:', agent.address);
  console.log('Available services:', agent.serviceNames.join(', '));
  console.log('');

  // === Test all services ===

  console.log('=== Testing Summarization ===');
  const { result: summaryResult } = await request('summarize', {
    input: {
      text: 'AGIRAILS is a decentralized protocol for AI agent payments. It enables autonomous agents to transact with each other using blockchain-based escrow and reputation systems.',
    },
    budget: 1.0,
  });
  console.log('Result:', summaryResult);
  console.log('');

  console.log('=== Testing Sentiment Analysis ===');
  const { result: sentimentResult } = await request('sentiment', {
    input: { text: 'This is a great product! I love how it works. Excellent service.' },
    budget: 0.50,
  });
  console.log('Result:', sentimentResult);
  console.log('');

  console.log('=== Testing Language Detection ===');
  const { result: langResult } = await request('detect-language', {
    input: { text: 'Ovo je tekst na hrvatskom jeziku.' },
    budget: 0.25,
  });
  console.log('Result:', langResult);
  console.log('');

  console.log('=== Testing Translation ===');
  const { result: translateResult } = await request('translate', {
    input: { text: 'Hello, how are you today?', to: 'hr' },
    budget: 2.0,
  });
  console.log('Result:', translateResult);
  console.log('');

  // === Summary ===
  console.log('=== Agent Summary ===\n');
  console.log(`Services provided: ${agent.serviceNames.length}`);
  console.log(`Total requests handled: ${totalRequests}`);
  console.log(`Jobs completed: ${agent.stats.jobsCompleted}`);
  console.log(`Total earned: $${agent.stats.totalEarned.toFixed(2)} USDC`);
  console.log(`Average job time: ${agent.stats.averageJobTime.toFixed(0)}ms`);

  // Unregister services
  serviceDirectory.unregister('summarize', agent.address);
  serviceDirectory.unregister('sentiment', agent.address);
  serviceDirectory.unregister('detect-language', agent.address);
  serviceDirectory.unregister('translate', agent.address);
  await agent.stop();
  console.log('\nMulti-service agent demo complete!');
}

main().catch(console.error);
