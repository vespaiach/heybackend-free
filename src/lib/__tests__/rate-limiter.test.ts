// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, sweepExpired } from "../rate-limiter";

// The rate limiter uses a module-level Map. Tests that set entries must run in
// isolation — use unique key prefixes per test to avoid cross-contamination.

let keyCounter = 0;
function uniqueKey(label: string): string {
  return `test:${label}:${++keyCounter}`;
}

beforeEach(() => {
  // Sweep all expired entries before each test so stale state doesn't bleed across
  sweepExpired(Date.now() + 10 * 60 * 1000);
});

describe("sweepExpired()", () => {
  it("deletes entries whose resetAt is in the past", () => {
    const key = uniqueKey("past");
    // Create an entry by checking the limit (sets resetAt = now + 60_000)
    checkRateLimit(key, 10, 60_000);

    // Sweep at a time after the window has closed
    sweepExpired(Date.now() + 61_000);

    // A new checkRateLimit call should behave as if the entry never existed
    // (count resets to 1, returns true)
    expect(checkRateLimit(key, 1, 60_000)).toBe(true);
  });

  it("keeps entries whose resetAt is in the future", () => {
    const key = uniqueKey("future");
    // Max 1 request — first call succeeds
    checkRateLimit(key, 1, 60_000);

    // Sweep at current time (entry is still active)
    sweepExpired(Date.now());

    // The entry must still exist — second call should be rejected
    expect(checkRateLimit(key, 1, 60_000)).toBe(false);
  });

  it("is a no-op on an empty store", () => {
    // Sweep everything first to start from empty
    sweepExpired(Date.now() + 10 * 60 * 1000);
    // Should not throw
    expect(() => sweepExpired(Date.now())).not.toThrow();
  });
});

describe("checkRateLimit() — behaviour after a sweep", () => {
  it("still enforces limits correctly after expired entries are swept", () => {
    const key = uniqueKey("post-sweep");
    // Use 2 of 3 allowed requests
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);

    // Sweep at a time after the window closes
    sweepExpired(Date.now() + 61_000);

    // Window resets — should be allowed again from the start
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
  });
});
