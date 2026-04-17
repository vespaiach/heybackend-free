// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deriveWebsiteId } from "../index";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deriveWebsiteId()", () => {
  it("extracts websiteId from /api/{websiteId}/sdk.js pattern", () => {
    const script = document.createElement("script");
    script.src = "https://app.heybackend.com/api/site_abc123/sdk.js";

    Object.defineProperty(document, "currentScript", {
      value: script,
      configurable: true,
    });

    expect(deriveWebsiteId()).toBe("site_abc123");
  });

  it("extracts websiteId with underscores", () => {
    const script = document.createElement("script");
    script.src = "https://example.com/api/my_website_id_123/sdk.js";

    Object.defineProperty(document, "currentScript", {
      value: script,
      configurable: true,
    });

    expect(deriveWebsiteId()).toBe("my_website_id_123");
  });

  it("extracts websiteId with hyphens", () => {
    const script = document.createElement("script");
    script.src = "https://example.com/api/my-website-id-123/sdk.js";

    Object.defineProperty(document, "currentScript", {
      value: script,
      configurable: true,
    });

    expect(deriveWebsiteId()).toBe("my-website-id-123");
  });

  it("returns placeholder when document is undefined", () => {
    const originalDocument = global.document;
    // @ts-expect-error - intentionally removing document
    delete global.document;

    try {
      expect(deriveWebsiteId()).toBe("__HB_WEBSITE_ID__");
    } finally {
      Object.defineProperty(global, "document", {
        value: originalDocument,
        configurable: true,
      });
    }
  });

  it("returns placeholder when document.currentScript is null", () => {
    Object.defineProperty(document, "currentScript", {
      value: null,
      configurable: true,
    });

    expect(deriveWebsiteId()).toBe("__HB_WEBSITE_ID__");
  });

  it("returns placeholder when URL parsing fails", () => {
    const script = document.createElement("script");
    script.src = "not a valid url";

    Object.defineProperty(document, "currentScript", {
      value: script,
      configurable: true,
    });

    expect(deriveWebsiteId()).toBe("__HB_WEBSITE_ID__");
  });

  it("returns placeholder when URL doesn't match /api/{websiteId}/sdk.js pattern", () => {
    const script = document.createElement("script");
    script.src = "https://app.heybackend.com/other/path/script.js";

    Object.defineProperty(document, "currentScript", {
      value: script,
      configurable: true,
    });

    expect(deriveWebsiteId()).toBe("__HB_WEBSITE_ID__");
  });

  it("works with complex paths including query parameters", () => {
    const script = document.createElement("script");
    script.src = "https://app.heybackend.com/api/site_xyz/sdk.js?cache=false";

    Object.defineProperty(document, "currentScript", {
      value: script,
      configurable: true,
    });

    expect(deriveWebsiteId()).toBe("site_xyz");
  });

  it("works with different origins", () => {
    const script = document.createElement("script");
    script.src = "https://custom-domain.io/api/custom_id/sdk.js";

    Object.defineProperty(document, "currentScript", {
      value: script,
      configurable: true,
    });

    expect(deriveWebsiteId()).toBe("custom_id");
  });
});
