import { test as setup } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { Env } from '../../config/environments';
import { STORAGE } from '../../constants';
import { ensureDir } from '../../utils/helpers';
import * as path from 'path';

setup('authenticate as standard user', async ({ page }) => {
  ensureDir(path.dirname(STORAGE.AUTH_STATE_PATH));

  const env = Env.current();
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.loginAndWaitForDashboard(env.credentials.email, env.credentials.password);

  await page.context().storageState({ path: STORAGE.AUTH_STATE_PATH });
});

setup('authenticate as admin', async ({ page }) => {
  ensureDir(path.dirname(STORAGE.ADMIN_AUTH_STATE_PATH));

  const env = Env.current();
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.loginAndWaitForDashboard(env.adminCredentials.email, env.adminCredentials.password);

  await page.context().storageState({ path: STORAGE.ADMIN_AUTH_STATE_PATH });
});
