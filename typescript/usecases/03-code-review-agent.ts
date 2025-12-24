/**
 * Use Case 03: Code Review Agent
 *
 * An AI agent that reviews code for bugs, security issues, and best practices.
 *
 * Scenario:
 * - Developer submits code for review
 * - AI agent analyzes code and provides feedback
 * - Payment based on lines of code reviewed
 * - Escrow ensures quality delivery
 *
 * This pattern applies to any code analysis service.
 *
 * Run: npx ts-node usecases/03-code-review-agent.ts
 */

import { provide, request } from '@agirails/sdk';
import { waitForProvider } from '../src/utils/helpers';

// Types
interface CodeReviewRequest {
  code: string;
  language: string;
  reviewType: 'security' | 'quality' | 'performance' | 'all';
}

interface CodeIssue {
  line: number;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  suggestion?: string;
}

interface CodeReviewResult {
  language: string;
  linesOfCode: number;
  issues: CodeIssue[];
  summary: {
    critical: number;
    warnings: number;
    info: number;
  };
  score: number; // 0-100
  recommendations: string[];
}

// Pricing: $0.005 per line of code
const PRICE_PER_LINE = 0.005;
const MINIMUM_PRICE = 0.50;

async function main() {
  console.log('='.repeat(60));
  console.log('AGIRAILS Use Case: Code Review Agent');
  console.log('='.repeat(60));
  console.log('');
  console.log('Pricing: $0.005/line (minimum $0.50)');
  console.log('');

  // =========================================================
  // AGENT: Code Review Service
  // =========================================================
  console.log('[Agent] Starting code review service...');

  const codeReviewAgent = provide(
    'code-review',
    async (job) => {
      const input = job.input as CodeReviewRequest;
      const { code, language, reviewType } = input;
      console.log(`[Agent] Reviewing ${language} code (${reviewType} review)`);

      // Count lines
      const lines = code.split('\n');
      const linesOfCode = lines.filter((l) => l.trim().length > 0).length;
      console.log(`[Agent] Lines of code: ${linesOfCode}`);

      // Analyze code (simulated - would use real AI in production)
      const issues = analyzeCode(code, language, reviewType);
      const summary = {
        critical: issues.filter((i) => i.severity === 'critical').length,
        warnings: issues.filter((i) => i.severity === 'warning').length,
        info: issues.filter((i) => i.severity === 'info').length,
      };

      // Calculate score (100 - deductions)
      const score = Math.max(
        0,
        100 - summary.critical * 20 - summary.warnings * 5 - summary.info * 1
      );

      const result: CodeReviewResult = {
        language,
        linesOfCode,
        issues,
        summary,
        score,
        recommendations: generateRecommendations(issues),
      };

      console.log(`[Agent] Review complete. Score: ${score}/100`);
      return result;
    }
  );

  await waitForProvider(codeReviewAgent);
  console.log(`[Agent] Ready at: ${codeReviewAgent.address}`);
  console.log('');

  // =========================================================
  // DEVELOPER: Submits Code for Review
  // =========================================================
  const codeToReview = `
function processUserInput(input) {
  // TODO: Add validation
  const query = "SELECT * FROM users WHERE id = " + input;
  db.execute(query);

  eval(input); // Dynamic code execution

  const password = "admin123"; // Hardcoded password

  if (input == null) {
    return null;
  }

  console.log("Processing: " + input);
  return input.trim();
}

async function fetchData(url) {
  const response = await fetch(url);
  return response.json(); // No error handling
}
  `.trim();

  console.log('[Developer] Submitting code for security review...');
  console.log('');

  const { result, transaction } = await request(
    'code-review',
    {
      input: {
        code: codeToReview,
        language: 'javascript',
        reviewType: 'security',
      },
      budget: 10, // Max $10 for review
    }
  );
  const reviewResult = result as CodeReviewResult;

  // =========================================================
  // RESULTS
  // =========================================================
  console.log('='.repeat(60));
  console.log('Code Review Complete!');
  console.log('='.repeat(60));
  console.log('');

  console.log('Overview:');
  console.log(`  Language: ${reviewResult.language}`);
  console.log(`  Lines reviewed: ${reviewResult.linesOfCode}`);
  console.log(`  Code quality score: ${reviewResult.score}/100`);
  console.log('');

  console.log('Issue Summary:');
  console.log(`  Critical: ${reviewResult.summary.critical}`);
  console.log(`  Warnings: ${reviewResult.summary.warnings}`);
  console.log(`  Info: ${reviewResult.summary.info}`);
  console.log('');

  console.log('Issues Found:');
  for (const issue of reviewResult.issues) {
    const icon =
      issue.severity === 'critical' ? '!!!' :
      issue.severity === 'warning' ? ' !!' : '  i';
    console.log(`  [${icon}] Line ${issue.line}: ${issue.message}`);
    if (issue.suggestion) {
      console.log(`        Fix: ${issue.suggestion}`);
    }
  }
  console.log('');

  console.log('Recommendations:');
  for (const rec of reviewResult.recommendations) {
    console.log(`  - ${rec}`);
  }
  console.log('');

  console.log('Transaction:');
  console.log(`  ID: ${transaction.id.substring(0, 20)}...`);
  console.log(`  Amount: $${transaction.amount} USDC`);
  console.log(`  Fee: $${transaction.fee} USDC`);
  console.log('');

  // Cleanup
  await codeReviewAgent.stop();

  console.log('Value Delivered:');
  console.log('  - Found SQL injection vulnerability');
  console.log('  - Identified hardcoded credentials');
  console.log('  - Detected unsafe eval() usage');
  console.log('  - Payment held in escrow until delivery');
  console.log('');
}

// Analyze code for issues (simulated AI analysis)
function analyzeCode(code: string, language: string, reviewType: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // SQL Injection detection
    if (line.includes('SELECT') && line.includes('+')) {
      issues.push({
        line: lineNum,
        severity: 'critical',
        category: 'SQL Injection',
        message: 'Potential SQL injection vulnerability',
        suggestion: 'Use parameterized queries instead of string concatenation',
      });
    }

    // Eval detection
    if (line.includes('eval(')) {
      issues.push({
        line: lineNum,
        severity: 'critical',
        category: 'Code Injection',
        message: 'Dangerous eval() usage detected',
        suggestion: 'Avoid eval() - use safer alternatives like JSON.parse()',
      });
    }

    // Hardcoded credentials
    if (line.includes('password') && line.includes('=') && line.includes('"')) {
      issues.push({
        line: lineNum,
        severity: 'critical',
        category: 'Credentials',
        message: 'Hardcoded password detected',
        suggestion: 'Use environment variables or a secrets manager',
      });
    }

    // TODO comments
    if (line.includes('TODO')) {
      issues.push({
        line: lineNum,
        severity: 'warning',
        category: 'Incomplete',
        message: 'TODO comment found - incomplete implementation',
        suggestion: 'Complete the TODO before deploying to production',
      });
    }

    // No error handling
    if (line.includes('.json()') && !code.includes('try')) {
      issues.push({
        line: lineNum,
        severity: 'warning',
        category: 'Error Handling',
        message: 'No error handling for JSON parsing',
        suggestion: 'Wrap in try-catch to handle malformed JSON',
      });
    }

    // Loose equality
    if (line.includes('== null')) {
      issues.push({
        line: lineNum,
        severity: 'info',
        category: 'Best Practice',
        message: 'Using loose equality (==) instead of strict (===)',
        suggestion: 'Use === for type-safe comparisons',
      });
    }
  });

  return issues;
}

// Generate recommendations based on issues
function generateRecommendations(issues: CodeIssue[]): string[] {
  const recommendations: string[] = [];
  const categories = new Set(issues.map((i) => i.category));

  if (categories.has('SQL Injection')) {
    recommendations.push('Implement prepared statements for all database queries');
  }
  if (categories.has('Code Injection')) {
    recommendations.push('Remove all eval() calls and use safer parsing methods');
  }
  if (categories.has('Credentials')) {
    recommendations.push('Audit codebase for hardcoded secrets and migrate to env vars');
  }
  if (categories.has('Error Handling')) {
    recommendations.push('Add comprehensive error handling throughout async code');
  }
  if (issues.filter((i) => i.severity === 'critical').length >= 3) {
    recommendations.push('Consider a full security audit before deployment');
  }

  return recommendations;
}

main().catch(console.error);
