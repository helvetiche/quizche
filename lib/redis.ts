import { Redis } from "@upstash/redis";
import { env } from "./env";

let redis: Redis | null = null;

/**
 * Initialize Upstash Redis client
 * Uses validated environment variables from env.ts
 */
export const getRedis = (): Redis => {
  if (redis) {
    return redis;
  }

  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  return redis;
};
