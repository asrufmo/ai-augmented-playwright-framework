import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { TodoMVCPage } from '../pages/todomvc.page';

/**
 * PageFixtures injects fully-constructed, pre-navigated page objects.
 *
 * Tests declare what they need; they never call `new` or `.navigate()`.
 * Fixture scope is 'test' (default) — a fresh instance per test, torn down automatically.
 */
interface PageFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  todoPage: TodoMVCPage;
}

export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    const p = new LoginPage(page);
    await p.navigate();
    await use(p);
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  todoPage: async ({ page }, use) => {
    const p = new TodoMVCPage(page);
    await p.navigate();
    await use(p);
  },
});

export { expect } from '@playwright/test';
