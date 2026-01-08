/**
 * Environment variable validation using envalid
 * Validates all environment variables at startup and provides typed access
 */

import { cleanEnv, str, url, bool } from "envalid";

/**
 * Validated environment variables
 * Access these instead of process.env directly
 */
export const env = cleanEnv(process.env, {
  // Gemini AI API Key (required)
  NEXT_PRIVATE_GEMINI_API_KEY: str({
    desc: "Google Gemini API key for AI features",
  }),

  // Redis/Upstash (required)
  UPSTASH_REDIS_REST_URL: url({
    desc: "Upstash Redis REST API URL",
  }),
  UPSTASH_REDIS_REST_TOKEN: str({
    desc: "Upstash Redis REST API token",
  }),

  // Firebase Admin - Service Account Key (optional, alternative to individual fields)
  FIREBASE_SERVICE_ACCOUNT_KEY: str({
    desc: "Firebase service account JSON key (alternative to individual fields)",
    default: "",
  }),

  // Firebase Admin - Individual Fields (required if service account key not provided)
  FIREBASE_ADMIN_PROJECT_ID: str({
    desc: "Firebase Admin project ID",
    default: "",
  }),
  FIREBASE_ADMIN_PRIVATE_KEY: str({
    desc: "Firebase Admin private key",
    default: "",
  }),
  FIREBASE_ADMIN_CLIENT_EMAIL: str({
    desc: "Firebase Admin client email",
    default: "",
  }),
  FIREBASE_ADMIN_PRIVATE_KEY_ID: str({
    desc: "Firebase Admin private key ID",
    default: "",
  }),
  FIREBASE_ADMIN_CLIENT_ID: str({
    desc: "Firebase Admin client ID",
    default: "",
  }),
  FIREBASE_ADMIN_AUTH_URI: str({
    desc: "Firebase Admin auth URI",
    default: "https://accounts.google.com/o/oauth2/auth",
  }),
  FIREBASE_ADMIN_TOKEN_URI: str({
    desc: "Firebase Admin token URI",
    default: "https://oauth2.googleapis.com/token",
  }),
  FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL: str({
    desc: "Firebase Admin auth provider cert URL",
    default: "https://www.googleapis.com/oauth2/v1/certs",
  }),
  FIREBASE_ADMIN_CLIENT_X509_CERT_URL: str({
    desc: "Firebase Admin client cert URL",
    default: "",
  }),
  FIREBASE_ADMIN_TYPE: str({
    desc: "Firebase Admin type",
    default: "service_account",
  }),

  // ImgBB API Key (optional)
  IMGBB_API_KEY: str({
    desc: "ImgBB API key for image uploads",
    default: "",
  }),

  // App URL (optional, defaults to wildcard)
  NEXT_PUBLIC_APP_URL: str({
    desc: "Public app URL for CORS and security headers",
    default: "*",
  }),

  // Bundle Analyzer (optional)
  ANALYZE: bool({
    desc: "Enable bundle analyzer",
    default: false,
  }),
});

// Custom validation after cleanEnv
const hasServiceAccountKey = env.FIREBASE_SERVICE_ACCOUNT_KEY && env.FIREBASE_SERVICE_ACCOUNT_KEY.length > 0;
const hasIndividualFields = 
  env.FIREBASE_ADMIN_PROJECT_ID &&
  env.FIREBASE_ADMIN_PROJECT_ID.length > 0 &&
  env.FIREBASE_ADMIN_PRIVATE_KEY &&
  env.FIREBASE_ADMIN_PRIVATE_KEY.length > 0 &&
  env.FIREBASE_ADMIN_CLIENT_EMAIL &&
  env.FIREBASE_ADMIN_CLIENT_EMAIL.length > 0;

if (!hasServiceAccountKey && !hasIndividualFields) {
  throw new Error(
    "Firebase Admin configuration is incomplete. " +
    "Please set either FIREBASE_SERVICE_ACCOUNT_KEY or all FIREBASE_ADMIN_* environment variables."
  );
}
