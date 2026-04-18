import { test as setup } from '@playwright/test';
import { Env } from '../../config/environments';
import { STORAGE } from '../../constants';
import { ensureDir } from '../../utils/helpers';
import * as path from 'path';

/**
 * Auth setup runs once before all UI tests.
 * It logs in via the UI and saves the browser storage state to disk.
 * UI tests then load this state to skip the login step entirely.
 *
 * Named `*.setup.ts` so the `setup` project in playwright.config.ts picks it up.
 */

setup('authenticate as standard user', async ({ page }) => {
  ensureDir(path.dirname(STORAGE.AUTH_STATE_PATH));

  const env = Env.current();

  await page.goto('/login');
  await page.getByLabel('Email address').fill(env.credentials.email);
  await page.getByLabel('Password').fill(env.credentials.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);

  await page.context().storageState({ path: STORAGE.AUTH_STATE_PATH });
});

setup('authenticate as admin', async ({ page }) => {
  ensureDir(path.dirname(STORAGE.ADMIN_AUTH_STATE_PATH));

  const env = Env.current();

  await page.goto('/login');
  await page.getByLabel('Email address').fill(env.adminCredentials.email);
  await page.getByLabel('Password').fill(env.adminCredentials.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);

  await page.context().storageState({ path: STORAGE.ADMIN_AUTH_STATE_PATH });
});
