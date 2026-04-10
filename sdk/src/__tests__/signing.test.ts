// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchToken } from "../signing";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchToken()", () => {
  it("fetches from /api/{websiteId}/token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ token: "abc123", expiresAt: 9_999_999_999_000 }),
      }),
    );

    await fetchToken("site_abc");

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith("/api/site_abc/token");
  });

  it("returns { token, expiresAt } on a 200 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ token: "abc123", expiresAt: 9_999_999_999_000 }),
      }),
    );

    const result = await fetchToken("site_abc");
    expect(result).toEqual({ token: "abc123", expiresAt: 9_999_999_999_000 });
  });

  it("throws on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) }),
    );

    await expect(fetchToken("site_abc")).rejects.toThrow("Token fetch failed: 401");
  });

  it("throws when response body is missing the token field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ expiresAt: 9_999_999_999_000 }),
      }),
    );

    await expect(fetchToken("site_abc")).rejects.toThrow("Invalid token response");
  });

  it("throws when response body is missing the expiresAt field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ token: "abc123" }),
      }),
    );

    await expect(fetchToken("site_abc")).rejects.toThrow("Invalid token response");
  });

  it("throws on a network error (fetch throws)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(fetchToken("site_abc")).rejects.toThrow("Failed to fetch");
  });
});
