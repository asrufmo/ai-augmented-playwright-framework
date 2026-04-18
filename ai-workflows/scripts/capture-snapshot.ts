/**
 * capture-snapshot.ts
 *
 * AI Workflow Script: Navigate to a URL and capture an accessibility snapshot.
 * The snapshot is written to ai-workflows/output/ for human review and
 * can be passed to the test-generation prompt.
 *
 * Usage:
 *   npx ts-node ai-workflows/scripts/capture-snapshot.ts --url http://localhost:3000/login
 *
 * This is a STANDALONE script — it does not modify any test files.
 */

import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = path.resolve('./ai-workflows/output');

interface SnapshotResult {
  url: string;
  timestamp: string;
  ariaSnapshot: string;
  screenshotPath: string;
}

async function captureSnapshot(url: string): Promise<SnapshotResult> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`[capture-snapshot] Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Capture accessibility snapshot (aria tree)
  const ariaSnapshot = await page.locator('body').ariaSnapshot();

  // Capture screenshot
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = path.join(OUTPUT_DIR, `snapshot-${timestamp}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await browser.close();

  const result: SnapshotResult = {
    url,
    timestamp,
    ariaSnapshot,
    screenshotPath,
  };

  // Write JSON output for AI prompt consumption
  const outputPath = path.join(OUTPUT_DIR, `snapshot-${timestamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`[capture-snapshot] Aria snapshot saved to: ${outputPath}`);
  console.log(`[capture-snapshot] Screenshot saved to: ${screenshotPath}`);
  console.log('\n--- ARIA SNAPSHOT PREVIEW ---\n');
  console.log(ariaSnapshot.slice(0, 1000));
  if (ariaSnapshot.length > 1000) console.log(`\n... (${ariaSnapshot.length} chars total, see ${outputPath})`);

  return result;
}

// ─── CLI entrypoint ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const urlArg = args.find(a => a.startsWith('--url='))?.split('=')[1]
  ?? args[args.indexOf('--url') + 1];

if (!urlArg) {
  console.error('Usage: ts-node capture-snapshot.ts --url <URL>');
  process.exit(1);
}

captureSnapshot(urlArg).catch(err => {
  console.error('[capture-snapshot] Error:', err);
  process.exit(1);
});
