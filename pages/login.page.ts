import { type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants';

/**
 * LoginPage encapsulates all interactions with /login.
 *
 * Locator strategy:
 * - getByRole / getByLabel for form elements (ARIA-compliant, resilient)
 * - getByText for static copy assertions
 * - data-testid as last resort (none needed here)
 */
export class LoginPage extends BasePage {
  protected readonly path = ROUTES.LOGIN;

  // ─── Locators ─────────────────────────────────────────────────────────────
  get emailInput(): Locator {
    return this.page.getByLabel('Email address');
  }

  get passwordInput(): Locator {
    return this.page.getByLabel('Password');
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign in' });
  }

  get rememberMeCheckbox(): Locator {
    return this.page.getByRole('checkbox', { name: 'Remember me' });
  }

  get forgotPasswordLink(): Locator {
    return this.page.getByRole('link', { name: 'Forgot password?' });
  }

  get errorMessage(): Locator {
    return this.page.getByRole('alert');
  }

  get registerLink(): Locator {
    return this.page.getByRole('link', { name: /create an account/i });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.submitButton);
  }

  async loginAndWaitForDashboard(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await this.assertURL(/\/dashboard/);
  }

  async toggleRememberMe(): Promise<void> {
    await this.click(this.rememberMeCheckbox);
  }

  async clickForgotPassword(): Promise<void> {
    await this.click(this.forgotPasswordLink);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertVisible(this.emailInput);
    await this.assertVisible(this.passwordInput);
    await this.assertEnabled(this.submitButton);
  }

  async assertLoginError(expected: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(expected);
  }

  async assertSubmitDisabled(): Promise<void> {
    await this.assertDisabled(this.submitButton);
  }
}
