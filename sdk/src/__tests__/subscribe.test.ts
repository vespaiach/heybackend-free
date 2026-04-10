// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { coreSubscribe, HbError } from "../subscribe";

const CONFIG = { websiteId: "site_abc", key: "test-key-32chars!!!!!!!!!!!!!!!!" };
const DATA = { email: "user@example.com" };

// Mock sign() so tests don't depend on crypto timing
vi.mock("../signing", () => ({
  sign: vi.fn().mockResolvedValue("mock-signature"),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
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

  it("throws HbError SERVER_ERROR on 500", async () => {
    mockFetch(500, { message: "Internal server error" });
    await expect(coreSubscribe(CONFIG, DATA)).rejects.toMatchObject({
      code: "SERVER_ERROR",
      status: 500,
    });
  });

  it("does not retry on 4xx — only one fetch call", async () => {
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
    // Advance past the 2 s retry delay
    await vi.advanceTimersByTimeAsync(2000);
    const res = await promise;

    expect(res).toEqual({ status: 201 });
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
  });

  it("throws NETWORK_ERROR after both attempts fail", async () => {
    mockFetchNetworkError();

    // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
    const promise = coreSubscribe(CONFIG, DATA);
    const rejection = expect(promise).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    await vi.runAllTimersAsync();
    await rejection;

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
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

  it("POSTs to /api/{websiteId}/subscribe", async () => {
    mockFetch(201);
    await coreSubscribe(CONFIG, DATA);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      `/api/${CONFIG.websiteId}/subscribe`,
      expect.anything(),
    );
  });
});
