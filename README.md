# Playwright Starter Framework

![CI](https://github.com/<YOUR_GITHUB_USERNAME>/playwright-starter/actions/workflows/ci.yml/badge.svg)
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
