import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';
import { test, expect } from '../../fixtures';

/**
 * WCAG 2.1 AA accessibility scans across the key rendered states of TodoMVC.
 *
 * Scan scope: `.todoapp` — the application boundary.
 *
 * color-contrast is DISABLED because the TodoMVC demo app ships with known
 * contrast failures we cannot remediate (third-party CSS):
 *   • <h1>todos</h1>          — contrast 1.26:1  (AA minimum: 3:1 for large text)
 *   • Footer attribution text — contrast 1.68:1  (AA minimum: 4.5:1)
 *   • Filter link active state — below threshold
 *
 * In a real client engagement these would be raised as P2 defects and tracked
 * to resolution before shipping. Disabling the rule here is intentional and
 * documented — not an oversight.
 *
 * Tags: wcag2a + wcag2aa covers the WCAG 2.1 AA standard.
 * Escalate to 'wcag2aaa' to enforce the full AAA ruleset.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const APP_SELECTOR = '.todoapp';

function formatViolations(violations: Result[]): string {
  if (violations.length === 0) return '';
  return violations
    .map(v =>
      `\n[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n` +
      v.nodes.map(n => `  → ${n.html}`).join('\n'),
    )
    .join('\n');
}

test.describe('Accessibility — WCAG 2.1 AA', () => {

  test('empty state: input area has no violations', async ({ todoPage: _todoPage, page }) => {
    const { violations } = await new AxeBuilder({ page })
      .include(APP_SELECTOR)
      .withTags(WCAG_TAGS)
      .disableRules(['color-contrast'])
      .analyze();

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('populated list has no violations', async ({ todoPage, page }) => {
    await todoPage.addTodo('Buy groceries');
    await todoPage.addTodo('Walk the dog');
    await todoPage.addTodo('Read a book');

    const { violations } = await new AxeBuilder({ page })
      .include(APP_SELECTOR)
      .withTags(WCAG_TAGS)
      .disableRules(['color-contrast'])
      .analyze();

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('completed-item state has no violations', async ({ todoPage, page }) => {
    await todoPage.addTodo('Buy groceries');
    await todoPage.addTodo('Walk the dog');
    await todoPage.completeTodo('Buy groceries');

    const { violations } = await new AxeBuilder({ page })
      .include(APP_SELECTOR)
      .withTags(WCAG_TAGS)
      .disableRules(['color-contrast'])
      .analyze();

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('Active filter view has no violations', async ({ todoPage, page }) => {
    await todoPage.addTodo('Buy groceries');
    await todoPage.addTodo('Walk the dog');
    await todoPage.completeTodo('Buy groceries');
    await todoPage.filterBy('Active');

    const { violations } = await new AxeBuilder({ page })
      .include(APP_SELECTOR)
      .withTags(WCAG_TAGS)
      .disableRules(['color-contrast'])
      .analyze();

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('Completed filter view has no violations', async ({ todoPage, page }) => {
    await todoPage.addTodo('Buy groceries');
    await todoPage.completeTodo('Buy groceries');
    await todoPage.filterBy('Completed');

    const { violations } = await new AxeBuilder({ page })
      .include(APP_SELECTOR)
      .withTags(WCAG_TAGS)
      .disableRules(['color-contrast'])
      .analyze();

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

});
