// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted ensures these variables are initialized before vi.mock factories run,
// avoiding the temporal dead zone error that occurs with plain const declarations.
const { mockLimit, MockRatelimit } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  // Must be a regular function (not arrow) so it can be called with `new`.
  // vi.fn(impl) tracks constructor calls while using `impl` as the constructor body.
  const MockRatelimit = vi.fn(function (this: Record<string, unknown>) {
    this.limit = mockLimit;
  }) as unknown as {
    new (...args: unknown[]): { limit: typeof mockLimit };
    fixedWindow: ReturnType<typeof vi.fn>;
  };
  (MockRatelimit as unknown as Record<string, unknown>).fixedWindow = vi
    .fn()
    .mockReturnValue("fixed-window-descriptor");
  return { mockLimit, MockRatelimit };
});

vi.mock("@upstash/ratelimit", () => ({ Ratelimit: MockRatelimit }));
vi.mock("@upstash/redis", () => ({
  // Regular function (not arrow) so it can be used as a constructor with `new`
  Redis: vi.fn(function Redis(this: Record<string, unknown>) {
    // intentionally empty — tests don't call Redis methods directly
  }),
}));

import { _resetForTesting, checkRateLimitUpstash } from "../rate-limiter-upstash";

describe("checkRateLimitUpstash()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module-level singletons so each test starts from a clean slate
    _resetForTesting();
    // Restore static method after clear
    (MockRatelimit as unknown as Record<string, unknown>).fixedWindow = vi
      .fn()
      .mockReturnValue("fixed-window-descriptor");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when Upstash allows the request", async () => {
    mockLimit.mockResolvedValueOnce({ success: true });
    const result = await checkRateLimitUpstash("ip:1.2.3.4:sub", 5, 60_000);
    expect(result).toBe(true);
    expect(mockLimit).toHaveBeenCalledWith("ip:1.2.3.4:sub");
  });

  it("returns false when Upstash denies the request", async () => {
    mockLimit.mockResolvedValueOnce({ success: false });
    const result = await checkRateLimitUpstash("ip:1.2.3.4:sub", 5, 60_000);
    expect(result).toBe(false);
  });

  it("reuses cached Ratelimit instances for the same (maxRequests, windowMs) pair", async () => {
    mockLimit.mockResolvedValue({ success: true });
    await checkRateLimitUpstash("key-a", 5, 60_000);
    await checkRateLimitUpstash("key-b", 5, 60_000);
    // Same config → constructor called only once (module-level instance cache)
    expect(MockRatelimit).toHaveBeenCalledTimes(1);
  });

  it("creates distinct instances for different (maxRequests, windowMs) pairs", async () => {
    mockLimit.mockResolvedValue({ success: true });
    await checkRateLimitUpstash("key-a", 5, 60_000);
    await checkRateLimitUpstash("key-b", 200, 60_000);
    expect(MockRatelimit).toHaveBeenCalledTimes(2);
  });
});
