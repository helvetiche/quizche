import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  headers: Record<string, string>;
}

export interface RateLimitConfig {
  limit: number;
  window: number; // in seconds
  identifier: string; // user ID or IP
  key: string; // route/operation key
}

// Cache rate limiter instances by configuration
const rateLimiterCache = new Map<string, Ratelimit>();

/**
 * Get or create a rate limiter instance for a specific configuration
 */
const getRateLimiter = (limit: number, window: number): Ratelimit => {
  const cacheKey = `${limit}:${window}`;

  if (rateLimiterCache.has(cacheKey)) {
    return rateLimiterCache.get(cacheKey)!;
  }

  const redis = getRedis();
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${window} s`),
    analytics: true, // Enable analytics for monitoring
    prefix: "@upstash/ratelimit", // Optional prefix for keys
  });

  rateLimiterCache.set(cacheKey, ratelimit);
  return ratelimit;
};

/**
 * Rate limiting using Upstash Ratelimit
 * Provides distributed rate limiting across multiple serverless instances
 * Uses sliding window algorithm for accurate rate limiting
 * 
 * NOTE: Rate limiting is disabled in development mode (NODE_ENV=development)
 */
export const rateLimit = async (
  config: RateLimitConfig
): Promise<RateLimitResult> => {
  const { limit, window, identifier, key } = config;
  const rateLimitKey = `${key}:${identifier}`;

  // Skip rate limiting in development mode
  if (process.env.NODE_ENV === "development") {
    const reset = Math.floor(Date.now() / 1000) + window;
    return {
      success: true,
      remaining: limit,
      reset,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": limit.toString(),
        "X-RateLimit-Reset": reset.toString(),
      },
    };
  }

  try {
    const ratelimit = getRateLimiter(limit, window);
    const result = await ratelimit.limit(rateLimitKey);

    const reset = result.reset
      ? Math.floor(result.reset / 1000) // Convert to seconds
      : Math.floor(Date.now() / 1000) + window;

    return {
      success: result.success,
      remaining: result.remaining,
      reset,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
        ...(result.success
          ? {}
          : {
              "Retry-After": (reset - Math.floor(Date.now() / 1000)).toString(),
            }),
      },
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    // On error, allow the request (fail open)
    // In production, you might want to fail closed
    const reset = Math.floor(Date.now() / 1000) + window;
    return {
      success: true,
      remaining: limit - 1,
      reset,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": (limit - 1).toString(),
        "X-RateLimit-Reset": reset.toString(),
      },
    };
  }
};

/**
 * Get client IP address from request
 */
export const getClientIP = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return "unknown";
};

/**
 * Predefined rate limit configurations by route type
 */
export const RATE_LIMITS = {
  // Authentication routes
  auth: {
    limit: 5,
    window: 900, // 15 minutes
  },
  // AI generation routes (expensive)
  aiGeneration: {
    limit: 3,
    window: 3600, // 1 hour
  },
  // Quiz submission
  quizSubmit: {
    limit: 10,
    window: 3600, // 1 hour
  },
  // General API routes
  general: {
    limit: 60,
    window: 60, // 1 minute
  },
  // History/results routes
  history: {
    limit: 30,
    window: 60, // 1 minute
  },
  // Flashcard creation
  flashcardCreate: {
    limit: 20,
    window: 3600, // 1 hour
  },
  // Quiz draft operations
  draft: {
    limit: 30,
    window: 60, // 1 minute - allow frequent auto-saves
  },
} as const;
