import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { WebsiteSchema } from "@/lib/schemas";

describe("WebsiteFormModal Schema", () => {
  it("should validate correct website data", () => {
    const validData = { name: "My Website", url: "https://example.com" };
    const result = v.safeParse(WebsiteSchema, validData);
    expect(result.success).toBe(true);
  });

  it("should reject invalid URL format", () => {
    const invalidData = { name: "My Site", url: "not-a-url" };
    const result = v.safeParse(WebsiteSchema, invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject empty name", () => {
    const emptyNameData = { name: "", url: "https://example.com" };
    const result = v.safeParse(WebsiteSchema, emptyNameData);
    expect(result.success).toBe(false);
  });

  it("should reject names longer than 255 characters", () => {
    const longNameData = {
      name: "a".repeat(256),
      url: "https://example.com",
    };
    const result = v.safeParse(WebsiteSchema, longNameData);
    expect(result.success).toBe(false);
  });

  it("should accept valid http and https URLs", () => {
    const httpData = { name: "My Site", url: "http://example.com" };
    const httpsData = { name: "My Site", url: "https://example.com" };

    const httpResult = v.safeParse(WebsiteSchema, httpData);
    const httpsResult = v.safeParse(WebsiteSchema, httpsData);

    expect(httpResult.success).toBe(true);
    expect(httpsResult.success).toBe(true);
  });
});
