import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import { Env } from './config/environments';

dotenv.config();

const env = Env.current();

// ─── BrowserStack ─────────────────────────────────────────────────────────────
const bsEnabled = !!(process.env.BROWSERSTACK_USERNAME && process.env.BROWSERSTACK_ACCESS_KEY);

function bsEndpoint(caps: Record<string, unknown>): string {
  const merged = {
    ...caps,
    'browserstack.username': process.env.BROWSERSTACK_USERNAME,
    'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
    build: `playwright-starter#${process.env.GITHUB_RUN_ID ?? 'local'}`,
    'browserstack.networkLogs': true,
    'browserstack.consoleLogs': 'verbose',
  };
  return `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(merged))}`;
}

const browserStackProjects = bsEnabled
  ? [
      {
        name: 'bs-chrome-win',
        use: {
          connectOptions: {
            wsEndpoint: bsEndpoint({
              browser: 'chrome',
              browser_version: 'latest',
              os: 'Windows',
              os_version: '11',
              name: 'Chrome / Windows 11',
            }),
          },
        },
        testMatch: /tests\/public\/.*/,
      },
      {
        name: 'bs-safari-mac',
        use: {
          connectOptions: {
            wsEndpoint: bsEndpoint({
              browser: 'playwright-webkit',
              browser_version: 'latest',
              os: 'OS X',
              os_version: 'Ventura',
              name: 'Safari / macOS Ventura',
            }),
          },
        },
        testMatch: /tests\/public\/.*/,
      },
    ]
  : [];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(process.env.CI ? [['github'] as ['github']] : []),
  ],

  use: {
    baseURL: env.baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    // --- Setup project for auth state ---
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // --- UI projects ---
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/ui\/.*/,
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /tests\/ui\/.*/,
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /tests\/ui\/.*/,
      dependencies: ['setup'],
    },

    // --- Public UI tests (no auth required, external demo sites) ---
    {
      name: 'public',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/public\/.*/,
    },
    {
      name: 'firefox-public',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /tests\/public\/.*/,
    },
    {
      name: 'mobile-public',
      use: { ...devices['Pixel 5'] },
      testMatch: /tests\/public\/.*/,
    },

    // --- BrowserStack cross-browser (activated via BROWSERSTACK_* env vars) ---
    ...browserStackProjects,

    // --- API project (no browser needed) ---
    {
      name: 'api',
      testMatch: /tests\/api\/.*/,
      use: { baseURL: env.apiBaseURL },
    },
  ],

  webServer: process.env.START_SERVER
    ? {
        command: 'npm run start:server',
        url: env.baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
