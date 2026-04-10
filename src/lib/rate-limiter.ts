/**
 * In-memory fixed-window rate limiter with FIFO eviction cap.
 *
 * The module-level Map is bounded to MAX_ENTRIES; when it is full the oldest
 * inserted key is evicted before a new one is added (JS Maps preserve
 * insertion order, so keys().next().value is always the oldest).
 *
 * A periodic sweep also removes expired entries every 5 minutes so the store
 * stays small under normal traffic patterns.
 *
 * For multi-instance or serverless deployments set UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN — the factory in this module will delegate to the
 * Upstash backend automatically.
 */

const MAX_ENTRIES = 10_000;

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// ─── In-memory implementation ─────────────────────────────────────────────────

function checkRateLimitMemory(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // Evict oldest entry when at capacity (only for new keys, not resets of expired ones)
    if (!entry && store.size >= MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;

  entry.count++;
  return true;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the request is within the allowed limit.
 *
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set the call is
 * forwarded to the Upstash backend; otherwise the in-memory store is used.
 */
export async function checkRateLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { checkRateLimitUpstash } = await import("./rate-limiter-upstash");
    return checkRateLimitUpstash(key, maxRequests, windowMs);
  }
  return checkRateLimitMemory(key, maxRequests, windowMs);
}

/**
 * Returns the current number of entries in the in-memory store.
 * Exported for testing only.
 */
export function getStoreSize(): number {
  return store.size;
}

/**
 * Removes all expired entries from the in-memory store.
 * Exported for testing; called automatically every 5 minutes by the sweep timer.
 *
 * @param now Injectable timestamp (defaults to Date.now()) — use in tests to
 *            avoid fake timers.
 */
export function sweepExpired(now = Date.now()): void {
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

// Evict expired entries every 5 minutes so the Map does not grow without bound.
// .unref() prevents this timer from keeping the Node.js process alive in tests.
const sweepTimer = setInterval(() => sweepExpired(), 5 * 60 * 1000);
sweepTimer.unref?.();
