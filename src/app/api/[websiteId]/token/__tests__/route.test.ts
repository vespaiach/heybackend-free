// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/domain", () => ({
  websiteService: {
    getWebsiteForSigning: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/signing", () => ({
  mintToken: vi.fn().mockReturnValue({ token: "mock-token", expiresAt: 9_999_999_999_000 }),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { websiteService } from "@/lib/domain";
import { checkRateLimit } from "@/lib/rate-limiter";
import { mintToken } from "@/lib/signing";
import { GET, OPTIONS } from "../route";

// ─── Constants ────────────────────────────────────────────────────────────────

const WEBSITE_ID = "site_abc123";
const WEBSITE_URL = "https://example.com";
const WEBSITE_KEY = "test-signing-secret-32chars!!!!!";

const mockWebsite = { id: WEBSITE_ID, url: WEBSITE_URL, isActive: true, key: WEBSITE_KEY };

function params(id = WEBSITE_ID) {
  return { params: Promise.resolve({ websiteId: id }) };
}

function makeGet(origin: string | null = WEBSITE_URL): Request {
  const headers: Record<string, string> = {};
  if (origin !== null) headers.Origin = origin;
  return new Request(`http://localhost/api/${WEBSITE_ID}/token`, { headers });
}

function makeOptions(origin: string | null = WEBSITE_URL): Request {
  const headers: Record<string, string> = {};
  if (origin !== null) headers.Origin = origin;
  return new Request(`http://localhost/api/${WEBSITE_ID}/token`, { method: "OPTIONS", headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(mockWebsite);
  vi.mocked(checkRateLimit).mockReturnValue(true);
  vi.mocked(mintToken).mockReturnValue({ token: "mock-token", expiresAt: 9_999_999_999_000 });
});

// ─── OPTIONS ──────────────────────────────────────────────────────────────────

describe("OPTIONS /api/[websiteId]/token", () => {
  it("returns 204 with CORS headers for a valid origin", async () => {
    const res = await OPTIONS(makeOptions(), params());
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
  });

  it("includes GET in Access-Control-Allow-Methods", async () => {
    const res = await OPTIONS(makeOptions(), params());
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
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

// ─── GET ──────────────────────────────────────────────────────────────────────

describe("GET /api/[websiteId]/token", () => {
  it("returns 200 with { token, expiresAt } for a valid origin", async () => {
    const res = await GET(makeGet(), params());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ token: "mock-token", expiresAt: 9_999_999_999_000 });
  });

  it("includes CORS headers in the 200 response", async () => {
    const res = await GET(makeGet(), params());
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });

  it("calls mintToken with (website.key, websiteId)", async () => {
    await GET(makeGet(), params());
    expect(mintToken).toHaveBeenCalledWith(WEBSITE_KEY, WEBSITE_ID);
  });

  it("does NOT include website.key in the response body", async () => {
    await GET(makeGet(), params());
    const res = await GET(makeGet(), params());
    const text = await res.text();
    expect(text).not.toContain(WEBSITE_KEY);
  });

  it("returns 401 when website is not found", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(null);
    expect((await GET(makeGet(), params())).status).toBe(401);
  });

  it("returns 401 when website is inactive", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue({ ...mockWebsite, isActive: false });
    const res = await GET(makeGet(), params());
    expect(res.status).toBe(401);
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
  });

  it("returns 403 when origin does not match", async () => {
    expect((await GET(makeGet("https://evil.com"), params())).status).toBe(403);
  });

  it("returns 403 when origin header is absent", async () => {
    expect((await GET(makeGet(null), params())).status).toBe(403);
  });

  it("returns 429 with Retry-After when rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);
    const res = await GET(makeGet(), params());
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
  });

  it("includes CORS headers in the 429 response", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);
    const res = await GET(makeGet(), params());
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
  });
});
