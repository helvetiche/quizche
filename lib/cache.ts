import { getRedis } from "./redis";

/**
 * Redis-based cache for API responses and database queries
 * Uses Upstash Redis for distributed caching across serverless instances
 */
class Cache {
  private readonly DEFAULT_TTL = 300; // 5 minutes

  /**
   * Get cached value from Redis
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedis();
      const cached = await redis.get<T>(`cache:${key}`);
      return cached;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * Set cached value in Redis
   */
  async set(
    key: string,
    data: any,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const redis = getRedis();
      await redis.setex(`cache:${key}`, ttl, data);
    } catch (error) {
      console.error("Cache set error:", error);
      // Don't throw - caching failure shouldn't break the operation
    }
  }

  /**
   * Delete cached value from Redis
   */
  async delete(key: string): Promise<void> {
    try {
      const redis = getRedis();
      await redis.del(`cache:${key}`);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  /**
   * Delete multiple cached values by pattern
   */
  async deletePattern(_pattern: string): Promise<void> {
    try {
      // Note: Upstash Redis REST API doesn't support KEYS command
      // For pattern deletion, you'd need to track keys separately
      // or use SCAN if available. For now, we'll delete specific keys.
      // This is a limitation of REST API - consider using Redis client library for full features.
      console.warn("Pattern deletion not fully supported with REST API");
    } catch (error) {
      console.error("Cache delete pattern error:", error);
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear(): Promise<void> {
    try {
      // Note: FLUSHDB not available in REST API
      // In production, consider namespacing keys and tracking them
      console.warn("Clear all cache not supported with REST API");
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  }
}

// Singleton instance
const cache = new Cache();

/**
 * Generate cache key for database queries
 */
export const getCacheKey = (
  collection: string,
  filters: Record<string, any>,
  options?: { limit?: number; orderBy?: string }
): string => {
  const parts = [collection];
  parts.push(JSON.stringify(filters));
  if (options) {
    parts.push(JSON.stringify(options));
  }
  return `db:${parts.join(":")}`;
};

/**
 * Generate cache key for API responses
 */
export const getApiCacheKey = (
  path: string,
  userId?: string,
  queryParams?: Record<string, string>
): string => {
  const parts = ["api", path];
  if (userId) {
    parts.push(`user:${userId}`);
  }
  if (queryParams) {
    parts.push(JSON.stringify(queryParams));
  }
  return parts.join(":");
};

/**
 * Cache wrapper for async functions
 */
export const withCache = async <T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 300
): Promise<T> => {
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const result = await fn();
  await cache.set(key, result, ttl);
  return result;
};

/**
 * Invalidate cache by pattern
 * Note: Limited support with REST API - consider tracking keys separately
 */
export const invalidateCache = async (pattern: string): Promise<void> => {
  await cache.deletePattern(pattern);
};

export default cache;
