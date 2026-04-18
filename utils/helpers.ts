import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Wait for a network response matching a URL pattern and return the JSON body.
 */
export async function waitForApiResponse<T>(
  page: Page,
  urlPattern: string | RegExp,
  action: () => Promise<void>,
): Promise<T> {
  const [response] = await Promise.all([
    page.waitForResponse(urlPattern),
    action(),
  ]);
  return response.json() as Promise<T>;
}

/**
 * Read a JSON file from the test-data directory and parse it.
 */
export function loadTestData<T>(filename: string): T {
  const filePath = path.resolve('./test-data', filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/**
 * Generate a unique string using a prefix and timestamp. Useful for avoiding
 * test data collisions between runs.
 */
export function unique(prefix = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Pause execution — only use in exploratory/local debugging. Never commit
 * unconditional sleeps into CI tests; prefer `waitFor*` helpers instead.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation up to `attempts` times with exponential back-off.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 500,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await sleep(delayMs * 2 ** i);
    }
  }
  throw lastError;
}

/**
 * Ensure a directory exists (creates it recursively if absent).
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Write content to a file, creating parent directories as needed.
 */
export function writeFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Format duration for human-readable output.
 */
export function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1_000)}s`;
}
