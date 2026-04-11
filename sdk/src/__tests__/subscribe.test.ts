// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetTokenCache, coreSubscribe, HbError } from "../subscribe";

const CONFIG = { websiteId: "site_abc", baseUrl: "https://app.heybackend.com" };
const DATA = { email: "user@example.com" };

// Mock fetchToken so tests don't perform real network calls.
// Value is inlined here because vi.mock factories are hoisted before const declarations.
vi.mock("../signing", () => ({
  fetchToken: vi.fn().mockResolvedValue({ token: "mock-token", expiresAt: Date.now() + 900_000 }),
}));

const MOCK_TOKEN = { token: "mock-token", expiresAt: Date.now() + 900_000 };

import { fetchToken } from "../signing";

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  __resetTokenCache();
  // Restore the default resolved value after clearAllMocks resets it
  vi.mocked(fetchToken).mockResolvedValue(MOCK_TOKEN);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mockFetch(status: number, body?: object) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body ?? {}),
    }),
  );
}

function mockFetchNetworkError() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
}

describe("coreSubscribe()", () => {
  it("returns { status: 201 } for a new subscriber", async () => {
    mockFetch(201);
    const res = await coreSubscribe(CONFIG, DATA);
    expect(res).toEqual({ status: 201 });
  });

  it("returns { status: 200 } for a returning subscriber", async () => {
    mockFetch(200);
    const res = await coreSubscribe(CONFIG, DATA);
    expect(res).toEqual({ status: 200 });
  });

  it("throws HbError RATE_LIMITED on 429", async () => {
    mockFetch(429, { message: "Too many requests" });
    await expect(coreSubscribe(CONFIG, DATA)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
  });

  it("throws HbError VALIDATION_ERROR on 400", async () => {
    mockFetch(400, { message: "Invalid email" });
    await expect(coreSubscribe(CONFIG, DATA)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("joins message[] array from server validation errors into a single string", async () => {
    mockFetch(400, { message: ["Email is required", "Invalid format"] });
    await expect(coreSubscribe(CONFIG, DATA)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Email is required; Invalid format",
      status: 400,
    });
  });

  it("throws HbError SERVER_ERROR on 500", async () => {
    mockFetch(500, { message: "Internal server error" });
    await expect(coreSubscribe(CONFIG, DATA)).rejects.toMatchObject({
      code: "SERVER_ERROR",
      status: 500,
    });
  });

  it("does not retry on 4xx other than 401 — only one fetch call", async () => {
    mockFetch(429, { message: "Too many requests" });
    await expect(coreSubscribe(CONFIG, DATA)).rejects.toBeInstanceOf(HbError);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
  });

  it("retries once after 2 s on network error and succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve({}) }),
    );

    const promise = coreSubscribe(CONFIG, DATA);
    await vi.advanceTimersByTimeAsync(2000);
    const res = await promise;

    expect(res).toEqual({ status: 201 });
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
  });

  it("throws NETWORK_ERROR after both attempts fail", async () => {
    mockFetchNetworkError();

    const promise = coreSubscribe(CONFIG, DATA);
    const rejection = expect(promise).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    await vi.runAllTimersAsync();
    await rejection;

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
  });

  it("clears the token cache and retries once on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: "Unauthorized" }),
        })
        .mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve({}) }),
    );

    const promise = coreSubscribe(CONFIG, DATA);
    await vi.advanceTimersByTimeAsync(2000);
    const res = await promise;

    expect(res).toEqual({ status: 201 });
    // fetchToken must be called twice (once for each attempt — cache was cleared on 401)
    expect(vi.mocked(fetchToken)).toHaveBeenCalledTimes(2);
  });

  it("throws TOKEN_ERROR when fetchToken fails on both attempts", async () => {
    vi.mocked(fetchToken).mockRejectedValue(new Error("Token fetch failed: 403"));
    // fetch for subscribe should not be called at all
    vi.stubGlobal("fetch", vi.fn());

    const promise = coreSubscribe(CONFIG, DATA);
    const rejection = expect(promise).rejects.toMatchObject({ code: "TOKEN_ERROR" });
    await vi.runAllTimersAsync();
    await rejection;

    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it("sends token and expiresAt in the POST body", async () => {
    mockFetch(201);
    await coreSubscribe(CONFIG, DATA);

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.token).toBe(MOCK_TOKEN.token);
    expect(body.expiresAt).toBe(MOCK_TOKEN.expiresAt);
  });

  it("does not send timestamp or signature in the POST body", async () => {
    mockFetch(201);
    await coreSubscribe(CONFIG, DATA);

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).not.toHaveProperty("timestamp");
    expect(body).not.toHaveProperty("signature");
  });

  it("sends email, firstName, lastName, and honeypot in the POST body", async () => {
    mockFetch(201);
    await coreSubscribe(CONFIG, { email: "a@b.com", firstName: "Alice", lastName: "Smith" });

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.email).toBe("a@b.com");
    expect(body.firstName).toBe("Alice");
    expect(body.lastName).toBe("Smith");
    expect(body.__hp).toBe("");
  });

  it("POSTs to {baseUrl}/api/{websiteId}/subscribe", async () => {
    mockFetch(201);
    await coreSubscribe(CONFIG, DATA);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      `${CONFIG.baseUrl}/api/${CONFIG.websiteId}/subscribe`,
      expect.anything(),
    );
  });

  it("fetches token only once when called twice in quick succession", async () => {
    mockFetch(201);
    await coreSubscribe(CONFIG, DATA);
    await coreSubscribe(CONFIG, DATA);

    expect(vi.mocked(fetchToken)).toHaveBeenCalledTimes(1);
  });

  it("re-fetches token when the cached token is within the expiry buffer", async () => {
    // Seed cache with a token that expires in 30 s (< 60 s EXPIRY_BUFFER_MS)
    vi.mocked(fetchToken).mockResolvedValueOnce({ token: "expiring-soon", expiresAt: Date.now() + 30_000 });
    mockFetch(201);
    await coreSubscribe(CONFIG, DATA);

    vi.mocked(fetchToken).mockResolvedValueOnce({ token: "fresh-token", expiresAt: Date.now() + 900_000 });
    await coreSubscribe(CONFIG, DATA);

    expect(vi.mocked(fetchToken)).toHaveBeenCalledTimes(2);
  });
});
