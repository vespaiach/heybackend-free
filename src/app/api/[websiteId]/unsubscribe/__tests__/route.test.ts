// @vitest-environment node

vi.mock("@/lib/domain", () => ({
  websiteService: { getWebsiteForSigning: vi.fn(), getWebsiteById: vi.fn() },
  subscriberService: {
    unsubscribeByEmail: vi.fn(),
    logRequest: vi.fn(),
    enrichRequest: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("fast-geoip", () => ({ default: { lookup: vi.fn().mockResolvedValue(null) } }));
vi.mock("ua-parser-js", () => ({ UAParser: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/rate-limiter", () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));

import { after } from "next/server";
import { UAParser } from "ua-parser-js";
import { subscriberService, websiteService } from "@/lib/domain";
import { checkRateLimit } from "@/lib/rate-limiter";
import { mintToken } from "@/lib/signing";
import { GET } from "../route";

// ─── Constants ────────────────────────────────────────────────────────────────

const WEBSITE_ID = "site_abc123";
const WEBSITE_URL = "https://example.com";
const WEBSITE_KEY = "test-signing-secret-32chars!!!!!";

const mockWebsite = { id: WEBSITE_ID, url: WEBSITE_URL, isActive: true, key: WEBSITE_KEY };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGet(overrides: Record<string, string> = {}): Request {
  const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID);
  const qs = new URLSearchParams({
    email: "alice@example.com",
    token,
    expiresAt: String(expiresAt),
    ...overrides,
  });
  return new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

function params(id = WEBSITE_ID) {
  return { params: Promise.resolve({ websiteId: id }) };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(after).mockImplementation((task) => void (task as () => Promise<void>)());
  // biome-ignore lint/complexity/useArrowFunction: function keyword required — UAParser is called with `new`
  vi.mocked(UAParser).mockImplementation(function () {
    return {
      getBrowser: () => ({ name: "Firefox" }),
      getDevice: () => ({ type: undefined }),
      getOS: () => ({ name: "Linux" }),
    } as never;
  });
  vi.mocked(checkRateLimit).mockReturnValue(true);
  vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(mockWebsite);
  vi.mocked(subscriberService.unsubscribeByEmail).mockResolvedValue(true);
  vi.mocked(subscriberService.logRequest).mockResolvedValue({ id: "req_1" } as never);
  vi.mocked(subscriberService.enrichRequest).mockResolvedValue(undefined);
});

// ─── Query param validation ───────────────────────────────────────────────────

describe("GET — query param validation", () => {
  it("returns 422 when email is missing", async () => {
    const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID);
    const qs = new URLSearchParams({ token, expiresAt: String(expiresAt) });
    const req = new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, { method: "GET" });
    expect((await GET(req, params())).status).toBe(422);
  });

  it("logs REJECTED/VALIDATION_ERROR when email is missing", async () => {
    const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID);
    const qs = new URLSearchParams({ token, expiresAt: String(expiresAt) });
    const req = new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, { method: "GET" });
    await GET(req, params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "UNSUBSCRIBE",
        status: "REJECTED",
        rejectionReason: "VALIDATION_ERROR",
      }),
    );
  });

  it("logs REJECTED/VALIDATION_ERROR when email format is invalid", async () => {
    await GET(makeGet({ email: "not-an-email" }), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "UNSUBSCRIBE",
        status: "REJECTED",
        rejectionReason: "VALIDATION_ERROR",
      }),
    );
  });

  it("returns 422 when email format is invalid", async () => {
    expect((await GET(makeGet({ email: "not-an-email" }), params())).status).toBe(422);
  });

  it("returns 422 when token is missing", async () => {
    const { expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID);
    const qs = new URLSearchParams({ email: "alice@example.com", expiresAt: String(expiresAt) });
    const req = new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, { method: "GET" });
    expect((await GET(req, params())).status).toBe(422);
  });

  it("logs REJECTED/VALIDATION_ERROR when token is missing", async () => {
    const { expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID);
    const qs = new URLSearchParams({ email: "alice@example.com", expiresAt: String(expiresAt) });
    const req = new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, { method: "GET" });
    await GET(req, params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "UNSUBSCRIBE",
        status: "REJECTED",
        rejectionReason: "VALIDATION_ERROR",
      }),
    );
  });

  it("returns 422 when expiresAt is missing", async () => {
    const { token } = mintToken(WEBSITE_KEY, WEBSITE_ID);
    const qs = new URLSearchParams({ email: "alice@example.com", token });
    const req = new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, { method: "GET" });
    expect((await GET(req, params())).status).toBe(422);
  });

  it("logs REJECTED/VALIDATION_ERROR when expiresAt is missing", async () => {
    const { token } = mintToken(WEBSITE_KEY, WEBSITE_ID);
    const qs = new URLSearchParams({ email: "alice@example.com", token });
    const req = new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, { method: "GET" });
    await GET(req, params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "UNSUBSCRIBE",
        status: "REJECTED",
        rejectionReason: "VALIDATION_ERROR",
      }),
    );
  });
});

// ─── Token guard ─────────────────────────────────────────────────────────────

describe("GET — token guard", () => {
  it("returns 401 when token is tampered", async () => {
    expect((await GET(makeGet({ token: "tampered" }), params())).status).toBe(401);
  });

  it("logs REJECTED/INVALID_TOKEN for tampered token", async () => {
    await GET(makeGet({ token: "tampered" }), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "UNSUBSCRIBE", status: "REJECTED", rejectionReason: "INVALID_TOKEN" }),
    );
  });

  it("returns 401 when token is expired", async () => {
    const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID, Date.now() - 16 * 60 * 1000);
    expect((await GET(makeGet({ token, expiresAt: String(expiresAt) }), params())).status).toBe(401);
  });

  it("returns 401 when website is not found", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(null);
    expect((await GET(makeGet(), params())).status).toBe(401);
  });

  it("returns 403 when website is inactive", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue({ ...mockWebsite, isActive: false });
    expect((await GET(makeGet(), params())).status).toBe(403);
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe("GET — rate limiting", () => {
  it("returns 429 with Retry-After when per-IP limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);
    const res = await GET(makeGet(), params());
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeTruthy();
  });

  it("logs REJECTED/RATE_LIMIT_IP when per-IP limit exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);
    await GET(makeGet(), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "UNSUBSCRIBE", status: "REJECTED", rejectionReason: "RATE_LIMIT_IP" }),
    );
  });

  it("logs REJECTED/RATE_LIMIT_WEBSITE when per-website limit exceeded", async () => {
    vi.mocked(checkRateLimit)
      .mockReturnValueOnce(true) // per-IP passes
      .mockReturnValue(false); // per-website fails
    const res = await GET(makeGet(), params());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeTruthy();
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "UNSUBSCRIBE",
        status: "REJECTED",
        rejectionReason: "RATE_LIMIT_WEBSITE",
      }),
    );
  });
});

// ─── Subscriber not found ─────────────────────────────────────────────────────

describe("GET — subscriber not found", () => {
  it("returns 404 when email is not subscribed to this website", async () => {
    vi.mocked(subscriberService.unsubscribeByEmail).mockResolvedValue(false);
    expect((await GET(makeGet(), params())).status).toBe(404);
  });

  it("logs REJECTED/VALIDATION_ERROR when subscriber not found", async () => {
    vi.mocked(subscriberService.unsubscribeByEmail).mockResolvedValue(false);
    await GET(makeGet(), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "UNSUBSCRIBE",
        status: "REJECTED",
        rejectionReason: "VALIDATION_ERROR",
      }),
    );
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe("GET — happy path", () => {
  it("returns 200 with Unsubscribed message", async () => {
    const res = await GET(makeGet(), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Unsubscribed" });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeTruthy();
  });

  it("calls unsubscribeByEmail with normalised email and websiteId", async () => {
    await GET(makeGet({ email: "ALICE@EXAMPLE.COM" }), params());
    expect(subscriberService.unsubscribeByEmail).toHaveBeenCalledWith("alice@example.com", WEBSITE_ID);
  });

  it("logs ACCEPTED with normalised email and websiteId", async () => {
    await GET(makeGet(), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "alice@example.com",
        websiteId: WEBSITE_ID,
        type: "UNSUBSCRIBE",
        status: "ACCEPTED",
      }),
    );
  });

  it("calls enrichRequest on the logged request id after unsubscribing", async () => {
    vi.mocked(subscriberService.logRequest).mockResolvedValue({ id: "req_1" } as never);
    await GET(makeGet(), params());
    await vi.waitFor(() =>
      expect(subscriberService.enrichRequest).toHaveBeenCalledWith(
        "req_1",
        expect.objectContaining({ country: null, platform: "Linux" }),
      ),
    );
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe("GET — error handling", () => {
  it("returns 500 when unsubscribeByEmail throws", async () => {
    vi.mocked(subscriberService.unsubscribeByEmail).mockRejectedValue(new Error("DB error"));
    expect((await GET(makeGet(), params())).status).toBe(500);
  });

  it("does not leak error details in the 500 response", async () => {
    vi.mocked(subscriberService.unsubscribeByEmail).mockRejectedValue(new Error("DB error"));
    const res = await GET(makeGet(), params());
    const body = await res.json();
    expect(body.message).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain("DB error");
  });
});
