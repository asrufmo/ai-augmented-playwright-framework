/**
 * analyze-failure.ts
 *
 * AI Workflow Script: Reads a Playwright test result (JSON report) and
 * for each failed test, builds a structured failure context and formats
 * the analysis prompt for human review or optional AI API call.
 *
 * Usage:
 *   npx ts-node ai-workflows/scripts/analyze-failure.ts
 *   npx ts-node ai-workflows/scripts/analyze-failure.ts --results test-results/results.json
 *
 * Output: ai-workflows/output/failure-analysis-<timestamp>.md
 *
 * GUARDRAIL: This script is READ-ONLY. It never modifies test files.
 * All output is human-reviewable Markdown.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AiFailureAnalysis, FailureContext } from '../../types';

const OUTPUT_DIR = path.resolve('./ai-workflows/output');
const DEFAULT_RESULTS = './test-results/results.json';

interface PlaywrightResult {
  suites?: PlaywrightSuite[];
}

interface PlaywrightSuite {
  title: string;
  suites?: PlaywrightSuite[];
  specs?: PlaywrightSpec[];
}

interface PlaywrightSpec {
  title: string;
  tests?: PlaywrightTest[];
}

interface PlaywrightTest {
  status: string;
  results?: PlaywrightTestResult[];
}

interface PlaywrightTestResult {
  status: string;
  error?: { message?: string; stack?: string };
  attachments?: Array<{ name: string; path?: string; contentType: string }>;
}

function collectFailures(suite: PlaywrightSuite, breadcrumb = ''): FailureContext[] {
  const failures: FailureContext[] = [];
  const title = breadcrumb ? `${breadcrumb} > ${suite.title}` : suite.title;

  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      if (t.status !== 'failed' && t.status !== 'flaky') continue;

      for (const result of t.results ?? []) {
        if (result.status !== 'failed') continue;

        const screenshot = result.attachments?.find(a =>
          a.name === 'screenshot' && a.contentType === 'image/png',
        );

        failures.push({
          testName: `${title} > ${spec.title}`,
          errorMessage: result.error?.stack ?? result.error?.message ?? 'No error captured',
          screenshotPath: screenshot?.path,
        });
      }
    }
  }

  for (const child of suite.suites ?? []) {
    failures.push(...collectFailures(child, title));
  }

  return failures;
}

function buildPrompt(ctx: FailureContext): string {
  return `
## Test: ${ctx.testName}

**Error:**
\`\`\`
${ctx.errorMessage}
\`\`\`

${ctx.screenshotPath ? `**Screenshot:** \`${ctx.screenshotPath}\`` : '_No screenshot captured_'}

**Analysis prompt** (paste into Claude / ChatGPT):

> You are a QA engineer debugging a Playwright test failure.
> Test: "${ctx.testName}"
> Error: "${ctx.errorMessage}"
>
> Classify the failure as: locator | data | backend | timing | environment | unknown.
> Explain the likely root cause (2-3 sentences).
> Suggest a specific fix with code if applicable.
> State your confidence: high | medium | low.
> Output as JSON: { classification, summary, suggestedFix, confidence }
`;
}

function run(resultsPath: string): void {
  if (!fs.existsSync(resultsPath)) {
    console.error(`Results file not found: ${resultsPath}`);
    console.error('Run "npm test" first, then re-run this script.');
    process.exit(1);
  }

  const raw = fs.readFileSync(resultsPath, 'utf-8');
  const report: PlaywrightResult = JSON.parse(raw);

  const failures: FailureContext[] = [];
  for (const suite of report.suites ?? []) {
    failures.push(...collectFailures(suite));
  }

  if (failures.length === 0) {
    console.log('No failures found in results. All tests passed!');
    return;
  }

  console.log(`Found ${failures.length} failure(s). Building analysis report...`);

  const lines: string[] = [
    '# Playwright Failure Analysis Report',
    `Generated: ${new Date().toISOString()}`,
    `Source: ${resultsPath}`,
    `Total failures: ${failures.length}`,
    '',
    '---',
    '',
    '> **GUARDRAIL**: This report is READ-ONLY. Review each analysis and apply',
    '> fixes manually after human verification.',
    '',
  ];

  for (const ctx of failures) {
    lines.push(buildPrompt(ctx));
    lines.push('---');
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(OUTPUT_DIR, `failure-analysis-${timestamp}.md`);
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');

  console.log(`\nAnalysis report written to: ${outPath}`);
  console.log('Review the file and paste each prompt into your AI assistant.');
}

const args = process.argv.slice(2);
const resultsArg = args.find(a => a.startsWith('--results='))?.split('=')[1]
  ?? args[args.indexOf('--results') + 1]
  ?? DEFAULT_RESULTS;

run(resultsArg);
