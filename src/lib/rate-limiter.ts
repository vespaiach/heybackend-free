/**
 * In-memory fixed-window rate limiter.
 * Works correctly for single-instance Node.js deployments.
 * For multi-instance or Docker Swarm: replace store with Redis/Upstash.
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

/**
 * Returns true if the request is within the allowed limit, false if it should
 * be rejected. Increments the counter on each allowed request.
 *
 * @param key        Unique bucket key (e.g. "ip:1.2.3.4:sub")
 * @param maxRequests Maximum requests allowed per window
 * @param windowMs   Window duration in milliseconds
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;

  entry.count++;
  return true;
}

/**
 * Removes all expired entries from the store.
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
