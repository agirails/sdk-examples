/**
 * Integration: n8n Webhook with AGIRAILS
 *
 * Demonstrates how to integrate AGIRAILS with n8n workflows using webhooks.
 *
 * Two patterns shown:
 * 1. n8n triggers AGIRAILS request (incoming webhook)
 * 2. AGIRAILS notifies n8n on completion (outgoing webhook)
 *
 * This enables:
 * - Automation workflows that pay for AI services
 * - Event-driven integrations with external systems
 * - Human-in-the-loop approval flows
 *
 * Prerequisites:
 *   - Node.js >= 18.0.0 (for global fetch support)
 *   - npm install express
 *
 * Run: npx ts-node integrations/n8n-webhook.ts
 */

import express, { Request, Response } from 'express';
import { provide, request } from '@agirails/sdk';
import { waitForProvider } from '../src/utils/helpers';

// =========================================================
// CONFIGURATION
// =========================================================

const CONFIG = {
  // Webhook server port
  webhookPort: 3001,

  // n8n webhook URL (where to send completion notifications)
  // In production, this would be your n8n instance webhook URL
  n8nWebhookUrl: 'http://localhost:5678/webhook/agirails-complete',

  // Service configuration
  services: {
    imageAnalysis: {
      name: 'image-analysis',
      budget: 0.5,
    },
    documentSummary: {
      name: 'document-summary',
      budget: 1.0,
    },
  },
};

// =========================================================
// TYPES
// =========================================================

interface WebhookRequest {
  service: string;
  input: any;
  callbackUrl?: string;
  workflowId?: string;
}

interface WebhookResponse {
  success: boolean;
  transactionId?: string;
  result?: any;
  error?: string;
}

// =========================================================
// PART 1: Incoming Webhook Server (n8n -> AGIRAILS)
// =========================================================

function createWebhookServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  /**
   * Main webhook endpoint for n8n
   *
   * n8n sends: POST /webhook/request
   * {
   *   "service": "image-analysis",
   *   "input": { "imageUrl": "https://..." },
   *   "callbackUrl": "http://n8n:5678/webhook/result",
   *   "workflowId": "wf-123"
   * }
   */
  app.post('/webhook/request', async (req: Request, res: Response) => {
    const payload = req.body as WebhookRequest;
    console.log(`\n[Webhook] Received request from n8n:`);
    console.log(`  Service: ${payload.service}`);
    console.log(`  Workflow ID: ${payload.workflowId || 'N/A'}`);

    try {
      // Validate service
      const serviceConfig = Object.values(CONFIG.services).find(
        (s) => s.name === payload.service
      );

      if (!serviceConfig) {
        res.status(400).json({
          success: false,
          error: `Unknown service: ${payload.service}`,
        } as WebhookResponse);
        return;
      }

      // Execute AGIRAILS request
      console.log(`[Webhook] Executing AGIRAILS request...`);
      const { result, transaction } = await request(payload.service, {
        input: payload.input,
        budget: serviceConfig.budget,
      });

      console.log(`[Webhook] Request complete!`);
      console.log(`  Transaction ID: ${transaction.id.substring(0, 20)}...`);
      console.log(`  Amount: $${transaction.amount} USDC`);

      // Send callback to n8n if provided
      if (payload.callbackUrl) {
        await sendCallback(payload.callbackUrl, {
          success: true,
          transactionId: transaction.id,
          result,
          workflowId: payload.workflowId,
        });
      }

      // Respond to n8n
      res.json({
        success: true,
        transactionId: transaction.id,
        result,
      } as WebhookResponse);
    } catch (error) {
      console.error(`[Webhook] Error:`, error);
      res.status(500).json({
        success: false,
        error: String(error),
      } as WebhookResponse);
    }
  });

  /**
   * Async webhook endpoint (returns immediately, calls back when done)
   *
   * Useful for long-running operations where n8n shouldn't wait
   */
  app.post('/webhook/request-async', async (req: Request, res: Response) => {
    const payload = req.body as WebhookRequest;
    const requestId = `req-${Date.now()}`;

    console.log(`\n[Webhook-Async] Received async request: ${requestId}`);

    // Immediately respond with request ID
    res.json({
      success: true,
      requestId,
      message: 'Request queued. Results will be sent to callback URL.',
    });

    // Process in background
    processAsyncRequest(requestId, payload).catch(console.error);
  });

  return app;
}

/**
 * Process request asynchronously and send callback
 */
async function processAsyncRequest(requestId: string, payload: WebhookRequest) {
  console.log(`[Async] Processing ${requestId}...`);

  try {
    const serviceConfig = Object.values(CONFIG.services).find(
      (s) => s.name === payload.service
    );

    if (!serviceConfig) {
      throw new Error(`Unknown service: ${payload.service}`);
    }

    const { result, transaction } = await request(payload.service, {
      input: payload.input,
      budget: serviceConfig.budget,
    });

    console.log(`[Async] ${requestId} complete!`);

    if (payload.callbackUrl) {
      await sendCallback(payload.callbackUrl, {
        success: true,
        requestId,
        transactionId: transaction.id,
        result,
        workflowId: payload.workflowId,
      });
    }
  } catch (error) {
    console.error(`[Async] ${requestId} failed:`, error);

    if (payload.callbackUrl) {
      await sendCallback(payload.callbackUrl, {
        success: false,
        requestId,
        error: String(error),
        workflowId: payload.workflowId,
      });
    }
  }
}

/**
 * Send callback to n8n webhook
 */
async function sendCallback(url: string, data: any) {
  console.log(`[Callback] Sending to ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log(`[Callback] Success!`);
    } else {
      console.log(`[Callback] Failed: ${response.status}`);
    }
  } catch (error) {
    // In demo mode, n8n might not be running
    console.log(`[Callback] Could not reach n8n (expected in demo mode)`);
  }
}

// =========================================================
// PART 2: Start Mock AGIRAILS Providers
// =========================================================

async function startMockProviders() {
  console.log('[Providers] Starting mock AGIRAILS services...');

  // Image Analysis Provider
  const imageProvider = provide('image-analysis', async (job) => {
    const { imageUrl } = job.input as { imageUrl: string };
    console.log(`[ImageAnalysis] Analyzing: ${imageUrl}`);

    await new Promise((r) => setTimeout(r, 500));

    return {
      imageUrl,
      labels: ['outdoor', 'nature', 'landscape'],
      objects: [
        { name: 'tree', confidence: 0.95 },
        { name: 'mountain', confidence: 0.87 },
        { name: 'sky', confidence: 0.99 },
      ],
      colors: ['#87CEEB', '#228B22', '#F5F5DC'],
      dimensions: { width: 1920, height: 1080 },
    };
  });

  // Document Summary Provider
  const docProvider = provide('document-summary', async (job) => {
    const { documentUrl, maxLength } = job.input as {
      documentUrl: string;
      maxLength?: number;
    };
    console.log(`[DocSummary] Summarizing: ${documentUrl}`);

    await new Promise((r) => setTimeout(r, 700));

    return {
      documentUrl,
      summary:
        'This document discusses the implementation of distributed systems with a focus on fault tolerance and scalability. Key topics include consensus algorithms, replication strategies, and partition handling.',
      keyPoints: [
        'Distributed consensus requires majority agreement',
        'Replication improves availability but adds complexity',
        'CAP theorem limits guarantee combinations',
      ],
      wordCount: 2500,
      readingTime: '10 minutes',
    };
  });

  await Promise.all([waitForProvider(imageProvider), waitForProvider(docProvider)]);

  console.log('[Providers] Services ready!\n');

  return {
    stop: async () => {
      await imageProvider.stop();
      await docProvider.stop();
    },
  };
}

// =========================================================
// PART 3: Demo - Simulate n8n Requests
// =========================================================

async function simulateN8nWorkflow() {
  console.log('='.repeat(60));
  console.log('Simulating n8n Workflow Requests');
  console.log('='.repeat(60));
  console.log('');

  const baseUrl = `http://localhost:${CONFIG.webhookPort}`;

  // Simulate n8n sending a synchronous request
  console.log('[n8n] Sending image analysis request...\n');

  const imageResponse = await fetch(`${baseUrl}/webhook/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service: 'image-analysis',
      input: { imageUrl: 'https://example.com/nature-photo.jpg' },
      workflowId: 'wf-image-001',
    }),
  });

  const imageResult = await imageResponse.json();
  console.log('[n8n] Received response:');
  console.log(JSON.stringify(imageResult, null, 2));
  console.log('');

  // Simulate n8n sending a document summary request
  console.log('[n8n] Sending document summary request...\n');

  const docResponse = await fetch(`${baseUrl}/webhook/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service: 'document-summary',
      input: {
        documentUrl: 'https://example.com/whitepaper.pdf',
        maxLength: 200,
      },
      workflowId: 'wf-doc-002',
    }),
  });

  const docResult = await docResponse.json();
  console.log('[n8n] Received response:');
  console.log(JSON.stringify(docResult, null, 2));
  console.log('');
}

// =========================================================
// MAIN
// =========================================================

async function main() {
  console.log('='.repeat(60));
  console.log('AGIRAILS Integration: n8n Webhook');
  console.log('='.repeat(60));
  console.log('');
  console.log('This example shows how to integrate AGIRAILS with n8n workflows.');
  console.log('');

  // Start mock providers
  const providers = await startMockProviders();

  // Create and start webhook server
  const app = createWebhookServer();
  const server = app.listen(CONFIG.webhookPort, () => {
    console.log(`[Webhook Server] Listening on port ${CONFIG.webhookPort}`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  GET  http://localhost:${CONFIG.webhookPort}/health`);
    console.log(`  POST http://localhost:${CONFIG.webhookPort}/webhook/request`);
    console.log(`  POST http://localhost:${CONFIG.webhookPort}/webhook/request-async`);
    console.log('');
  });

  // Wait for server to be ready
  await new Promise((r) => setTimeout(r, 500));

  try {
    // Simulate n8n workflow
    await simulateN8nWorkflow();

    console.log('='.repeat(60));
    console.log('n8n Configuration Guide');
    console.log('='.repeat(60));
    console.log('');
    console.log('To use this in n8n:');
    console.log('');
    console.log('1. Add HTTP Request node:');
    console.log(`   URL: http://your-server:${CONFIG.webhookPort}/webhook/request`);
    console.log('   Method: POST');
    console.log('   Body: { "service": "image-analysis", "input": {...} }');
    console.log('');
    console.log('2. For async operations, use /webhook/request-async');
    console.log('   and configure a Webhook node to receive callbacks');
    console.log('');
    console.log('3. Parse the JSON response to extract results');
    console.log('');
  } finally {
    // Cleanup
    server.close();
    await providers.stop();
    console.log('[Cleanup] Server and providers stopped.');
  }
}

main().catch(console.error);
