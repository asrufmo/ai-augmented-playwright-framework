// ─── Routes ──────────────────────────────────────────────────────────────────
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const;

// ─── API Endpoints ────────────────────────────────────────────────────────────
export const API = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string | number) => `/users/${id}`,
  },
  POSTS: {
    BASE: '/posts',
    BY_ID: (id: string | number) => `/posts/${id}`,
  },
} as const;

// ─── HTTP Status Codes ────────────────────────────────────────────────────────
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
} as const;

// ─── Timeouts ─────────────────────────────────────────────────────────────────
export const TIMEOUT = {
  SHORT: 5_000,
  MEDIUM: 15_000,
  LONG: 30_000,
  NAVIGATION: 15_000,
  API: 10_000,
} as const;

// ─── Storage ──────────────────────────────────────────────────────────────────
export const STORAGE = {
  AUTH_STATE_PATH: './test-results/.auth/user.json',
  ADMIN_AUTH_STATE_PATH: './test-results/.auth/admin.json',
} as const;

// ─── Performance Thresholds ───────────────────────────────────────────────────
export const PERF = {
  API_MAX_RESPONSE_MS: 2_000,
  PAGE_LOAD_MAX_MS: 5_000,
} as const;
