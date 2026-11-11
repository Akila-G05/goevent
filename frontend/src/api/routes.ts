  /**
 * Application API Endpoints & Routes
 * Centralized definition of all backend and gateway routes.
 */

// Base URLs
export const API_BASE_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:8080';

export const API_PREFIX = '/goevent/api';

export const API_ROUTES = {
  // Authentication endpoints
  AUTH: {
    GOOGLE: `${API_PREFIX}/auth/google`,
  },

  // Content endpoints (cached via gateway)
  CONTENT: {
    INITIAL_DATA: `${API_PREFIX}/content/initial-data`,
    UNIVERSITIES: `${API_PREFIX}/content/universities`,
    ORGANIZATIONS: `${API_PREFIX}/content/organizations`,
  },

  // Test / Diagnostics endpoints
  TEST: {
    BASE: `${API_PREFIX}/test`,
    STRICT: `${API_PREFIX}/test/strict`,
    NORMAL: `${API_PREFIX}/test/normal`,
    RELAXED: `${API_PREFIX}/test/relaxed`,
  },

  // Gateway Cache Management
  GATEWAY: {
    CLEAR_CACHE: '/gateway/cache/clear',
  },
} as const;

