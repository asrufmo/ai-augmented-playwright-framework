# Playwright Starter Framework

![CI](https://github.com/asrufmo/ai-augmented-playwright-framework/actions/workflows/ci.yml/badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Playwright](https://img.shields.io/badge/Playwright-1.44-green)

A production-ready test automation framework built with **Playwright + TypeScript**, covering UI, API, cross-browser, and load testing in a single cohesive stack. Designed to demonstrate the patterns expected at a Principal SDET level: layered architecture, CI/CD integration, cloud testing, and performance validation.

---

## Tech Stack & Rationale

| Concern | Tool | Why |
|---|---|---|
| UI & API test runner | Playwright 1.44 | Single binary for browser + HTTP; ARIA-first selectors; built-in trace viewer |
| Language | TypeScript 5 | Compile-time safety prevents selector drift; interfaces enforce API contracts |
| Cross-browser cloud | BrowserStack Automate | CDP-native Playwright support; covers Safari/iOS without local macOS requirement |
| Load & performance | k6 | Code-first (JS), scriptable thresholds, CI-friendly exit codes |
| CI/CD | GitHub Actions | Matrix jobs isolate API from UI; artifacts surface HTML reports without a dashboard |
| Reporting | Playwright HTML + k6 summary | Zero-dependency; traces attached on failure for instant root-cause |

---

## Architecture

```
playwright-starter/
├── .github/
│   └── workflows/
│       └── ci.yml                    # Quality gate → API → UI matrix → BrowserStack
│
├── config/
│   └── environments.ts               # local / staging / production via ENVIRONMENT=
│
├── fixtures/
│   ├── pages.fixture.ts              # Injects pre-navigated page objects (loginPage, todoPage …)
│   ├── auth.fixture.ts               # Extends pages fixture — adds authenticatedPage, usersClient …
│   └── index.ts                      # Single import point for all tests
│
├── pages/                            # Page Object Model
│   ├── base.page.ts                  # Abstract — navigation, assertions, screenshot helpers
│   ├── login.page.ts                 # login(), loginAndWaitForDashboard() encapsulate the flow
│   ├── dashboard.page.ts
│   └── todomvc.page.ts               # Selectors derived from live ARIA snapshots
│
├── api-clients/                      # Typed HTTP layer over Playwright's APIRequestContext
│   ├── base.client.ts                # Auth injection, timing, logging, JSON parsing
│   ├── auth.client.ts
│   ├── users.client.ts
│   └── jsonplaceholder.client.ts
│
├── tests/
│   ├── ui/                           # Auth-dependent — requires `setup` project
│   │   ├── auth.setup.ts             # Calls LoginPage.loginAndWaitForDashboard()
│   │   └── login.spec.ts             # Uses loginPage + dashboardPage fixtures
│   ├── public/                       # Auth-free — runs on chromium, firefox, BrowserStack
│   │   └── todomvc.spec.ts           # Uses todoPage fixture — no beforeEach wiring
│   └── api/                          # Headless — fastest CI feedback loop
│       ├── users.spec.ts
│       └── jsonplaceholder.spec.ts
│
├── performance/
│   └── posts.k6.js                   # Ramp → steady → spike; p95/p99 thresholds per endpoint
│
├── constants/index.ts                # HTTP codes, timeouts, routes, perf thresholds
├── types/index.ts                    # Shared domain interfaces across all layers
└── utils/
    ├── logger.ts                     # Winston — structured per-request logs
    └── helpers.ts
```

---

## Design Patterns

### 1. Page Object Model (POM)

Each page of the application is represented by a dedicated class. Tests interact with the page through its public API, never through raw locators.

```
BasePage (abstract)
  ├── LoginPage
  ├── DashboardPage
  └── TodoMVCPage
```

`BasePage` defines the contract — `navigate()`, `assertURL()`, `assertVisible()`, `getAccessibilitySnapshot()` — and all concrete pages inherit it. This means a selector change in production requires updating exactly one class, not every test that touches that page.

```typescript
// pages/login.page.ts
async loginAndWaitForDashboard(email: string, password: string): Promise<void> {
  await this.fill(this.emailInput, email);
  await this.fill(this.passwordInput, password);
  await this.click(this.submitButton);
  await this.assertURL(/\/dashboard/);
}
```

Tests never call `fill` + `click` + `waitForURL` in sequence. They call `loginAndWaitForDashboard`. If the login flow changes (e.g. a two-step email/password), only `LoginPage` changes.

---

### 2. Fixture Pattern (Dependency Injection)

Playwright's fixture system is used as a dependency injection container. Tests declare what they need in their function signature; they never construct or navigate page objects themselves.

**The fixture chain:**

```
@playwright/test (base)
      ↓  extends
pages.fixture.ts   →  provides: loginPage, dashboardPage, todoPage
      ↓  extends
auth.fixture.ts    →  provides: authenticatedPage, adminPage, userToken, usersClient
      ↓  re-exported via
fixtures/index.ts  →  single import for all tests
```

Each fixture is lazy — it only instantiates when a test declares it. A test that receives `{ todoPage }` never triggers `loginPage` or `usersClient` setup.

```typescript
// fixtures/pages.fixture.ts
export const test = base.extend<PageFixtures>({
  todoPage: async ({ page }, use) => {
    const p = new TodoMVCPage(page);
    await p.navigate();   // navigation is the fixture's responsibility
    await use(p);         // test runs here
  },                      // teardown happens automatically after use()
});
```

```typescript
// test — declares dependencies, owns zero setup code
test('adds a todo', async ({ todoPage }) => {
  await todoPage.addTodo('Buy groceries');
  await todoPage.assertTodoVisible('Buy groceries');
});
```

---

### 3. Template Method Pattern

`BasePage` and `BaseApiClient` define the skeleton of an operation and let subclasses fill in the specifics — the classic Template Method pattern.

`BaseApiClient.send()` is the template: it always injects auth headers, measures timing, logs the call, and returns an `APIResponse`. Concrete clients only declare *what* to call, never *how* to call it.

```typescript
// api-clients/base.client.ts — the template
private async send(method, url, options, body?): Promise<APIResponse> {
  const headers = { ...defaults, ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) };
  const start = Date.now();
  const response = await this.request.fetch(url, { method, headers, ... });
  logApiCall(method, url, response.status(), Date.now() - start);
  return response;
}

// api-clients/users.client.ts — the specialisation
async listUsers(params?: ListUsersParams): Promise<APIResponse> {
  return this.get(API.USERS.BASE, { params });  // delegates to the template
}
```

---

### 4. Facade Pattern

Complex, multi-step interactions are hidden behind a single method. The caller doesn't know how many steps are involved.

```typescript
// Before — caller owns every step (fragile, duplicated across tests)
await page.goto('/login');
await page.getByLabel('Email address').fill(email);
await page.getByLabel('Password').fill(password);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(/\/dashboard/);

// After — facade hides the steps (one call, one place to change)
await loginPage.loginAndWaitForDashboard(email, password);
```

The same principle applies to `TodoMVCPage.fillEditAndDiscard()`, which encapsulates a double-click → type → Escape sequence, and `deleteTodo()`, which handles the hover-to-reveal pattern internally.

---

### 5. Strategy Pattern (Environment Configuration)

The `Env` class selects a configuration strategy at runtime based on the `ENVIRONMENT` variable. The caller always calls `Env.current()` — it doesn't know or care which environment it gets.

```typescript
// config/environments.ts
const environments: Record<string, Environment> = {
  local:      { baseURL: 'http://localhost:3000', ... },
  staging:    { baseURL: 'https://staging.example.com', ... },
  production: { baseURL: 'https://app.example.com', ... },
};

export const Env = {
  current(): Environment {
    return environments[process.env.ENVIRONMENT ?? 'local'];
  },
};
```

Switching environments requires no code change — only an env var: `ENVIRONMENT=staging npm run test:ui`.

---

### 6. Layered Architecture

Strict one-way dependency flow between layers prevents coupling:

```
Tests
  └── depends on → Fixtures
                      └── depends on → Pages / API Clients
                                            └── depends on → Constants / Types / Utils
```

Tests never import from `api-clients/` directly. API clients never import from `pages/`. Constants never import from anywhere. This means any layer can be replaced without touching the others.

---

## Getting Started

### Prerequisites

- Node.js 20+
- (Optional) [k6](https://k6.io/docs/get-started/installation/) for performance tests
- (Optional) BrowserStack account for cross-browser runs

### Install

```bash
npm ci
npx playwright install chromium firefox --with-deps
```

### Environment

```bash
cp .env.example .env
# Edit .env with real credentials if running auth-dependent tests
```

---

## Running Tests

### Public UI tests (TodoMVC — no server required)

```bash
npm run test:public                  # Chromium
npm run test:public:firefox          # Firefox
```

### API tests (JSONPlaceholder — no server required)

```bash
npm run test:api
```

### Cross-browser on BrowserStack

```bash
export BROWSERSTACK_USERNAME=your_username
export BROWSERSTACK_ACCESS_KEY=your_key
npm run test:browserstack
```

### Auth-dependent UI tests (requires local server)

```bash
START_SERVER=true ENVIRONMENT=local npm run test:ui
```

### View HTML report

```bash
npm run report
```

### Load & performance test

```bash
npm run test:perf
# Runs a 2m45s k6 scenario: ramp → 10 VUs → spike to 25 → ramp down
# Thresholds: p95 < 500ms, error rate < 1%
```

---

## CI/CD Pipeline

```
push / PR
    │
    ▼
┌─────────────────────┐
│  quality-gate       │  ESLint + tsc --noEmit (fails fast, no browser install)
└─────────┬───────────┘
          │ (parallel)
    ┌─────┴──────┐
    ▼            ▼
┌────────┐  ┌──────────────────┐
│  API   │  │  UI Chromium     │   Both upload playwright-report/ as artifacts
│ Tests  │  │  UI Firefox      │   Traces uploaded on failure only (keeps storage low)
└────────┘  └──────────────────┘
          │
          ▼ (main branch push only)
┌──────────────────────┐
│  BrowserStack        │  Chrome/Win11 + Safari/Ventura via CDP
│  Cross-browser       │  Uses BROWSERSTACK_* GitHub secrets
└──────────────────────┘
```

**Artifacts** — Every CI run uploads an HTML report. On failure, full traces (screenshots + network + timeline) are attached for 7 days.

**Concurrency** — `cancel-in-progress: true` prevents queue buildup on rapid pushes.

---

## Adding BrowserStack Secrets to GitHub

1. Go to your repo → **Settings → Secrets and variables → Actions**
2. Add `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY`
3. The `test-browserstack` job runs automatically on every push to `main`

---

## Adding New UI Tests with Playwright MCP

The tests in this framework were written using the **Playwright MCP** (Model Context Protocol) server inside Claude Code. Instead of guessing selectors from source code, you navigate to the live page, capture its real accessibility tree, interact with it to expose different states, and write selectors grounded in what the browser actually renders.

This workflow eliminates an entire category of test failure: selectors that look right but don't match the live DOM.

### Prerequisites

The Playwright MCP server is configured in `.mcp.json` at the project root:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Open Claude Code in this project directory — the MCP server starts automatically.

---

### Step-by-step workflow

#### 1. Navigate to the target page

```
navigate to https://your-app.com/target-page
```

The MCP opens a real browser. Use it for any page — local dev server, staging, or a public demo.

#### 2. Capture the initial ARIA snapshot

```
take a snapshot of the current page
```

The response is a YAML accessibility tree — every interactive element with its role, name, and ref:

```yaml
- heading "Shopping Cart" [level=1]
- list [ref=e12]:
  - listitem [ref=e13]:
    - generic [ref=e14]: Nike Air Max
    - generic [ref=e15]: £89.99
    - button "Remove item" [ref=e16]
- generic [ref=e20]:
    - strong [ref=e21]: "2"
    - text: items
- button "Proceed to checkout" [ref=e22] [cursor=pointer]
```

**Read this tree carefully before writing a single locator.** The role and name here are exactly what Playwright's `getByRole` expects.

#### 3. Interact with the page to expose all states

A single snapshot only captures the initial state. For any page with dynamic behaviour, trigger each state and snapshot it:

```
click the "Add to cart" button, then take a snapshot
fill the quantity field with 3, then take a snapshot
click "Remove item" on the first product, then take a snapshot
```

Capture at least: empty state, populated state, error state, loading state.

#### 4. Map ARIA tree → Page Object locators

Each node in the ARIA tree maps directly to a Playwright locator. Use the role + accessible name — never CSS classes or test IDs unless no semantic alternative exists.

| ARIA tree entry | Playwright locator |
|---|---|
| `button "Remove item"` | `page.getByRole('button', { name: 'Remove item' })` |
| `textbox "Quantity"` | `page.getByRole('textbox', { name: 'Quantity' })` or `page.getByLabel('Quantity')` |
| `listitem` containing text | `page.getByRole('listitem').filter({ hasText: 'Nike Air Max' })` |
| `strong "2"` + text `items` | `page.locator('.cart-count')` — use CSS only when ARIA role is `generic` with no name |
| `checkbox "Toggle Todo" [checked]` | `page.getByLabel('Toggle Todo')` → assert with `.toBeChecked()` |

#### 5. Write the Page Object

Create `pages/cart.page.ts` extending `BasePage`. Every public method is a meaningful action or assertion — no raw locator exposure:

```typescript
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class CartPage extends BasePage {
  protected readonly path = '/cart';

  // Locators derived directly from the ARIA snapshot
  private itemRow(name: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: name });
  }

  async removeItem(name: string): Promise<void> {
    const row = this.itemRow(name);
    await row.hover();
    await row.getByRole('button', { name: 'Remove item' }).click();
  }

  async proceedToCheckout(): Promise<void> {
    await this.page.getByRole('button', { name: 'Proceed to checkout' }).click();
    await this.assertURL(/\/checkout/);
  }

  async assertItemCount(count: number): Promise<void> {
    const word = count === 1 ? 'item' : 'items';
    await expect(this.page.locator('.cart-count')).toHaveText(`${count} ${word}`);
  }

  async assertItemVisible(name: string): Promise<void> {
    await expect(this.itemRow(name)).toBeVisible();
  }
}
```

#### 6. Register the fixture

Add `cartPage` to `fixtures/pages.fixture.ts`:

```typescript
import { CartPage } from '../pages/cart.page';

interface PageFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  todoPage: TodoMVCPage;
  cartPage: CartPage;           // ← add here
}

export const test = base.extend<PageFixtures>({
  // ... existing fixtures ...
  cartPage: async ({ page }, use) => {
    const p = new CartPage(page);
    await p.navigate();
    await use(p);
  },
});
```

Tests can now receive `cartPage` as a fixture parameter — no `new`, no `navigate()`.

#### 7. Write the tests

```typescript
import { test } from '../../fixtures';

test.describe('Cart', () => {
  test('removes an item from the cart', async ({ cartPage }) => {
    await cartPage.removeItem('Nike Air Max');
    await cartPage.assertItemCount(1);
  });

  test('proceeds to checkout', async ({ cartPage }) => {
    await cartPage.proceedToCheckout();
    await cartPage.assertURL(/\/checkout/);
  });
});
```

---

### Offline snapshot capture (no MCP)

If you prefer a headless script instead of the interactive MCP workflow:

```bash
npm run ai:snapshot -- --url https://your-app.com/cart
```

This runs `ai-workflows/scripts/capture-snapshot.ts`, which writes the ARIA snapshot and a full-page screenshot to `ai-workflows/output/`. Use the snapshot as input to the prompt template in `ai-workflows/prompts/test-generation.md` to generate a first-draft test file for human review.
