import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazily initialised so the constructor is never called when env vars are absent.
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

// Cache one Ratelimit instance per (maxRequests, windowMs) combination.
// @upstash/ratelimit requires these values at construction time, not per-call.
const instanceCache = new Map<string, Ratelimit>();

function getInstance(maxRequests: number, windowMs: number): Ratelimit {
  const cacheKey = `${maxRequests}:${windowMs}`;
  const existing = instanceCache.get(cacheKey);
  if (existing) return existing;

  const instance = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.fixedWindow(maxRequests, `${windowMs} ms`),
  });
  instanceCache.set(cacheKey, instance);
  return instance;
}

/**
 * Upstash-backed fixed-window rate limiter.
 * Returns true when the request is within the allowed limit.
 */
export async function checkRateLimitUpstash(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const limiter = getInstance(maxRequests, windowMs);
  const { success } = await limiter.limit(key);
  return success;
}

/**
 * Resets module-level singletons.
 * For testing only — never call in production code.
 */
export function _resetForTesting(): void {
  redis = null;
  instanceCache.clear();
}
