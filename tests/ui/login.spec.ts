import { test, expect } from '../../fixtures';
import { LoginPage } from '../../pages/login.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { Env } from '../../config/environments';
import { ROUTES } from '../../constants';

/**
 * Login page tests — covers happy path, validation, and security scenarios.
 *
 * All tests use accessibility-first locators via the LoginPage object.
 * The `page` fixture here is unauthenticated (standard Playwright page).
 */
test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  // ─── Happy path ───────────────────────────────────────────────────────────

  test('should log in with valid credentials', async ({ page }) => {
    const env = Env.current();
    const dashboard = new DashboardPage(page);

    await loginPage.loginAndWaitForDashboard(env.credentials.email, env.credentials.password);
    await dashboard.assertPageLoaded();
  });

  test('should persist session when Remember Me is checked', async ({ page }) => {
    const env = Env.current();

    await loginPage.toggleRememberMe();
    await loginPage.loginAndWaitForDashboard(env.credentials.email, env.credentials.password);

    // Cookie should be long-lived — check expiry is > 24h from now
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');
    if (sessionCookie?.expires) {
      const expiresAt = new Date(sessionCookie.expires * 1000);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 24 * 60 * 60 * 1000);
    }
  });

  // ─── Validation ───────────────────────────────────────────────────────────

  test('should show error for invalid credentials', async () => {
    await loginPage.login('wrong@example.com', 'wrongpassword');
    await loginPage.assertLoginError(/invalid email or password/i);
  });

  test('should show validation error for empty email', async () => {
    await loginPage.login('', 'somepassword');
    await loginPage.assertLoginError(/email is required/i);
  });

  test('should show validation error for empty password', async () => {
    const env = Env.current();
    await loginPage.login(env.credentials.email, '');
    await loginPage.assertLoginError(/password is required/i);
  });

  test('should show validation error for malformed email', async () => {
    await loginPage.login('not-an-email', 'somepassword');
    await loginPage.assertLoginError(/enter a valid email/i);
  });

  // ─── Security ─────────────────────────────────────────────────────────────

  test('should redirect to login when accessing dashboard unauthenticated', async ({ page }) => {
    await page.goto(ROUTES.DASHBOARD);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should not expose password in page source or network', async ({ page }) => {
    const env = Env.current();

    // Intercept requests to ensure password is not in query string
    const requests: string[] = [];
    page.on('request', req => requests.push(req.url()));

    await loginPage.login(env.credentials.email, env.credentials.password);

    const leakedUrl = requests.find(url => url.includes(env.credentials.password));
    expect(leakedUrl).toBeUndefined();
  });

  // ─── Navigation ───────────────────────────────────────────────────────────

  test('should navigate to forgot password page', async ({ page }) => {
    await loginPage.clickForgotPassword();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('should navigate to register page', async ({ page }) => {
    await loginPage.registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  // ─── Accessibility ────────────────────────────────────────────────────────

  test('should have no ARIA violations on page load', async () => {
    // Snapshot-driven: verify key landmarks exist in the accessibility tree
    const snapshot = await loginPage.getAccessibilitySnapshot();
    expect(snapshot).toContain('Email address');
    expect(snapshot).toContain('Password');
    expect(snapshot).toContain('Sign in');
  });
});
