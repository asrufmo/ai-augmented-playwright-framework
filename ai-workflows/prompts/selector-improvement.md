# AI Prompt: Selector Improvement

## Purpose
Review CSS/XPath selectors in test code and suggest accessibility-first alternatives
that are more resilient to UI refactors and better for ARIA compliance.

---

## Input Variables
- `{{SELECTORS}}` — List of current selectors to review
- `{{DOM_SNAPSHOT}}` — Aria snapshot of the page

---

## Prompt Template

```
You are a Playwright expert reviewing test selectors for robustness and accessibility.

DOM/Accessibility snapshot:
---
{{DOM_SNAPSHOT}}
---

Current selectors to review:
---
{{SELECTORS}}
---

For each selector, suggest a better Playwright locator following this priority:
1. getByRole (preferred — uses ARIA semantics)
2. getByLabel (for form elements)
3. getByText (for static text)
4. getByPlaceholder (for inputs without labels)
5. getByTestId (last resort — requires data-testid attribute)

Output format (JSON array):
[
  {
    "original": "<current selector>",
    "suggested": "<new Playwright locator>",
    "locatorType": "getByRole | getByLabel | getByText | getByTestId | getByPlaceholder",
    "reason": "<why this is better>"
  }
]

IMPORTANT: Output is for human review. Do not modify any files automatically.
```

---

## Example Output

```json
[
  {
    "original": ".btn-primary",
    "suggested": "page.getByRole('button', { name: 'Sign in' })",
    "locatorType": "getByRole",
    "reason": "CSS class selectors break when styles are refactored. ARIA role + name targets the semantic intent and is screen-reader friendly."
  },
  {
    "original": "#email-field",
    "suggested": "page.getByLabel('Email address')",
    "locatorType": "getByLabel",
    "reason": "ID-based selectors are fragile. getByLabel matches the accessible label association and survives ID changes."
  },
  {
    "original": "//input[@type='password']",
    "suggested": "page.getByLabel('Password')",
    "locatorType": "getByLabel",
    "reason": "XPath attribute selectors are brittle. The label association is stable and semantically correct."
  }
]
```
