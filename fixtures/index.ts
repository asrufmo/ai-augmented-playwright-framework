/**
 * Central re-export for all fixtures.
 * Tests import from here instead of individual fixture files.
 *
 * auth.fixture  extends  pages.fixture  extends  @playwright/test
 * So this single import gives access to: page, loginPage, dashboardPage,
 * todoPage, authenticatedPage, adminPage, userToken, adminToken, usersClient.
 *
 * Usage:
 *   import { test, expect } from '../../fixtures';
 */
export { test, expect } from './auth.fixture';
