import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://demo.playwright.dev/todomvc', { waitUntil: 'networkidle' });

  const input = page.getByRole('textbox', { name: 'What needs to be done?' });
  await input.fill('Buy groceries');
  await input.press('Enter');
  await input.fill('Write tests');
  await input.press('Enter');

  // Complete first item
  await page.getByRole('checkbox').first().check();

  const snapshot = await page.locator('body').ariaSnapshot();
  console.log(snapshot);

  await browser.close();
})();
