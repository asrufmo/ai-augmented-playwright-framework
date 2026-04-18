import { test, expect } from '../../fixtures';
import { Env } from '../../config/environments';
import { ROUTES } from '../../constants';

test.describe('Login', () => {

  // ─── Happy path ───────────────────────────────────────────────────────────

  test('logs in with valid credentials', async ({ loginPage, dashboardPage }) => {
    const env = Env.current();

    await loginPage.loginAndWaitForDashboard(env.credentials.email, env.credentials.password);
    await dashboardPage.assertPageLoaded();
  });

  test('persists session when Remember Me is checked', async ({ loginPage, page }) => {
    const env = Env.current();

    await loginPage.toggleRememberMe();
    await loginPage.loginAndWaitForDashboard(env.credentials.email, env.credentials.password);

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');
    if (sessionCookie?.expires) {
      const expiresAt = new Date(sessionCookie.expires * 1000);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 24 * 60 * 60 * 1000);
    }
  });

  // ─── Validation ───────────────────────────────────────────────────────────

  test('shows error for invalid credentials', async ({ loginPage }) => {
    await loginPage.login('wrong@example.com', 'wrongpassword');
    await loginPage.assertLoginError(/invalid email or password/i);
  });

  test('shows validation error for empty email', async ({ loginPage }) => {
    await loginPage.login('', 'somepassword');
    await loginPage.assertLoginError(/email is required/i);
  });

  test('shows validation error for empty password', async ({ loginPage }) => {
    const env = Env.current();
    await loginPage.login(env.credentials.email, '');
    await loginPage.assertLoginError(/password is required/i);
  });

  test('shows validation error for malformed email', async ({ loginPage }) => {
    await loginPage.login('not-an-email', 'somepassword');
    await loginPage.assertLoginError(/enter a valid email/i);
  });

  // ─── Security ─────────────────────────────────────────────────────────────

  test('redirects to login when accessing dashboard unauthenticated', async ({ page }) => {
    await page.goto(ROUTES.DASHBOARD);
    await expect(page).toHaveURL(/\/login/);
  });

  test('does not expose password in request URLs', async ({ loginPage, page }) => {
    const env = Env.current();

    const requestUrls: string[] = [];
    page.on('request', req => requestUrls.push(req.url()));

    await loginPage.login(env.credentials.email, env.credentials.password);

    const leakedUrl = requestUrls.find(url => url.includes(env.credentials.password));
    expect(leakedUrl).toBeUndefined();
  });

  // ─── Navigation ───────────────────────────────────────────────────────────

  test('navigates to forgot-password page', async ({ loginPage }) => {
    await loginPage.clickForgotPassword();
    await loginPage.assertURL(/\/forgot-password/);
  });

  test('navigates to register page', async ({ loginPage }) => {
    await loginPage.registerLink.click();
    await loginPage.assertURL(/\/register/);
  });

  // ─── Accessibility ────────────────────────────────────────────────────────

  test('key ARIA landmarks present on page load', async ({ loginPage }) => {
    const snapshot = await loginPage.getAccessibilitySnapshot();
    expect(snapshot).toContain('Email address');
    expect(snapshot).toContain('Password');
    expect(snapshot).toContain('Sign in');
  });
});
