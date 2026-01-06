import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

/**
 * Initialize Upstash Redis client
 * Uses environment variables: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 */
export const getRedis = (): Redis => {
  if (redis) {
    return redis;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Upstash Redis credentials not found. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables."
    );
  }

  redis = new Redis({
    url,
    token,
  });

  return redis;
};
