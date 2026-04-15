import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST, OPTIONS } from "../route";
import { mintToken } from "@/lib/signing";

vi.mock("@/lib/domain", () => ({
  websiteService: {
    getWebsiteById: vi.fn(),
    getWebsiteForSigning: vi.fn(),
  },
  contactRequestService: {
    createContactRequest: vi.fn(),
    enrichContactRequest: vi.fn(),
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

vi.mock("next/server", () => ({
  after: vi.fn(),
}));

import { websiteService, contactRequestService } from "@/lib/domain";
import { after } from "next/server";

describe("POST /api/[websiteId]/contact", () => {
  const testWebsiteId = "website_123";
  const testWebsiteKey = "secret_key_123";
  const testWebsiteUrl = "https://example.com";
  const testOrigin = "https://example.com";

  beforeEach(() => {
    vi.clearAllMocks();
    // biome-ignore lint/complexity/useArrowFunction: function keyword required — after() callback is awaited
    vi.mocked(after).mockImplementation(function (task) {
      void (task as () => Promise<void>)();
    });
    const websiteData = {
      id: testWebsiteId,
      url: testWebsiteUrl,
      isActive: true,
      key: testWebsiteKey,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: "tenant_123",
    };
    vi.mocked(websiteService.getWebsiteById).mockImplementation(async (id: string) => {
      return id === testWebsiteId ? (websiteData as any) : null;
    });
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(websiteData as any);
    vi.mocked(contactRequestService.createContactRequest).mockResolvedValue({
      id: "contact_123",
      websiteId: testWebsiteId,
      email: "test@example.com",
      name: "Test",
      message: "Test message",
      company: null,
      phone: null,
      metadata: null,
      country: null,
      region: null,
      city: null,
      timezone: null,
      os: null,
      deviceType: null,
      browser: null,
      createdAt: new Date(),
    } as any);
  });

  describe("OPTIONS preflight", () => {
    it("should return 204 for valid preflight request", async () => {
      const request = new Request(`http://localhost:3000/api/${testWebsiteId}/contact`, {
        method: "OPTIONS",
        headers: {
          origin: testOrigin,
        },
      });

      const response = await OPTIONS(request, {
        params: Promise.resolve({ websiteId: testWebsiteId }),
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(testWebsiteUrl);
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    });

    it("should return 401 for non-existent website", async () => {
      const request = new Request("http://localhost:3000/api/nonexistent/contact", {
        method: "OPTIONS",
        headers: {
          origin: testOrigin,
        },
      });

      const response = await OPTIONS(request, {
        params: Promise.resolve({ websiteId: "nonexistent" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 403 for mismatched origin", async () => {
      const request = new Request(`http://localhost:3000/api/${testWebsiteId}/contact`, {
        method: "OPTIONS",
        headers: {
          origin: "https://different-origin.com",
        },
      });

      const response = await OPTIONS(request, {
        params: Promise.resolve({ websiteId: testWebsiteId }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe("POST contact submission", () => {
    it("should return 201 for valid contact request", async () => {
      const { token, expiresAt } = mintToken(testWebsiteKey, testWebsiteId);

      const body = {
        name: "John Doe",
        email: "john@example.com",
        message: "I have a question",
        token,
        expiresAt,
      };

      const request = new Request(`http://localhost:3000/api/${testWebsiteId}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: testOrigin,
        },
        body: JSON.stringify(body),
      });

      const response = await POST(request, {
        params: Promise.resolve({ websiteId: testWebsiteId }),
      });

      expect(response.status).toBe(201);
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should return 400 for invalid JSON body", async () => {
      const request = new Request(`http://localhost:3000/api/${testWebsiteId}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: testOrigin,
        },
        body: "invalid json",
      });

      const response = await POST(request, {
        params: Promise.resolve({ websiteId: testWebsiteId }),
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing required fields", async () => {
      const { token, expiresAt } = mintToken(testWebsiteKey, testWebsiteId);

      const body = {
        email: "john@example.com",
        // missing: name, message
        token,
        expiresAt,
      };

      const request = new Request(`http://localhost:3000/api/${testWebsiteId}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: testOrigin,
        },
        body: JSON.stringify(body),
      });

      const response = await POST(request, {
        params: Promise.resolve({ websiteId: testWebsiteId }),
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid email", async () => {
      const { token, expiresAt } = mintToken(testWebsiteKey, testWebsiteId);

      const body = {
        name: "John Doe",
        email: "not-an-email",
        message: "I have a question",
        token,
        expiresAt,
      };

      const request = new Request(`http://localhost:3000/api/${testWebsiteId}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: testOrigin,
        },
        body: JSON.stringify(body),
      });

      const response = await POST(request, {
        params: Promise.resolve({ websiteId: testWebsiteId }),
      });

      expect(response.status).toBe(400);
    });

    it("should return 401 for invalid token", async () => {
      const body = {
        name: "John Doe",
        email: "john@example.com",
        message: "I have a question",
        token: "invalid_token",
        expiresAt: Date.now() + 900000,
      };

      const request = new Request(`http://localhost:3000/api/${testWebsiteId}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: testOrigin,
        },
        body: JSON.stringify(body),
      });

      const response = await POST(request, {
        params: Promise.resolve({ websiteId: testWebsiteId }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 for expired token", async () => {
      const expiresAt = Date.now() - 1000; // expired
      const token = "any_token"; // doesn't matter, expired

      const body = {
        name: "John Doe",
        email: "john@example.com",
        message: "I have a question",
        token,
        expiresAt,
      };

      const request = new Request(`http://localhost:3000/api/${testWebsiteId}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: testOrigin,
        },
        body: JSON.stringify(body),
      });

      const response = await POST(request, {
        params: Promise.resolve({ websiteId: testWebsiteId }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 403 for mismatched origin", async () => {
      const { token, expiresAt } = mintToken(testWebsiteKey, testWebsiteId);

      const body = {
        name: "John Doe",
        email: "john@example.com",
        message: "I have a question",
        token,
        expiresAt,
      };

      const request = new Request(`http://localhost:3000/api/${testWebsiteId}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "https://attacker.com",
        },
        body: JSON.stringify(body),
      });

      const response = await POST(request, {
        params: Promise.resolve({ websiteId: testWebsiteId }),
      });

      expect(response.status).toBe(403);
    });

    it("should return 201 when honeypot is filled (silent accept)", async () => {
      const { token, expiresAt } = mintToken(testWebsiteKey, testWebsiteId);

      const body = {
        name: "Bot Name",
        email: "bot@example.com",
        message: "Bot message",
        __hp: "filled-by-bot",
        token,
        expiresAt,
      };

      const request = new Request(`http://localhost:3000/api/${testWebsiteId}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: testOrigin,
        },
        body: JSON.stringify(body),
      });

      const response = await POST(request, {
        params: Promise.resolve({ websiteId: testWebsiteId }),
      });

      // Should return 201 but NOT actually store the contact
      expect(response.status).toBe(201);
    });

    it("should accept optional company field", async () => {
      const { token, expiresAt } = mintToken(testWebsiteKey, testWebsiteId);

      const body = {
        name: "Jane Smith",
        email: "jane@example.com",
        company: "Tech Corp",
        message: "Great product!",
        token,
        expiresAt,
      };

      const request = new Request(`http://localhost:3000/api/${testWebsiteId}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: testOrigin,
        },
        body: JSON.stringify(body),
      });

      const response = await POST(request, {
        params: Promise.resolve({ websiteId: testWebsiteId }),
      });

      expect(response.status).toBe(201);
    });

    it("should accept optional phone field", async () => {
      const { token, expiresAt } = mintToken(testWebsiteKey, testWebsiteId);

      const body = {
        name: "Bob Johnson",
        email: "bob@example.com",
        phone: "+1234567890",
        message: "Call me soon",
        token,
        expiresAt,
      };

      const request = new Request(`http://localhost:3000/api/${testWebsiteId}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: testOrigin,
        },
        body: JSON.stringify(body),
      });

      const response = await POST(request, {
        params: Promise.resolve({ websiteId: testWebsiteId }),
      });

      expect(response.status).toBe(201);
    });
  });
});
