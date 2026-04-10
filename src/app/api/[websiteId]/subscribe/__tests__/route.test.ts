// @vitest-environment node
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/domain", () => ({
  websiteService: {
    getWebsiteForSigning: vi.fn(),
  },
  subscriberService: {
    upsertSubscriber: vi.fn(),
    enrichSubscriber: vi.fn(),
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

// Run after() callbacks synchronously so enrichSubscriber assertions work.
vi.mock("next/server", () => ({
  after: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { after } from "next/server";
import { UAParser } from "ua-parser-js";
import { subscriberService, websiteService } from "@/lib/domain";
import { checkRateLimit } from "@/lib/rate-limiter";
import { OPTIONS, POST } from "../route";

// Reset all mocks and restore defaults before every test.
beforeEach(() => {
  vi.clearAllMocks();
  // Restore after() to synchronously invoke its callback so enrichSubscriber
  // assertions can be made without async delay.
  // Must use function keyword — arrow functions cannot be used as constructors
  // and Vitest warns when arrow functions are used in mockImplementation for
  // mocks that may be called with `new`.
  // biome-ignore lint/complexity/useArrowFunction: function keyword required — after() callback is awaited
  vi.mocked(after).mockImplementation(function (task) {
    void (task as () => Promise<void>)();
  });
  // Restore UAParser constructor — returns a minimal parser stub.
  // biome-ignore lint/complexity/useArrowFunction: function keyword required — UAParser is called with `new`
  vi.mocked(UAParser).mockImplementation(function () {
    return {
      getBrowser: () => ({ name: "Chrome" }),
      getDevice: () => ({ type: undefined }),
      getOS: () => ({ name: "macOS" }),
    } as never;
  });
  vi.mocked(checkRateLimit).mockReturnValue(true);
  vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(mockWebsite);
  vi.mocked(subscriberService.upsertSubscriber).mockResolvedValue(mockSubscriber);
  vi.mocked(subscriberService.enrichSubscriber).mockResolvedValue(undefined);
});

// ─── Constants ────────────────────────────────────────────────────────────────

const WEBSITE_ID = "site_abc123";
const WEBSITE_URL = "https://example.com";
const WEBSITE_KEY = "test-signing-secret-32chars!!!!!";

const mockWebsite = { id: WEBSITE_ID, url: WEBSITE_URL, isActive: true, key: WEBSITE_KEY };

const mockSubscriber = { subscriber: {} as never, created: true };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reproduces the SDK signing algorithm server-side for test fixture generation. */
function buildSignature(websiteId: string, key: string, timestamp: number): string {
  const ts = String(timestamp);
  const dynamicKey = createHmac("sha256", key).update(ts).digest();
  return createHmac("sha256", dynamicKey).update(`${websiteId}:${ts}`).digest("base64url");
}

function validBody(overrides?: Record<string, unknown>) {
  const timestamp = Date.now();
  const signature = buildSignature(WEBSITE_ID, WEBSITE_KEY, timestamp);
  return { email: "alice@example.com", timestamp, signature, ...overrides };
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
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(null);
    expect((await OPTIONS(makeOptions(), params())).status).toBe(401);
  });

  it("returns 401 when website is inactive", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue({ ...mockWebsite, isActive: false });
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
    // 316 chars local + "@" + domain = well over 320 to ensure maxLength triggers
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

  it("returns 400 when timestamp is missing", async () => {
    const { timestamp: _t, ...body } = validBody();
    expect((await POST(makePost(body), params())).status).toBe(400);
  });

  it("returns 400 when signature is missing", async () => {
    const { signature: _s, ...body } = validBody();
    expect((await POST(makePost(body), params())).status).toBe(400);
  });
});

// ─── POST: signature + origin guard ──────────────────────────────────────────

describe("POST — signature & origin guard", () => {
  it("returns 401 when signature is wrong", async () => {
    expect((await POST(makePost(validBody({ signature: "wrong" })), params())).status).toBe(401);
  });

  it("returns 401 when timestamp is expired (>5 min old)", async () => {
    const ts = Date.now() - 6 * 60 * 1000;
    const sig = buildSignature(WEBSITE_ID, WEBSITE_KEY, ts);
    expect((await POST(makePost(validBody({ timestamp: ts, signature: sig })), params())).status).toBe(401);
  });

  it("returns 401 when timestamp is too far in the future (>5 min)", async () => {
    const ts = Date.now() + 6 * 60 * 1000;
    const sig = buildSignature(WEBSITE_ID, WEBSITE_KEY, ts);
    expect((await POST(makePost(validBody({ timestamp: ts, signature: sig })), params())).status).toBe(401);
  });

  it("returns 401 when website is not found", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(null);
    expect((await POST(makePost(validBody()), params())).status).toBe(401);
  });

  it("returns 401 when website is inactive", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue({ ...mockWebsite, isActive: false });
    expect((await POST(makePost(validBody()), params())).status).toBe(401);
  });

  it("returns 403 when origin does not match website URL", async () => {
    expect((await POST(makePost(validBody(), "https://evil.com"), params())).status).toBe(403);
  });

  it("returns 403 when origin header is absent", async () => {
    expect((await POST(makePost(validBody(), null), params())).status).toBe(403);
  });
});

// ─── POST: rate limiting ──────────────────────────────────────────────────────

describe("POST — rate limiting", () => {
  it("returns 429 with Retry-After when rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);
    const res = await POST(makePost(validBody()), params());
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
  });

  it("includes CORS headers in the 429 response", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);
    const res = await POST(makePost(validBody()), params());
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
  });
});

// ─── POST: honeypot ───────────────────────────────────────────────────────────

describe("POST — honeypot", () => {
  it("returns 201 silently without inserting when __hp is filled", async () => {
    const res = await POST(makePost(validBody({ __hp: "i-am-a-bot" })), params());
    expect(res.status).toBe(201);
    expect(subscriberService.upsertSubscriber).not.toHaveBeenCalled();
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

  it("calls enrichSubscriber with websiteId and email after upsert", async () => {
    await POST(makePost(validBody()), params());
    // enrichSubscriber runs inside an async after() callback — flush microtasks first.
    await vi.waitFor(() =>
      expect(subscriberService.enrichSubscriber).toHaveBeenCalledWith(
        "alice@example.com",
        WEBSITE_ID,
        expect.objectContaining({ country: null }),
      ),
    );
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
