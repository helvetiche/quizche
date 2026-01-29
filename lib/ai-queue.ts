/* eslint-disable no-await-in-loop, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing */
import { getRedis } from "./redis";

/**
 * AI Request Queue for managing AI operations
 * Uses Redis to queue and process AI requests to prevent overload
 */

export type QueuedAIRequest = {
  id: string;
  userId: string;
  operation: "pdf_extraction" | "quiz_generation" | "flashcard_generation";
  data: Record<string, unknown>;
  createdAt: number;
  priority: "low" | "normal" | "high";
  retries: number;
};

const QUEUE_KEY = "ai:queue";
const PROCESSING_KEY = "ai:processing";
const MAX_RETRIES = 3;
const PROCESSING_TIMEOUT = 300000; // 5 minutes

/**
 * Add AI request to queue
 */
export const enqueueAIRequest = async (
  request: Omit<QueuedAIRequest, "id" | "createdAt" | "retries">
): Promise<string> => {
  const redis = getRedis();
  const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const queuedRequest: QueuedAIRequest = {
    ...request,
    id,
    createdAt: Date.now(),
    retries: 0,
  };

  // Add to queue (sorted by priority and timestamp)
  const score = getPriorityScore(
    queuedRequest.priority,
    queuedRequest.createdAt
  );
  await redis.zadd(QUEUE_KEY, { score, member: JSON.stringify(queuedRequest) });

  return id;
};

const getPriorityScore = (priority: string, timestamp: number): number => {
  const priorityMultiplier: Record<string, number> = {
    high: 1000000000000,
    normal: 1000000000,
    low: 1000000,
  };
  return (
    (priorityMultiplier[priority] !== undefined
      ? priorityMultiplier[priority]
      : 1000000) + timestamp
  );
};

export const dequeueAIRequest = async (): Promise<QueuedAIRequest | null> => {
  const redis = getRedis();

  const results = await redis.zrange(QUEUE_KEY, 0, 0);
  if (results.length === 0) {
    return null;
  }

  const request = JSON.parse(results[0] as string) as QueuedAIRequest;

  await redis.zrem(QUEUE_KEY, results[0] as string);
  await redis.zadd(PROCESSING_KEY, {
    score: Date.now() + PROCESSING_TIMEOUT,
    member: JSON.stringify(request),
  });

  return request;
};

/**
 * Mark request as completed
 */
export const completeAIRequest = async (requestId: string): Promise<void> => {
  const redis = getRedis();

  // Remove from processing set
  const processing = await redis.zrange(PROCESSING_KEY, 0, -1);
  for (const item of processing) {
    const req = JSON.parse(item as string) as QueuedAIRequest;
    if (req.id === requestId) {
      await redis.zrem(PROCESSING_KEY, item as string);
      break;
    }
  }
};

/**
 * Mark request as failed and retry or remove
 */
export const failAIRequest = async (
  requestId: string,
  error: Error
): Promise<boolean> => {
  const redis = getRedis();

  // Find request in processing set
  const processing = await redis.zrange(PROCESSING_KEY, 0, -1);
  for (const item of processing) {
    const req = JSON.parse(item as string) as QueuedAIRequest;
    if (req.id === requestId) {
      await redis.zrem(PROCESSING_KEY, item as string);

      // Retry if under max retries
      if (req.retries < MAX_RETRIES) {
        const retryRequest: QueuedAIRequest = {
          ...req,
          retries: req.retries + 1,
          createdAt: Date.now(), // Reset timestamp for retry
        };
        const score = getPriorityScore(
          retryRequest.priority,
          retryRequest.createdAt
        );
        await redis.zadd(QUEUE_KEY, {
          score,
          member: JSON.stringify(retryRequest),
        });
        return true; // Will retry
      }

      // Max retries reached, log and discard
      console.error(
        `AI request ${requestId} failed after ${MAX_RETRIES} retries:`,
        error
      );
      return false; // Won't retry
    }
  }

  return false;
};

/**
 * Recover stuck requests (timeout handling)
 */
export const recoverStuckRequests = async (): Promise<number> => {
  const redis = getRedis();
  const now = Date.now();
  let recovered = 0;

  // Get all processing requests
  const processing = await redis.zrange(PROCESSING_KEY, 0, -1);
  for (const item of processing) {
    const req = JSON.parse(item as string) as QueuedAIRequest;
    const timeout = await redis.zscore(PROCESSING_KEY, item as string);

    // If timeout exceeded, move back to queue
    if (timeout !== null && timeout !== undefined && Number(timeout) < now) {
      await redis.zrem(PROCESSING_KEY, item as string);

      // Retry if under max retries
      if (req.retries < MAX_RETRIES) {
        const retryRequest: QueuedAIRequest = {
          ...req,
          retries: req.retries + 1,
          createdAt: Date.now(),
        };
        const score = getPriorityScore(
          retryRequest.priority,
          retryRequest.createdAt
        );
        await redis.zadd(QUEUE_KEY, {
          score,
          member: JSON.stringify(retryRequest),
        });
        recovered++;
      }
    }
  }

  return recovered;
};

/**
 * Get queue status
 */
export const getQueueStatus = async (): Promise<{
  queued: number;
  processing: number;
}> => {
  const redis = getRedis();
  const queued = await redis.zcard(QUEUE_KEY);
  const processing = await redis.zcard(PROCESSING_KEY);

  return { queued, processing };
};
