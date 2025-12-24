/**
 * Standard API Example 03: Job Filtering
 *
 * Demonstrates how to filter which jobs your agent accepts.
 * Useful for specializing in certain types of work.
 *
 * This example demonstrates:
 * - Budget filters (minBudget, maxBudget)
 * - Custom filter functions
 * - Combining filters with pricing
 *
 * Run: npx ts-node standard/03-job-filtering.ts
 */

import { Agent, request, serviceDirectory } from '@agirails/sdk';

async function main() {
  console.log('AGIRAILS Standard API - Job Filtering\n');

  // Create agent
  const agent = new Agent({
    name: 'FilteringAgent',
    network: 'mock',
  });

  // Service 1: With budget filters
  agent.provide(
    {
      name: 'premium-analysis',
      description: 'Premium data analysis service',
      filter: {
        minBudget: 10, // Minimum $10
        maxBudget: 1000, // Maximum $1000
      },
    },
    async (job) => {
      console.log(`  Processing premium analysis (budget: $${job.budget})`);
      return { analysis: 'Premium insights', quality: 'high' };
    }
  );

  // Service 2: With custom filter function
  agent.provide(
    {
      name: 'image-processing',
      description: 'Image processing with size limits',
      filter: {
        // Custom filter: only accept images under 10MB
        custom: (job) => {
          const sizeInMB = job.input.sizeInBytes / (1024 * 1024);
          if (sizeInMB > 10) {
            console.log(`  Rejected: Image too large (${sizeInMB.toFixed(1)}MB)`);
            return false;
          }
          return true;
        },
      },
    },
    async (job) => {
      console.log(`  Processing image (${(job.input.sizeInBytes / 1024).toFixed(0)}KB)`);
      return { processed: true, format: job.input.format };
    }
  );

  // Service 3: Complex filter with multiple conditions
  agent.provide(
    {
      name: 'ai-coding',
      description: 'AI coding assistance',
      filter: {
        minBudget: 5,
        custom: (job) => {
          // Only accept certain programming languages
          const supportedLangs = ['typescript', 'javascript', 'python', 'solidity'];
          const lang = job.input.language?.toLowerCase();
          if (!supportedLangs.includes(lang)) {
            console.log(`  Rejected: Unsupported language (${lang})`);
            return false;
          }
          return true;
        },
      },
    },
    async (job) => {
      console.log(`  Generating ${job.input.language} code...`);
      return { code: `// ${job.input.language} code here`, language: job.input.language };
    }
  );

  await agent.start();
  // Register services with service directory
  serviceDirectory.register('premium-analysis', agent.address);
  serviceDirectory.register('image-processing', agent.address);
  serviceDirectory.register('ai-coding', agent.address);
  console.log('Filtering agent started:', agent.address);
  console.log('Services:', agent.serviceNames.join(', '));
  console.log('');

  // Test premium-analysis filters
  console.log('=== Testing premium-analysis ===\n');

  console.log('Test 1: $5 budget (below minimum $10)');
  try {
    await request('premium-analysis', { input: {}, budget: 5, timeout: 3000 });
    console.log('  Status: ACCEPTED');
  } catch {
    console.log('  Status: REJECTED (below minBudget)');
  }

  console.log('\nTest 2: $50 budget (within range)');
  try {
    await request('premium-analysis', { input: {}, budget: 50 });
    console.log('  Status: ACCEPTED');
  } catch {
    console.log('  Status: REJECTED');
  }

  // Test image-processing filters
  console.log('\n=== Testing image-processing ===\n');

  console.log('Test 3: 5MB image (within limit)');
  try {
    await request('image-processing', {
      input: { sizeInBytes: 5 * 1024 * 1024, format: 'png' },
      budget: 2,
    });
    console.log('  Status: ACCEPTED');
  } catch {
    console.log('  Status: REJECTED');
  }

  console.log('\nTest 4: 15MB image (above limit)');
  try {
    await request('image-processing', {
      input: { sizeInBytes: 15 * 1024 * 1024, format: 'png' },
      budget: 5,
      timeout: 3000,
    });
    console.log('  Status: ACCEPTED');
  } catch {
    console.log('  Status: REJECTED (too large)');
  }

  // Test ai-coding filters
  console.log('\n=== Testing ai-coding ===\n');

  console.log('Test 5: TypeScript code (supported)');
  try {
    await request('ai-coding', {
      input: { language: 'typescript', task: 'write function' },
      budget: 10,
    });
    console.log('  Status: ACCEPTED');
  } catch {
    console.log('  Status: REJECTED');
  }

  console.log('\nTest 6: Rust code (not supported)');
  try {
    await request('ai-coding', {
      input: { language: 'rust', task: 'write function' },
      budget: 10,
      timeout: 3000,
    });
    console.log('  Status: ACCEPTED');
  } catch {
    console.log('  Status: REJECTED (unsupported language)');
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Jobs completed: ${agent.stats.jobsCompleted}`);
  console.log(`Total earned: $${agent.stats.totalEarned.toFixed(2)}`);

  // Unregister services
  serviceDirectory.unregister('premium-analysis', agent.address);
  serviceDirectory.unregister('image-processing', agent.address);
  serviceDirectory.unregister('ai-coding', agent.address);
  await agent.stop();
  console.log('\nFiltering demo complete!');
}

main().catch(console.error);
