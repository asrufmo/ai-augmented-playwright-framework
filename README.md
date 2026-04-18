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
│       └── ci.yml              # Quality gate → API tests → UI matrix → BrowserStack
│
├── config/
│   └── environments.ts         # local / staging / production env switching via ENVIRONMENT=
│
├── fixtures/
│   ├── auth.fixture.ts         # Extends base test with authenticatedPage, usersClient etc.
│   └── index.ts                # Re-exports — tests import from here, not individual files
│
├── pages/                      # Page Object Model
│   ├── base.page.ts            # Navigation, assertions, screenshot helpers (abstract)
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   └── todomvc.page.ts         # Derived from live ARIA snapshot — selectors are grounded
│
├── api-clients/                # Typed HTTP layer built on Playwright's APIRequestContext
│   ├── base.client.ts          # Auth injection, logging, error handling, JSON parsing
│   ├── auth.client.ts
│   ├── users.client.ts
│   └── jsonplaceholder.client.ts  # Public REST API client (no auth)
│
├── tests/
│   ├── ui/                     # Auth-dependent UI tests (requires setup project)
│   │   └── auth.setup.ts
│   ├── public/                 # Auth-free UI tests — run on chromium + firefox + BrowserStack
│   │   └── todomvc.spec.ts     # 20 tests across 7 behaviour groups
│   └── api/                    # Headless API tests — fastest CI feedback
│       ├── users.spec.ts
│       └── jsonplaceholder.spec.ts  # 13 tests: CRUD, 4xx, shape, perf threshold
│
├── performance/
│   └── posts.k6.js             # k6 load profile: ramp → steady → spike; p95/p99 thresholds
│
├── constants/index.ts          # HTTP status codes, timeouts, routes, perf thresholds
├── types/index.ts              # Domain interfaces shared across layers
└── utils/
    ├── logger.ts               # Winston — structured logs at info/warn/error per request
    └── helpers.ts
```

### Key design decisions

**ARIA-first selectors** — All page objects use `getByRole`, `getByLabel`, and `getByText` sourced from live `page.ariaSnapshot()` captures. This makes tests resilient to CSS/class changes and doubles as an accessibility audit.

**Base class hierarchy** — `BasePage` and `BaseApiClient` absorb boilerplate (navigation, auth headers, timing, JSON parsing). Concrete classes stay under 60 lines and contain only domain logic.

**Project isolation** — Three Playwright projects keep concerns separate: `api` (headless, fast), `public` (no-auth UI), `chromium/firefox` (auth-dependent UI). CI runs `api` and `public` on every push; auth-dependent UI runs only when a server is available.

**BrowserStack as an opt-in layer** — The `bs-*` projects activate only when `BROWSERSTACK_USERNAME` + `BROWSERSTACK_ACCESS_KEY` are set. Local runs are never interrupted; CI gates on BrowserStack only on pushes to `main`.

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

## Framework Patterns

### Page Object

```typescript
// pages/todomvc.page.ts — selectors sourced from live ariaSnapshot()
const item = this.page.getByRole('listitem').filter({ hasText: text });
await item.hover();
await item.getByRole('button', { name: 'Delete' }).click();
```

### API Client

```typescript
// api-clients/jsonplaceholder.client.ts — extends BaseApiClient
listPosts(userId?: number): Promise<APIResponse> {
  return this.get(`${BASE}/posts`, userId !== undefined ? { params: { userId } } : {});
}
```

### Fixture composition

```typescript
// fixtures/auth.fixture.ts — builds on Playwright's base test
export const test = base.extend<AuthFixtures>({
  usersClient: async ({ request, userToken }, use) => {
    await use(new UsersApiClient(request, userToken));
  },
});
```
