/**
 * Integration: AGIRAILS as LangChain Tool
 *
 * Demonstrates how to wrap AGIRAILS services as LangChain tools,
 * enabling AI agents built with LangChain to pay for and consume
 * services on the AGIRAILS network.
 *
 * This allows any LangChain agent to:
 * - Discover and use paid AI services
 * - Make autonomous payments for work
 * - Integrate with the agent economy
 *
 * Prerequisites:
 *   npm install @langchain/core @langchain/openai zod
 *
 * Run: npx ts-node integrations/langchain-tool.ts
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
// For full agent setup (requires OpenAI API key):
// import { ChatOpenAI } from '@langchain/openai';
// import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
// import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { provide, request } from '@agirails/sdk';
import { waitForProvider } from '../src/utils/helpers';

// =========================================================
// PART 1: Create AGIRAILS-powered LangChain Tools
// =========================================================

/**
 * Creates a LangChain tool that wraps an AGIRAILS service.
 * The tool handles payment automatically through the ACTP protocol.
 */
function createAGIRAILSTool(
  serviceName: string,
  description: string,
  schema: z.ZodObject<any>,
  budgetUsd: number
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: serviceName.replace(/-/g, '_'), // LangChain prefers underscores
    description: `${description} (Cost: $${budgetUsd} USDC, paid via AGIRAILS)`,
    schema,
    func: async (input) => {
      try {
        const { result } = await request(serviceName, {
          input,
          budget: budgetUsd,
        });
        return JSON.stringify(result, null, 2);
      } catch (error) {
        return `Error calling ${serviceName}: ${error}`;
      }
    },
  });
}

// =========================================================
// PART 2: Example Tools
// =========================================================

// Tool 1: Sentiment Analysis
const sentimentAnalysisTool = createAGIRAILSTool(
  'sentiment-analysis',
  'Analyzes the sentiment of text. Returns positive, neutral, and negative scores.',
  z.object({
    text: z.string().describe('The text to analyze for sentiment'),
  }),
  0.5 // $0.50 per analysis
);

// Tool 2: Code Review
const codeReviewTool = createAGIRAILSTool(
  'code-review',
  'Reviews code for bugs, security issues, and improvements.',
  z.object({
    code: z.string().describe('The code to review'),
    language: z.string().describe('Programming language (e.g., typescript, python)'),
  }),
  2.0 // $2.00 per review
);

// Tool 3: Translation
const translationTool = createAGIRAILSTool(
  'translation',
  'Translates text from one language to another.',
  z.object({
    text: z.string().describe('The text to translate'),
    sourceLanguage: z.string().describe('Source language code (e.g., en, hr, de)'),
    targetLanguage: z.string().describe('Target language code'),
  }),
  0.1 // $0.10 per translation
);

// =========================================================
// PART 3: Start Mock AGIRAILS Providers
// =========================================================

async function startMockProviders() {
  console.log('[Providers] Starting mock AGIRAILS services...\n');

  // Sentiment Analysis Provider
  const sentimentProvider = provide('sentiment-analysis', async (job) => {
    const { text } = job.input as { text: string };
    console.log(`[Sentiment] Analyzing: "${text.substring(0, 50)}..."`);

    // Simulate AI processing
    await new Promise((r) => setTimeout(r, 300));

    return {
      positive: 0.7,
      neutral: 0.2,
      negative: 0.1,
      summary: text.length > 50 ? 'Generally positive sentiment' : 'Neutral',
    };
  });

  // Code Review Provider
  const codeReviewProvider = provide('code-review', async (job) => {
    const { code, language } = job.input as { code: string; language: string };
    console.log(`[CodeReview] Reviewing ${language} code (${code.length} chars)`);

    await new Promise((r) => setTimeout(r, 500));

    return {
      language,
      issues: [
        { severity: 'warning', message: 'Consider adding error handling', line: 3 },
        { severity: 'info', message: 'Could use async/await instead of promises', line: 7 },
      ],
      score: 85,
      summary: 'Code is generally well-structured with minor improvements suggested.',
    };
  });

  // Translation Provider
  const translationProvider = provide('translation', async (job) => {
    const { text, sourceLanguage, targetLanguage } = job.input as {
      text: string;
      sourceLanguage: string;
      targetLanguage: string;
    };
    console.log(`[Translation] ${sourceLanguage} -> ${targetLanguage}: "${text.substring(0, 30)}..."`);

    await new Promise((r) => setTimeout(r, 200));

    // Mock translations
    const translations: Record<string, string> = {
      'Hello, world!': 'Hallo, Welt!',
      'How are you?': 'Wie geht es dir?',
    };

    return {
      original: text,
      translated: translations[text] || `[Translated to ${targetLanguage}]: ${text}`,
      sourceLanguage,
      targetLanguage,
    };
  });

  // Wait for all providers to start
  await Promise.all([
    waitForProvider(sentimentProvider),
    waitForProvider(codeReviewProvider),
    waitForProvider(translationProvider),
  ]);

  console.log('[Providers] All services ready!\n');

  return {
    stop: async () => {
      await sentimentProvider.stop();
      await codeReviewProvider.stop();
      await translationProvider.stop();
    },
  };
}

// =========================================================
// PART 4: Create LangChain Agent with AGIRAILS Tools
// =========================================================

async function createAgentWithAGIRAILSTools() {
  // Note: In real usage, you'd use a real OpenAI key
  // For this demo, we'll simulate the agent behavior
  console.log('[Agent] Creating LangChain agent with AGIRAILS tools...\n');

  const tools = [sentimentAnalysisTool, codeReviewTool, translationTool];

  console.log('Available tools:');
  tools.forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
  console.log('');

  return tools;
}

// =========================================================
// PART 5: Demo - Direct Tool Usage
// =========================================================

async function demoDirectToolUsage(tools: DynamicStructuredTool[]) {
  console.log('='.repeat(60));
  console.log('Demo: Direct Tool Usage (simulating LangChain agent calls)');
  console.log('='.repeat(60));
  console.log('');

  // Simulate agent deciding to analyze sentiment
  console.log('[Agent] I need to analyze customer feedback sentiment...\n');
  const sentimentResult = await tools[0].invoke({
    text: 'This product is amazing! Best purchase I ever made. Highly recommend!',
  });
  console.log('[Agent] Sentiment analysis result:');
  console.log(sentimentResult);
  console.log('');

  // Simulate agent deciding to review code
  console.log('[Agent] Now let me review this code snippet...\n');
  const codeResult = await tools[1].invoke({
    code: `
function fetchData(url) {
  return fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log(data);
      return data;
    });
}`,
    language: 'javascript',
  });
  console.log('[Agent] Code review result:');
  console.log(codeResult);
  console.log('');

  // Simulate agent deciding to translate
  console.log('[Agent] Let me translate this greeting...\n');
  const translationResult = await tools[2].invoke({
    text: 'Hello, world!',
    sourceLanguage: 'en',
    targetLanguage: 'de',
  });
  console.log('[Agent] Translation result:');
  console.log(translationResult);
  console.log('');
}

// =========================================================
// MAIN
// =========================================================

async function main() {
  console.log('='.repeat(60));
  console.log('AGIRAILS Integration: LangChain Tools');
  console.log('='.repeat(60));
  console.log('');
  console.log('This example shows how to wrap AGIRAILS services as LangChain tools.');
  console.log('Each tool automatically handles payment via the ACTP protocol.');
  console.log('');

  // Start mock providers
  const providers = await startMockProviders();

  try {
    // Create agent with AGIRAILS tools
    const tools = await createAgentWithAGIRAILSTools();

    // Demo direct tool usage
    await demoDirectToolUsage(tools);

    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log('');
    console.log('Key Integration Points:');
    console.log('  1. createAGIRAILSTool() wraps any AGIRAILS service as a LangChain tool');
    console.log('  2. Each tool call automatically pays the provider via ACTP');
    console.log('  3. Tools can be used with any LangChain agent (OpenAI, Anthropic, etc.)');
    console.log('  4. Budget is specified per-tool, enabling cost control');
    console.log('');
    console.log('Production Usage:');
    console.log('  - Replace mock providers with real AGIRAILS network services');
    console.log('  - Add proper API key for LangChain model (OpenAI, Anthropic)');
    console.log('  - Create custom tools for your specific use cases');
    console.log('');
  } finally {
    await providers.stop();
  }
}

main().catch(console.error);
