# AI Prompt: Test Generation from Accessibility Snapshot

## Purpose
Given a page's accessibility snapshot and URL, ask the AI to:
1. Summarise the page structure
2. Suggest test scenarios (happy path, edge cases, security, accessibility)
3. Generate Playwright TypeScript test code for each scenario

---

## Input Variables
- `{{URL}}` — The page URL
- `{{SNAPSHOT}}` — Aria/accessibility snapshot (from `page.locator('body').ariaSnapshot()`)
- `{{PAGE_OBJECT_NAME}}` — Name of the Page Object to generate/reference

---

## Prompt Template

```
You are a senior SDET reviewing a web page for test coverage.

Page URL: {{URL}}

Accessibility Snapshot:
---
{{SNAPSHOT}}
---

Tasks:
1. SUMMARISE the page structure in 3-5 bullet points. Focus on interactive elements,
   forms, navigation, and any dynamic regions.

2. SUGGEST 6-10 test scenarios covering:
   - Happy path (positive flows)
   - Input validation / edge cases
   - Error states
   - Accessibility (ARIA roles, keyboard navigation)
   - Security (unauthenticated access, XSS attempt on inputs)

3. GENERATE Playwright TypeScript test code for each scenario using:
   - @playwright/test
   - Page Object pattern (class name: {{PAGE_OBJECT_NAME}})
   - Accessibility-first locators (getByRole, getByLabel, getByText)
   - Descriptive test names

Output format:
## Page Summary
<bullets>

## Suggested Scenarios
<numbered list>

## Generated Test Code
<typescript code block>

IMPORTANT: Do not modify any existing test files. Output is for human review only.
```

---

## Expected Output Example

### Page Summary
- Login form with email + password fields
- "Sign in" submit button (disabled until both fields filled)
- "Remember me" checkbox
- "Forgot password?" and "Create an account" links
- Error alert region for failed login attempts

### Suggested Scenarios
1. Successful login with valid credentials → redirect to /dashboard
2. Login with invalid password → error message shown
3. Login with empty email → inline validation error
4. Login with malformed email format → validation error
5. Keyboard navigation through form (Tab order)
6. "Remember me" persists session cookie
7. Direct navigation to /dashboard unauthenticated → redirect to /login
8. XSS attempt in email field (no script execution)

### Generated Test Code
```typescript
import { test, expect } from '../../fixtures';
import { LoginPage } from '../../pages/login.page';

test.describe('Login Page — AI Generated', () => {
  test('should log in with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('user@example.com', 'Test1234!');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('wrong@example.com', 'wrongpass');
    await loginPage.assertLoginError(/invalid email or password/i);
  });
});
```
