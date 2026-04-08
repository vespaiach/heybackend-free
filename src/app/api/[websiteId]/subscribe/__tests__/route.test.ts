// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetWebsiteById = vi.fn();
const mockUpsertSubscriber = vi.fn();

vi.mock("@/lib/domain", () => ({
  websiteService: {
    getWebsiteById: (...args: unknown[]) => mockGetWebsiteById(...args),
  },
  subscriberService: {
    upsertSubscriber: (...args: unknown[]) => mockUpsertSubscriber(...args),
  },
}));

import { OPTIONS, POST } from "../route";

const WEBSITE_ID = "site-1";
const WEBSITE_URL = "https://example.com";
const ACTIVE_WEBSITE = { id: WEBSITE_ID, url: WEBSITE_URL, isActive: true };

function makeParams(id = WEBSITE_ID): { params: Promise<{ websiteId: string }> } {
  return { params: Promise.resolve({ websiteId: id }) };
}

function makeRequest(overrides: { origin?: string | null; body?: unknown; method?: string } = {}): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const origin = "origin" in overrides ? overrides.origin : WEBSITE_URL;
  if (origin !== null && origin !== undefined) headers["origin"] = origin;

  const body =
    overrides.body !== undefined
      ? overrides.body
      : { email: "user@example.com", first_name: "Jane", last_name: "Doe" };

  return new Request(`http://localhost/api/${WEBSITE_ID}/subscribe`, {
    method: overrides.method ?? "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWebsiteById.mockResolvedValue(ACTIVE_WEBSITE);
  mockUpsertSubscriber.mockResolvedValue({
    id: "sub-1",
    email: "user@example.com",
    firstName: null,
    lastName: null,
    websiteId: WEBSITE_ID,
    createdAt: new Date(),
    unsubscribedAt: null,
    tags: [],
    userAgent: null,
    referrer: null,
    timezone: null,
    locale: null,
    screenWidth: null,
    screenHeight: null,
    viewportWidth: null,
    viewportHeight: null,
    country: null,
    region: null,
    city: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    metadata: null,
  });
});

// ─── OPTIONS ──────────────────────────────────────────────────────────────────

describe("OPTIONS", () => {
  it("returns 204 with CORS headers for valid origin", async () => {
    const res = await OPTIONS(makeRequest({ method: "OPTIONS" }), makeParams());
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("returns 403 when Origin does not match website URL", async () => {
    const res = await OPTIONS(
      makeRequest({ method: "OPTIONS", origin: "https://attacker.com" }),
      makeParams(),
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when Origin header is absent", async () => {
    const res = await OPTIONS(makeRequest({ method: "OPTIONS", origin: null }), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 401 when website is not found", async () => {
    mockGetWebsiteById.mockResolvedValue(null);
    const res = await OPTIONS(makeRequest({ method: "OPTIONS" }), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 401 when website is inactive", async () => {
    mockGetWebsiteById.mockResolvedValue({ ...ACTIVE_WEBSITE, isActive: false });
    const res = await OPTIONS(makeRequest({ method: "OPTIONS" }), makeParams());
    expect(res.status).toBe(401);
  });
});

// ─── POST ─────────────────────────────────────────────────────────────────────

describe("POST", () => {
  it("returns 201 and calls upsertSubscriber on a valid request", async () => {
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(201);
    expect(mockUpsertSubscriber).toHaveBeenCalledOnce();
    expect(mockUpsertSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        firstName: "Jane",
        lastName: "Doe",
        websiteId: WEBSITE_ID,
      }),
    );
  });

  it("calls getWebsiteById with websiteId from URL params", async () => {
    await POST(makeRequest(), makeParams());
    expect(mockGetWebsiteById).toHaveBeenCalledWith(WEBSITE_ID);
  });

  it("includes CORS headers in 201 response", async () => {
    const res = await POST(makeRequest(), makeParams());
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
  });

  it("normalises email to lowercase", async () => {
    const res = await POST(makeRequest({ body: { email: "User@EXAMPLE.COM" } }), makeParams());
    expect(res.status).toBe(201);
    expect(mockUpsertSubscriber).toHaveBeenCalledWith(expect.objectContaining({ email: "user@example.com" }));
  });

  it("returns 401 when website is not found", async () => {
    mockGetWebsiteById.mockResolvedValue(null);
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 401 when website is inactive", async () => {
    mockGetWebsiteById.mockResolvedValue({ ...ACTIVE_WEBSITE, isActive: false });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 when Origin header is absent", async () => {
    const res = await POST(makeRequest({ origin: null }), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 403 when Origin does not match website URL", async () => {
    const res = await POST(makeRequest({ origin: "https://evil.com" }), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const request = new Request(`http://localhost/api/${WEBSITE_ID}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: WEBSITE_URL,
      },
      body: "not-json{{{",
    });
    const res = await POST(request, makeParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ body: { first_name: "Jane" } }), makeParams());
    expect(res.status).toBe(400);
    expect(mockUpsertSubscriber).not.toHaveBeenCalled();
  });

  it("returns 400 when email is an empty string", async () => {
    const res = await POST(makeRequest({ body: { email: "" } }), makeParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 when email format is invalid", async () => {
    const res = await POST(makeRequest({ body: { email: "notanemail" } }), makeParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is missing a TLD", async () => {
    const res = await POST(makeRequest({ body: { email: "user@example" } }), makeParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 when first_name exceeds 256 characters", async () => {
    const res = await POST(
      makeRequest({ body: { email: "user@example.com", first_name: "a".repeat(257) } }),
      makeParams(),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when last_name exceeds 256 characters", async () => {
    const res = await POST(
      makeRequest({ body: { email: "user@example.com", last_name: "b".repeat(257) } }),
      makeParams(),
    );
    expect(res.status).toBe(400);
  });

  it("400 responses include CORS headers after website is found", async () => {
    const res = await POST(makeRequest({ body: { email: "bad" } }), makeParams());
    expect(res.status).toBe(400);
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
  });

  it("succeeds with only email (first_name and last_name optional)", async () => {
    const res = await POST(makeRequest({ body: { email: "user@example.com" } }), makeParams());
    expect(res.status).toBe(201);
    expect(mockUpsertSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@example.com", firstName: null, lastName: null }),
    );
  });

  it("passes User-Agent from request header to upsertSubscriber enrichment", async () => {
    const request = new Request(`http://localhost/api/${WEBSITE_ID}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: WEBSITE_URL,
        "user-agent": "TestBrowser/1.0",
      },
      body: JSON.stringify({ email: "user@example.com" }),
    });
    await POST(request, makeParams());
    expect(mockUpsertSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        browser: null,
        deviceType: null,
        os: null,
      }),
    );
  });

  it("returns 400 when the body contains unsupported fields", async () => {
    const res = await POST(
      makeRequest({ body: { email: "user@example.com", referrer: "https://google.com" } }),
      makeParams(),
    );
    expect(res.status).toBe(400);
    expect(mockUpsertSubscriber).not.toHaveBeenCalled();
  });

  it("returns an explicit validation message for unsupported fields", async () => {
    const res = await POST(
      makeRequest({ body: { email: "user@example.com", metadata: { plan: "pro" } } }),
      makeParams(),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      message: ["Only email, first_name, and last_name are allowed"],
    });
  });

  it("rejects server-managed fields in the request body", async () => {
    const res = await POST(
      makeRequest({ body: { email: "user@example.com", userAgent: "SpooferBot/9000" } }),
      makeParams(),
    );
    expect(res.status).toBe(400);
    expect(mockUpsertSubscriber).not.toHaveBeenCalled();
  });
});
