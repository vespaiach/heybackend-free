// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/domain", () => ({
  websiteService: {
    getWebsiteForSigning: vi.fn(),
    getWebsiteById: vi.fn(),
  },
  subscriberService: {
    upsertSubscriber: vi.fn(),
    logRequest: vi.fn(),
    enrichRequest: vi.fn(),
    unsubscribeByEmail: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

vi.mock("fast-geoip", () => ({
  default: { lookup: vi.fn().mockResolvedValue(null) },
}));

vi.mock("ua-parser-js", () => ({
  UAParser: vi.fn(),
}));

// Run after() callbacks synchronously so enrichRequest assertions work.
vi.mock("next/server", () => ({
  after: vi.fn((task) => void (task as () => Promise<void>)()),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { after } from "next/server";
import { UAParser } from "ua-parser-js";
import { subscriberService, websiteService } from "@/lib/domain";
import type { Subscriber, SubscriptionRequest } from "@/lib/domain/types";
import { checkRateLimit } from "@/lib/rate-limiter";
import { mintToken } from "@/lib/signing";
import { OPTIONS, POST } from "../route";

// Reset all mocks and restore defaults before every test.
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(after).mockImplementation((task) => void (task as () => Promise<void>)());
  // biome-ignore lint/complexity/useArrowFunction: function keyword required — UAParser is called with `new`
  vi.mocked(UAParser).mockImplementation(function () {
    return {
      getBrowser: () => ({ name: "Chrome" }),
      getDevice: () => ({ type: undefined }),
      getOS: () => ({ name: "macOS" }),
    } as unknown as InstanceType<typeof UAParser>;
  });
  vi.mocked(checkRateLimit).mockResolvedValue(true);
  vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(mockWebsite);
  vi.mocked(websiteService.getWebsiteById).mockResolvedValue(mockWebsitePublic);
  vi.mocked(subscriberService.upsertSubscriber).mockResolvedValue(mockSubscriber);
  vi.mocked(subscriberService.logRequest).mockResolvedValue({
    id: "req_1",
  } as unknown as SubscriptionRequest);
  vi.mocked(subscriberService.enrichRequest).mockResolvedValue(undefined);
});

// ─── Constants ────────────────────────────────────────────────────────────────

const WEBSITE_ID = "site_abc123";
const WEBSITE_URL = "https://example.com";
const WEBSITE_KEY = "test-signing-secret-32chars!!!!!";

const mockWebsite = { id: WEBSITE_ID, url: WEBSITE_URL, isActive: true, key: WEBSITE_KEY };
const mockWebsitePublic = { id: WEBSITE_ID, url: WEBSITE_URL, isActive: true };

const mockSubscriber = { subscriber: {} as unknown as Subscriber, created: true };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validBody(overrides?: Record<string, unknown>) {
  const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID);
  return { email: "alice@example.com", token, expiresAt, ...overrides };
}

function makePost(body: Record<string, unknown>, origin: string | null = WEBSITE_URL): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin !== null) headers.Origin = origin;
  return new Request(`http://localhost/api/${WEBSITE_ID}/subscribe`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeOptions(origin: string | null = WEBSITE_URL): Request {
  const headers: Record<string, string> = {};
  if (origin !== null) headers.Origin = origin;
  return new Request(`http://localhost/api/${WEBSITE_ID}/subscribe`, {
    method: "OPTIONS",
    headers,
  });
}

function params(id = WEBSITE_ID) {
  return { params: Promise.resolve({ websiteId: id }) };
}

// ─── OPTIONS ──────────────────────────────────────────────────────────────────

describe("OPTIONS /api/[websiteId]/subscribe", () => {
  it("returns 204 with CORS headers for a valid origin", async () => {
    const res = await OPTIONS(makeOptions(), params());
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("returns 401 when website is not found", async () => {
    vi.mocked(websiteService.getWebsiteById).mockResolvedValue(null);
    expect((await OPTIONS(makeOptions(), params())).status).toBe(401);
  });

  it("returns 401 when website is inactive", async () => {
    vi.mocked(websiteService.getWebsiteById).mockResolvedValue({ ...mockWebsitePublic, isActive: false });
    expect((await OPTIONS(makeOptions(), params())).status).toBe(401);
  });

  it("returns 403 when origin does not match", async () => {
    expect((await OPTIONS(makeOptions("https://evil.com"), params())).status).toBe(403);
  });

  it("returns 403 when origin header is absent", async () => {
    expect((await OPTIONS(makeOptions(null), params())).status).toBe(403);
  });
});

// ─── POST: request parsing & validation ───────────────────────────────────────

describe("POST — request parsing & validation", () => {
  it("returns 400 for malformed JSON", async () => {
    const req = new Request(`http://localhost/api/${WEBSITE_ID}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: WEBSITE_URL },
      body: "not-json{{{",
    });
    expect((await POST(req, params())).status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    const { email: _e, ...body } = validBody();
    expect((await POST(makePost(body), params())).status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    expect((await POST(makePost(validBody({ email: "not-an-email" })), params())).status).toBe(400);
  });

  it("returns 400 when email exceeds 320 characters", async () => {
    const long = `${"a".repeat(316)}@b.com`;
    expect((await POST(makePost(validBody({ email: long })), params())).status).toBe(400);
  });

  it("returns 400 when firstName is an empty string", async () => {
    expect((await POST(makePost(validBody({ firstName: "" })), params())).status).toBe(400);
  });

  it("returns 400 when firstName exceeds 256 characters", async () => {
    expect((await POST(makePost(validBody({ firstName: "a".repeat(257) })), params())).status).toBe(400);
  });

  it("returns 400 when lastName exceeds 256 characters", async () => {
    expect((await POST(makePost(validBody({ lastName: "b".repeat(257) })), params())).status).toBe(400);
  });

  it("returns 400 when token is missing", async () => {
    const { token: _t, ...body } = validBody();
    expect((await POST(makePost(body), params())).status).toBe(400);
  });

  it("returns 400 when expiresAt is missing", async () => {
    const { expiresAt: _e, ...body } = validBody();
    expect((await POST(makePost(body), params())).status).toBe(400);
  });

  it("logs REJECTED/VALIDATION_ERROR for malformed JSON", async () => {
    const req = new Request(`http://localhost/api/${WEBSITE_ID}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: WEBSITE_URL },
      body: "not-json{{{",
    });
    await POST(req, params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "VALIDATION_ERROR" }),
    );
  });

  it("logs REJECTED/VALIDATION_ERROR for invalid email", async () => {
    await POST(makePost(validBody({ email: "not-an-email" })), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "VALIDATION_ERROR" }),
    );
  });
});

// ─── POST: token + origin guard ───────────────────────────────────────────────

describe("POST — token & origin guard", () => {
  it("returns 401 when token is tampered", async () => {
    expect((await POST(makePost(validBody({ token: "tampered-token" })), params())).status).toBe(401);
  });

  it("returns 401 when token is expired (expiresAt in the past)", async () => {
    // Mint a token that has already expired
    const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID, Date.now() - 16 * 60 * 1000);
    expect((await POST(makePost(validBody({ token, expiresAt })), params())).status).toBe(401);
  });

  it("returns 401 when website is not found", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(null);
    expect((await POST(makePost(validBody()), params())).status).toBe(401);
  });

  it("returns 401 when website is inactive", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue({ ...mockWebsite, isActive: false });
    const res = await POST(makePost(validBody()), params());
    expect(res.status).toBe(401);
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
  });

  it("returns 403 when origin does not match website URL", async () => {
    expect((await POST(makePost(validBody(), "https://evil.com"), params())).status).toBe(403);
  });

  it("returns 403 when origin header is absent", async () => {
    expect((await POST(makePost(validBody(), null), params())).status).toBe(403);
  });

  it("logs REJECTED/INVALID_TOKEN for a tampered token", async () => {
    await POST(makePost(validBody({ token: "tampered-token" })), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "INVALID_TOKEN" }),
    );
  });

  it("logs REJECTED/INVALID_TOKEN for an expired token", async () => {
    const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID, Date.now() - 16 * 60 * 1000);
    await POST(makePost(validBody({ token, expiresAt })), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "INVALID_TOKEN" }),
    );
  });

  it("does NOT log when origin does not match", async () => {
    await POST(makePost(validBody(), "https://evil.com"), params());
    expect(subscriberService.logRequest).not.toHaveBeenCalled();
  });
});

// ─── POST: rate limiting ──────────────────────────────────────────────────────

describe("POST — rate limiting", () => {
  it("returns 429 with Retry-After when per-IP rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);
    const res = await POST(makePost(validBody()), params());
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
  });

  it("includes CORS headers in the 429 response", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);
    const res = await POST(makePost(validBody()), params());
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
  });

  it("logs REJECTED/RATE_LIMIT_IP when per-IP limit exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);
    await POST(makePost(validBody()), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "RATE_LIMIT_IP" }),
    );
  });

  it("logs REJECTED/RATE_LIMIT_WEBSITE when per-website limit exceeded", async () => {
    vi.mocked(checkRateLimit)
      .mockResolvedValueOnce(true) // per-IP passes
      .mockResolvedValue(false); // per-website fails
    await POST(makePost(validBody()), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SUBSCRIBE",
        status: "REJECTED",
        rejectionReason: "RATE_LIMIT_WEBSITE",
      }),
    );
  });
});

// ─── POST: honeypot ───────────────────────────────────────────────────────────

describe("POST — honeypot", () => {
  it("returns 201 silently without upserting when __hp is filled", async () => {
    const res = await POST(makePost(validBody({ __hp: "i-am-a-bot" })), params());
    expect(res.status).toBe(201);
    expect(subscriberService.upsertSubscriber).not.toHaveBeenCalled();
  });

  it("logs REJECTED/HONEYPOT when __hp is filled", async () => {
    await POST(makePost(validBody({ __hp: "i-am-a-bot" })), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "HONEYPOT" }),
    );
  });
});

// ─── POST: happy paths ────────────────────────────────────────────────────────

describe("POST — happy paths", () => {
  it("returns 201 for a new subscriber", async () => {
    const res = await POST(makePost(validBody()), params());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ message: "Subscribed" });
  });

  it("returns 200 for a returning subscriber (re-subscribe)", async () => {
    vi.mocked(subscriberService.upsertSubscriber).mockResolvedValue({
      subscriber: {} as never,
      created: false,
    });
    const res = await POST(makePost(validBody()), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Subscribed" });
  });

  it("normalises email to lowercase before upserting", async () => {
    await POST(makePost(validBody({ email: "ALICE@EXAMPLE.COM" })), params());
    expect(subscriberService.upsertSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@example.com" }),
    );
  });

  it("trims whitespace from email", async () => {
    await POST(makePost(validBody({ email: "  alice@example.com  " })), params());
    expect(subscriberService.upsertSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@example.com" }),
    );
  });

  it("passes firstName and lastName to upsertSubscriber", async () => {
    await POST(makePost(validBody({ firstName: "Alice", lastName: "Smith" })), params());
    expect(subscriberService.upsertSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Alice", lastName: "Smith" }),
    );
  });

  it("passes null for omitted firstName and lastName", async () => {
    await POST(makePost(validBody()), params());
    expect(subscriberService.upsertSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: null, lastName: null }),
    );
  });

  it("includes CORS headers in the successful response", async () => {
    const res = await POST(makePost(validBody()), params());
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
  });

  it("logs ACCEPTED with the normalized email and websiteId", async () => {
    await POST(makePost(validBody()), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "alice@example.com",
        websiteId: WEBSITE_ID,
        type: "SUBSCRIBE",
        status: "ACCEPTED",
      }),
    );
    const call = vi.mocked(subscriberService.logRequest).mock.calls[0][0];
    expect(call).not.toHaveProperty("rejectionReason");
  });

  it("calls enrichRequest on the logged request id after upsert", async () => {
    vi.mocked(subscriberService.logRequest).mockResolvedValue({
      id: "req_1",
    } as unknown as SubscriptionRequest);
    await POST(makePost(validBody()), params());
    await vi.waitFor(() =>
      expect(subscriberService.enrichRequest).toHaveBeenCalledWith(
        "req_1",
        expect.objectContaining({ country: null, platform: "macOS" }),
      ),
    );
  });

  it("also calls enrichRequest for rate-limited (rejected) requests", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);
    vi.mocked(subscriberService.logRequest).mockResolvedValue({
      id: "req_rl",
    } as unknown as SubscriptionRequest);
    await POST(makePost(validBody()), params());
    await vi.waitFor(() =>
      expect(subscriberService.enrichRequest).toHaveBeenCalledWith("req_rl", expect.any(Object)),
    );
  });

  it("does NOT call enrichRequest for validation errors", async () => {
    await POST(makePost(validBody({ email: "bad-email" })), params());
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(subscriberService.enrichRequest).not.toHaveBeenCalled();
  });

  it("strips unknown keys from the body (unknown fields are ignored, not rejected)", async () => {
    const res = await POST(makePost(validBody({ unknownField: "surprise" })), params());
    expect(res.status).toBe(201);
  });
});

// ─── POST: error handling ─────────────────────────────────────────────────────

describe("POST — error handling", () => {
  it("returns 500 when the subscriber service throws", async () => {
    vi.mocked(subscriberService.upsertSubscriber).mockRejectedValue(new Error("DB connection lost"));
    const res = await POST(makePost(validBody()), params());
    expect(res.status).toBe(500);
  });

  it("does not leak internal error details in the 500 response", async () => {
    vi.mocked(subscriberService.upsertSubscriber).mockRejectedValue(new Error("DB connection lost"));
    const res = await POST(makePost(validBody()), params());
    const body = await res.json();
    expect(body.message).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain("DB connection lost");
  });
});
