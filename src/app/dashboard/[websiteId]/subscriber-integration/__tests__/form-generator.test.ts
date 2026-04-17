import { describe, expect, it } from "vitest";
import { type FormConfig, generateFormCode, generateFormPreview } from "../_components/form-generator";

describe("Form Generator", () => {
  const baseConfig: FormConfig = {
    websiteId: "test_site_123",
    fields: "email-only",
    successBehavior: {
      type: "redirect",
      url: "https://example.com/welcome",
    },
    errorMessage: "Something went wrong. Please try again.",
  };

  describe("generateFormPreview", () => {
    it("generates HTML form with email only field", () => {
      const html = generateFormPreview("email-only");
      expect(html).toContain('name="email"');
      expect(html).toContain('type="email"');
      expect(html).not.toContain('name="firstName"');
    });

    it("generates HTML form with email, firstName, lastName fields", () => {
      const html = generateFormPreview("email-name");
      expect(html).toContain('name="email"');
      expect(html).toContain('name="firstName"');
      expect(html).toContain('name="lastName"');
    });
  });

  describe("generateFormCode", () => {
    it("generates code with redirect on success", () => {
      const code = generateFormCode({
        ...baseConfig,
        fields: "email-only",
      });
      expect(code).toContain("window.location.href");
      expect(code).toContain("https://example.com/welcome");
      expect(code).toContain(`api/test_site_123/sdk.js`);
    });

    it("generates code with inline success message", () => {
      const code = generateFormCode({
        ...baseConfig,
        successBehavior: {
          type: "message",
          message: "Welcome aboard!",
        },
      });
      expect(code).toContain("Welcome aboard!");
      expect(code).not.toContain("window.location.href");
    });

    it("includes custom error message in callback", () => {
      const code = generateFormCode({
        ...baseConfig,
        errorMessage: "Custom error text",
      });
      expect(code).toContain("Custom error text");
    });

    it("generates code with all three fields", () => {
      const code = generateFormCode({
        ...baseConfig,
        fields: "email-name",
      });
      expect(code).toContain('name="email"');
      expect(code).toContain('name="firstName"');
      expect(code).toContain('name="lastName"');
    });
  });
});
