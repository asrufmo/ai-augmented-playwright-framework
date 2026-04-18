# AI Prompt: Test Failure Analysis

## Purpose
When a Playwright test fails, collect context (error, screenshot, DOM snapshot)
and ask AI to classify the failure and suggest a fix.

---

## Input Variables
- `{{TEST_NAME}}` — Full test title
- `{{ERROR_MESSAGE}}` — The error thrown by Playwright
- `{{SCREENSHOT_PATH}}` — Path to the failure screenshot
- `{{DOM_SNAPSHOT}}` — Aria snapshot at point of failure (if captured)
- `{{URL}}` — Page URL at failure time

---

## Prompt Template

```
You are a QA engineer debugging a Playwright test failure.

Test: {{TEST_NAME}}
URL at failure: {{URL}}

Error message:
---
{{ERROR_MESSAGE}}
---

DOM/Accessibility snapshot at failure:
---
{{DOM_SNAPSHOT}}
---

Note: A screenshot has been saved to {{SCREENSHOT_PATH}}.

Tasks:

1. CLASSIFY the failure into one of these categories:
   - locator    — element not found or wrong selector
   - data       — test data issue (stale data, wrong values, missing fixtures)
   - backend    — API/server error or unexpected response
   - timing     — race condition, animation, slow load
   - environment — CI config, env variable, network
   - unknown    — cannot determine

2. EXPLAIN the likely root cause in 2-3 sentences.

3. SUGGEST a specific fix. Include code snippets where relevant.

4. STATE your confidence: high | medium | low

Output format (JSON):
{
  "classification": "<category>",
  "summary": "<2-3 sentence explanation>",
  "suggestedFix": "<specific fix with code if applicable>",
  "confidence": "<high|medium|low>"
}

IMPORTANT: This output is advisory only. A human engineer must review and
apply any fixes. Do not automatically modify test files.
```

---

## Example Output

```json
{
  "classification": "locator",
  "summary": "The test tried to find a button with role='button' and name='Sign in', but the DOM snapshot shows the button text was changed to 'Log in'. The selector is no longer matching any element, causing a timeout.",
  "suggestedFix": "Update the locator in login.page.ts from:\n  page.getByRole('button', { name: 'Sign in' })\nto:\n  page.getByRole('button', { name: 'Log in' })\nOr make it regex-tolerant: page.getByRole('button', { name: /sign in|log in/i })",
  "confidence": "high"
}
```
