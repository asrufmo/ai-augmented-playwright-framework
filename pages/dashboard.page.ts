import { type Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants';

export class DashboardPage extends BasePage {
  protected readonly path = ROUTES.DASHBOARD;

  // ─── Locators ─────────────────────────────────────────────────────────────
  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get userMenu(): Locator {
    return this.page.getByRole('button', { name: /user menu/i });
  }

  get logoutButton(): Locator {
    return this.page.getByRole('menuitem', { name: 'Logout' });
  }

  get navigation(): Locator {
    return this.page.getByRole('navigation', { name: 'Main' });
  }

  navLink(name: string): Locator {
    return this.navigation.getByRole('link', { name });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async logout(): Promise<void> {
    await this.click(this.userMenu);
    await this.click(this.logoutButton);
    await this.assertURL(ROUTES.LOGIN);
  }

  async goToSection(name: string): Promise<void> {
    await this.click(this.navLink(name));
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertVisible(this.heading);
    await this.assertVisible(this.navigation);
  }

  async assertWelcomeMessage(userName: string): Promise<void> {
    const welcome = this.page.getByText(new RegExp(`welcome.+${userName}`, 'i'));
    await this.assertVisible(welcome);
  }
}
