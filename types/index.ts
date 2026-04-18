// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  tokens: AuthTokens;
  user: User;
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'user' | 'viewer';

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

// ─── AI Workflow Types ────────────────────────────────────────────────────────
export interface AccessibilitySnapshot {
  url: string;
  timestamp: string;
  snapshot: string;
}

export interface FailureContext {
  testName: string;
  errorMessage: string;
  screenshotPath?: string;
  domSnapshot?: string;
  url?: string;
}

export interface AiFailureAnalysis {
  classification: 'locator' | 'data' | 'backend' | 'timing' | 'environment' | 'unknown';
  summary: string;
  suggestedFix: string;
  confidence: 'high' | 'medium' | 'low';
  rawResponse?: string;
}

export interface AiTestSuggestion {
  scenarioName: string;
  description: string;
  steps: string[];
  codeSnippet: string;
}

export interface AiSelectorSuggestion {
  original: string;
  suggested: string;
  reason: string;
  locatorType: 'getByRole' | 'getByLabel' | 'getByText' | 'getByTestId' | 'getByPlaceholder';
}

// ─── Test Data ────────────────────────────────────────────────────────────────
export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface TestDataSet {
  users: TestUser[];
}

// ─── Performance ──────────────────────────────────────────────────────────────
export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number;
  threshold: number;
  passed: boolean;
}
