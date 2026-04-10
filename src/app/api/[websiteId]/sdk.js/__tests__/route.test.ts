// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/domain", () => ({
  websiteService: {
    getWebsiteForSigning: vi.fn(),
  },
}));

// Pass-through mock so placeholder-replacement assertions work without real obfuscation.
vi.mock("javascript-obfuscator", () => ({
  default: {
    obfuscate: vi.fn((code: string) => ({ getObfuscatedCode: () => code })),
  },
}));

// Simulates the real minified bundle pattern where each placeholder is a standalone quoted string
vi.mock("node:fs", () => ({
  readFileSync: vi.fn().mockReturnValue('var c={websiteId:"__HB_WEBSITE_ID__",key:"__HB_KEY__"}'),
}));

import { websiteService } from "@/lib/domain";
import { GET } from "../route";

const WEBSITE_ID = "site_abc123";
const WEBSITE_KEY = "super-secret-key";
const mockWebsite = { id: WEBSITE_ID, url: "https://example.com", isActive: true, key: WEBSITE_KEY };

function params(id = WEBSITE_ID) {
  return { params: Promise.resolve({ websiteId: id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(mockWebsite);
});

describe("GET /api/[websiteId]/sdk.js", () => {
  it("returns 200 with application/javascript content type", async () => {
    const res = await GET(new Request("http://localhost"), params());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/javascript");
  });

  it("replaces __HB_WEBSITE_ID__ placeholder with the real websiteId", async () => {
    const res = await GET(new Request("http://localhost"), params());
    const text = await res.text();
    expect(text).toContain(JSON.stringify(WEBSITE_ID));
    expect(text).not.toContain("__HB_WEBSITE_ID__");
  });

  it("replaces __HB_KEY__ placeholder with the real key", async () => {
    const res = await GET(new Request("http://localhost"), params());
    const text = await res.text();
    expect(text).toContain(JSON.stringify(WEBSITE_KEY));
    expect(text).not.toContain("__HB_KEY__");
  });

  it("includes Cache-Control header", async () => {
    const res = await GET(new Request("http://localhost"), params());
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("returns a stub JS warning when website is not found", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), params());
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("console.warn");
    expect(text).not.toContain("__HB_WEBSITE_ID__");
  });

  it("returns a stub JS warning when website is inactive", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue({ ...mockWebsite, isActive: false });
    const res = await GET(new Request("http://localhost"), params());
    const text = await res.text();
    expect(text).toContain("console.warn");
  });

  it("JSON-encodes the key correctly (handles special chars)", async () => {
    const specialKey = 'key-with-"quotes"-and-backslash\\';
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue({ ...mockWebsite, key: specialKey });
    const res = await GET(new Request("http://localhost"), params());
    const text = await res.text();
    expect(text).toContain(JSON.stringify(specialKey));
  });
});
