/**
 * Global test setup. Runs before every test file.
 *
 * Mocks every external dependency the API routes rely on so tests stay fast,
 * deterministic and offline: Firebase Admin (Auth + Firestore), Redis-backed
 * cache, CSRF verification, rate limiting, usage monitoring and env validation.
 */

import { vi, beforeEach } from "vitest";
import { createFirestoreMock, type FirestoreMock } from "./helpers/firestore-mock";

// ---------------------------------------------------------------------------
// Env — bypass envalid validation by providing placeholder values.
// Must be set before any module that imports lib/env is loaded.
// ---------------------------------------------------------------------------
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.NEXT_PRIVATE_GEMINI_API_KEY = "test-gemini-key";
process.env.UPSTASH_REDIS_REST_URL = "https://test-redis.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";
process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
  type: "service_account",
  project_id: "test-project",
  private_key_id: "test-key-id",
  private_key:
    "-----BEGIN PRIVATE KEY-----\ntest-private-key\n-----END PRIVATE KEY-----\n",
  client_email: "test@test-project.iam.gserviceaccount.com",
  client_id: "test-client-id",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url:
    "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com",
});
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// ---------------------------------------------------------------------------
// Firebase Admin mock — shared in-memory Firestore + stubbed Auth.
// ---------------------------------------------------------------------------
const firestoreMock: FirestoreMock = createFirestoreMock();

const adminAuthMock = {
  verifyIdToken: vi.fn(),
  getUser: vi.fn(),
  setCustomUserClaims: vi.fn(),
};

vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: adminAuthMock,
  adminDb: firestoreMock,
  default: {},
}));

// Re-export so test files can access the in-memory store and Auth mock.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PRIVATE_GEMINI_API_KEY: "test-gemini-key",
    UPSTASH_REDIS_REST_URL: "https://test-redis.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "test-redis-token",
    FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    FIREBASE_ADMIN_PROJECT_ID: "",
    FIREBASE_ADMIN_PRIVATE_KEY: "",
    FIREBASE_ADMIN_CLIENT_EMAIL: "",
    FIREBASE_ADMIN_PRIVATE_KEY_ID: "",
    FIREBASE_ADMIN_CLIENT_ID: "",
    FIREBASE_ADMIN_AUTH_URI: "https://accounts.google.com/o/oauth2/auth",
    FIREBASE_ADMIN_TOKEN_URI: "https://oauth2.googleapis.com/token",
    FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL:
      "https://www.googleapis.com/oauth2/v1/certs",
    FIREBASE_ADMIN_CLIENT_X509_CERT_URL: "",
    FIREBASE_ADMIN_TYPE: "service_account",
    IMGBB_API_KEY: "",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    ANALYZE: false,
  },
}));

// ---------------------------------------------------------------------------
// Auth — `verifyAuth` is controllable per-test via `setMockAuth`.
// ---------------------------------------------------------------------------
type MockUser = {
  uid: string;
  role: string | null;
  tier: string;
  email?: string;
  picture?: string;
} | null;

let currentMockUser: MockUser = null;

export const setMockAuth = (user: MockUser): void => {
  currentMockUser = user;
};

export const mockTeacher = (uid = "teacher-123"): MockUser => ({
  uid,
  role: "teacher",
  tier: "free",
  email: "teacher@test.com",
});

export const mockStudent = (uid = "student-123"): MockUser => ({
  uid,
  role: "student",
  tier: "free",
  email: "student@test.com",
});

vi.mock("@/lib/auth", () => ({
  verifyAuth: vi.fn(() => Promise.resolve(currentMockUser)),
}));

// ---------------------------------------------------------------------------
// CSRF — always passes in tests unless explicitly overridden.
// ---------------------------------------------------------------------------
let csrfValid = true;
export const setMockCSRF = (valid: boolean): void => {
  csrfValid = valid;
};

vi.mock("@/lib/csrf", () => ({
  generateCSRFToken: vi.fn(() => Promise.resolve("mock-csrf-token")),
  verifyCSRFToken: vi.fn(() => Promise.resolve(csrfValid)),
  verifyCSRF: vi.fn(() =>
    Promise.resolve(
      csrfValid
        ? null
        : {
            error:
              "Invalid or missing CSRF token. Please refresh the page and try again.",
            status: 403,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "X-Content-Type-Options": "nosniff",
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          }
    )
  ),
  getCSRFTokenFromRequest: vi.fn(() => "mock-csrf-token"),
  revokeCSRFToken: vi.fn(() => Promise.resolve()),
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  revokeAllCSRFTokens: vi.fn(() => {}),
}));

// ---------------------------------------------------------------------------
// Rate limiting — always succeeds in tests.
// ---------------------------------------------------------------------------
let rateLimitSuccess = true;
export const setMockRateLimit = (success: boolean): void => {
  rateLimitSuccess = success;
};

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() =>
    Promise.resolve({
      success: rateLimitSuccess,
      remaining: 59,
      reset: Math.floor(Date.now() / 1000) + 60,
      headers: {
        "X-RateLimit-Limit": "60",
        "X-RateLimit-Remaining": "59",
        "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 60),
      },
    })
  ),
  getClientIP: vi.fn(() => "127.0.0.1"),
  RATE_LIMITS: {
    auth: { limit: 5, window: 900 },
    aiGeneration: { limit: 3, window: 3600 },
    quizSubmit: { limit: 10, window: 3600 },
    general: { limit: 60, window: 60 },
    history: { limit: 30, window: 60 },
    flashcardCreate: { limit: 20, window: 3600 },
    draft: { limit: 30, window: 60 },
  },
}));

// ---------------------------------------------------------------------------
// Cache — no-op in-memory stub (returns null on get).
// ---------------------------------------------------------------------------
const cacheStore = new Map<string, unknown>();

vi.mock("@/lib/cache", () => {
  const cache = {
    get: vi.fn(<T>(key: string): Promise<T | null> => {
      const val = cacheStore.get(key);
      return Promise.resolve(val === undefined ? null : (val as T));
    }),
    set: vi.fn((key: string, data: unknown) => {
      cacheStore.set(key, data);
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      cacheStore.delete(key);
      return Promise.resolve();
    }),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    deletePattern: vi.fn(() => {}),
    clear: vi.fn(() => {
      cacheStore.clear();
    }),
  };
  return {
    default: cache,
    getApiCacheKey: (
      path: string,
      userId?: string,
      queryParams?: Record<string, string>
    ): string => {
      const parts = ["api", path];
      if (userId !== undefined && userId !== "") parts.push(`user:${userId}`);
      if (queryParams !== undefined && Object.keys(queryParams).length > 0) parts.push(JSON.stringify(queryParams));
      return parts.join(":");
    },
    getCacheKey: (
      collection: string,
      filters: Record<string, unknown>
    ): string => `db:${collection}:${JSON.stringify(filters)}`,
    withCache: vi.fn(<T>(_key: string, fn: () => Promise<T>) => fn()),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    invalidateCache: vi.fn(() => {}),
  };
});

// ---------------------------------------------------------------------------
// Monitoring — no-op usage/cost tracking.
// ---------------------------------------------------------------------------
vi.mock("@/lib/monitoring", () => ({
  trackUsage: vi.fn(() => Promise.resolve()),
  trackCost: vi.fn(() => Promise.resolve()),
  trackAIUsage: vi.fn(() => Promise.resolve()),
  getUserUsageStats: vi.fn(() =>
    Promise.resolve({
      totalRequests: 0,
      requestsByRoute: {},
      aiUsage: {
        pdfExtractions: 0,
        quizGenerations: 0,
        flashcardGenerations: 0,
      },
    })
  ),
}));

// ---------------------------------------------------------------------------
// Gemini AI — stubbed generation (not tested at endpoint level).
// ---------------------------------------------------------------------------
vi.mock("@/lib/gemini", () => ({
  extractTextFromPDF: vi.fn(() => Promise.resolve("Mock extracted PDF text content.")),
  generateQuizFromContent: vi.fn(() =>
    Promise.resolve({
      title: "Mock Quiz",
      questions: [
        {
          question: "Mock question?",
          type: "multiple_choice",
          choices: ["A", "B", "C", "D"],
          answer: "A",
        },
      ],
    })
  ),
  generateFlashcardsFromContent: vi.fn(() =>
    Promise.resolve({
      title: "Mock Flashcards",
      cards: [{ front: "Mock front", back: "Mock back" }],
    })
  ),
}));

// ---------------------------------------------------------------------------
// Reset all in-memory state between tests so they stay isolated.
// ---------------------------------------------------------------------------
beforeEach(() => {
  currentMockUser = null;
  csrfValid = true;
  rateLimitSuccess = true;
  firestoreMock._reset();
  cacheStore.clear();
  adminAuthMock.verifyIdToken.mockReset();
  adminAuthMock.getUser.mockReset();
  adminAuthMock.setCustomUserClaims.mockReset();
});

// Expose the firestore mock and auth mock for direct test access.
export { firestoreMock, adminAuthMock };
export const getFirestoreMock = (): FirestoreMock => firestoreMock;
