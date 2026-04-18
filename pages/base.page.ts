import { type Page, type Locator, expect } from '@playwright/test';
import { logger } from '../utils/logger';
import { TIMEOUT } from '../constants';

/**
 * BasePage provides shared navigation, waiting, and assertion helpers.
 * All page objects extend this class — never instantiate it directly.
 *
 * Design decisions:
 * - Accessibility-first selectors (getByRole, getByLabel) everywhere.
 * - All navigation goes through `navigate()` so URL resolution is consistent.
 * - Errors surface through Playwright's expect() so failures include context.
 */
export abstract class BasePage {
  protected readonly page: Page;

  /** Subclasses declare the relative path for their page, e.g. '/login' */
  protected abstract readonly path: string;

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  async navigate(relPath?: string): Promise<void> {
    const target = relPath ?? this.path;
    logger.info(`Navigating to ${target}`);
    await this.page.goto(target, { waitUntil: 'domcontentloaded' });
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: TIMEOUT.NAVIGATION });
  }

  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'networkidle' });
  }

  async goBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'networkidle' });
  }

  // ─── URL helpers ─────────────────────────────────────────────────────────────

  currentURL(): string {
    return this.page.url();
  }

  async assertURL(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(expected, { timeout: TIMEOUT.SHORT });
  }

  async assertTitle(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(expected);
  }

  // ─── Element helpers ──────────────────────────────────────────────────────────

  protected async click(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: TIMEOUT.SHORT });
    await locator.click();
  }

  protected async fill(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: TIMEOUT.SHORT });
    await locator.clear();
    await locator.fill(value);
  }

  protected async selectOption(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: TIMEOUT.SHORT });
    await locator.selectOption(value);
  }

  // ─── Visibility / state assertions ───────────────────────────────────────────

  async assertVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible({ timeout: TIMEOUT.SHORT });
  }

  async assertHidden(locator: Locator): Promise<void> {
    await expect(locator).toBeHidden({ timeout: TIMEOUT.SHORT });
  }

  async assertText(locator: Locator, expected: string | RegExp): Promise<void> {
    await expect(locator).toHaveText(expected, { timeout: TIMEOUT.SHORT });
  }

  async assertEnabled(locator: Locator): Promise<void> {
    await expect(locator).toBeEnabled({ timeout: TIMEOUT.SHORT });
  }

  async assertDisabled(locator: Locator): Promise<void> {
    await expect(locator).toBeDisabled({ timeout: TIMEOUT.SHORT });
  }

  // ─── Toast / alert helpers ────────────────────────────────────────────────────

  async assertSuccessToast(message: string | RegExp): Promise<void> {
    const toast = this.page.getByRole('alert').filter({ hasText: message });
    await expect(toast).toBeVisible({ timeout: TIMEOUT.SHORT });
  }

  async assertErrorToast(message: string | RegExp): Promise<void> {
    const toast = this.page.getByRole('alert').filter({ hasText: message });
    await expect(toast).toBeVisible({ timeout: TIMEOUT.SHORT });
  }

  // ─── Screenshot ───────────────────────────────────────────────────────────────

  async takeScreenshot(name: string): Promise<Buffer> {
    logger.info(`Screenshot: ${name}`);
    return this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }

  // ─── Accessibility ────────────────────────────────────────────────────────────

  async getAccessibilitySnapshot(): Promise<string> {
    // Uses Playwright's built-in aria snapshot for the full page
    const snapshot = await this.page.locator('body').ariaSnapshot();
    return snapshot;
  }
}
