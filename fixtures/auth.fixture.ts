import { test as base, type Browser, type BrowserContext, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { AuthApiClient } from '../api-clients/auth.client';
import { UsersApiClient } from '../api-clients/users.client';
import { Env } from '../config/environments';
import { STORAGE } from '../constants';
import { ensureDir } from '../utils/helpers';
import { logger } from '../utils/logger';

// ─── Fixture type declarations ────────────────────────────────────────────────

interface AuthFixtures {
  /** Standard authenticated user page + context */
  authenticatedPage: Page;
  /** Admin authenticated user page + context */
  adminPage: Page;
  /** Auth tokens for the standard user (for API tests) */
  userToken: string;
  /** Auth tokens for the admin (for API tests) */
  adminToken: string;
  /** Pre-authenticated UsersApiClient */
  usersClient: UsersApiClient;
}

// ─── Setup helpers ────────────────────────────────────────────────────────────

async function getOrCreateAuthState(
  browser: Browser,
  credentials: { email: string; password: string },
  storageStatePath: string,
): Promise<BrowserContext> {
  ensureDir(path.dirname(storageStatePath));

  if (fs.existsSync(storageStatePath)) {
    logger.info(`Reusing auth state: ${storageStatePath}`);
    return browser.newContext({ storageState: storageStatePath });
  }

  logger.info(`Creating new auth state for ${credentials.email}`);
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/login');
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
  await context.storageState({ path: storageStatePath });

  await page.close();
  return context;
}

// ─── Extended test fixture ────────────────────────────────────────────────────

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser }, use) => {
    const env = Env.current();
    const context = await getOrCreateAuthState(
      browser,
      env.credentials,
      STORAGE.AUTH_STATE_PATH,
    );
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser }, use) => {
    const env = Env.current();
    const context = await getOrCreateAuthState(
      browser,
      env.adminCredentials,
      STORAGE.ADMIN_AUTH_STATE_PATH,
    );
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  userToken: async ({ request }, use) => {
    const env = Env.current();
    const authClient = new AuthApiClient(request);
    const tokens = await authClient.loginAndGetTokens(env.credentials);
    await use(tokens.accessToken);
  },

  adminToken: async ({ request }, use) => {
    const env = Env.current();
    const authClient = new AuthApiClient(request);
    const tokens = await authClient.loginAndGetTokens(env.adminCredentials);
    await use(tokens.accessToken);
  },

  usersClient: async ({ request, userToken }, use) => {
    const client = new UsersApiClient(request, userToken);
    await use(client);
  },
});

export { expect } from '@playwright/test';
