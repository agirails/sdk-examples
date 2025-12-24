/**
 * Use Case 01: AI-to-AI Payment
 *
 * Demonstrates the core AGIRAILS use case: one AI agent paying another.
 *
 * Scenario:
 * - Agent A needs data analysis
 * - Agent B offers data analysis service
 * - Agent A pays Agent B through ACTP protocol
 * - Payment is held in escrow until work is delivered
 *
 * This is the foundational pattern for the AI agent economy.
 *
 * Run: npx ts-node usecases/01-ai-to-ai-payment.ts
 */

import { provide, request } from '@agirails/sdk';
import { waitForProvider } from '../src/utils/helpers';

// Simulated AI Agent capabilities
interface AnalysisRequest {
  dataset: string;
  analysisType: 'sentiment' | 'classification' | 'summarization';
}

interface AnalysisResult {
  dataset: string;
  analysisType: string;
  result: Record<string, any>;
  confidence: number;
  processingTimeMs: number;
}

async function main() {
  console.log('='.repeat(60));
  console.log('AGIRAILS Use Case: AI-to-AI Payment');
  console.log('='.repeat(60));
  console.log('');
  console.log('Scenario: Agent A pays Agent B for data analysis');
  console.log('');

  // =========================================================
  // AGENT B: Data Analysis Provider
  // =========================================================
  console.log('[Agent B] Starting data analysis service...');

  const analysisProvider = provide(
    'data-analysis',
    async (job) => {
      const input = job.input as AnalysisRequest;
      const startTime = Date.now();
      console.log(`[Agent B] Received analysis request for: ${input.dataset}`);
      console.log(`[Agent B] Analysis type: ${input.analysisType}`);

      // Simulate AI processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate mock analysis result
      const result: AnalysisResult = {
        dataset: input.dataset,
        analysisType: input.analysisType,
        result: generateMockAnalysis(input.analysisType),
        confidence: 0.87 + Math.random() * 0.1,
        processingTimeMs: Date.now() - startTime,
      };

      console.log(`[Agent B] Analysis complete (${result.processingTimeMs}ms)`);
      return result;
    }
  );

  await waitForProvider(analysisProvider);
  console.log(`[Agent B] Service ready at: ${analysisProvider.address}`);
  console.log('');

  // =========================================================
  // AGENT A: Requester (needs data analysis)
  // =========================================================
  console.log('[Agent A] I need sentiment analysis of customer reviews...');
  console.log('[Agent A] Found provider, initiating payment...');
  console.log('');

  // Agent A requests the service
  const { result, transaction } = await request(
    'data-analysis',
    {
      input: {
        dataset: 'customer-reviews-2024-q4',
        analysisType: 'sentiment',
      },
      budget: 5, // $5 USDC for the analysis
    }
  );
  const analysisResult = result as AnalysisResult;

  // =========================================================
  // RESULTS
  // =========================================================
  console.log('='.repeat(60));
  console.log('Transaction Complete!');
  console.log('='.repeat(60));
  console.log('');

  console.log('Payment Details:');
  console.log(`  Transaction ID: ${transaction.id.substring(0, 20)}...`);
  console.log(`  Amount: $${transaction.amount} USDC`);
  console.log(`  Fee: $${transaction.fee} USDC`);
  console.log(`  Duration: ${transaction.duration}ms`);
  console.log('');

  console.log('Analysis Results:');
  console.log(`  Dataset: ${analysisResult.dataset}`);
  console.log(`  Type: ${analysisResult.analysisType}`);
  console.log(`  Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%`);
  console.log(`  Processing: ${analysisResult.processingTimeMs}ms`);
  console.log('  Sentiment:', JSON.stringify(analysisResult.result, null, 4));
  console.log('');

  // Cleanup
  await analysisProvider.stop();

  console.log('Key Takeaway:');
  console.log('  Agent A paid Agent B $5 for data analysis.');
  console.log('  Payment was held in escrow until delivery.');
  console.log('  No human intervention required.');
  console.log('');
}

// Helper: Generate mock analysis based on type
function generateMockAnalysis(type: string): Record<string, any> {
  switch (type) {
    case 'sentiment':
      return {
        positive: 0.65,
        neutral: 0.25,
        negative: 0.10,
        topPositiveKeywords: ['excellent', 'fast', 'reliable'],
        topNegativeKeywords: ['slow', 'expensive'],
      };
    case 'classification':
      return {
        categories: {
          'Product Quality': 0.35,
          'Customer Service': 0.28,
          'Shipping': 0.22,
          'Pricing': 0.15,
        },
      };
    case 'summarization':
      return {
        summary: 'Customers are generally satisfied with product quality...',
        keyPoints: ['Fast delivery', 'Good value', 'Room for improvement in support'],
      };
    default:
      return { status: 'completed' };
  }
}

main().catch(console.error);
