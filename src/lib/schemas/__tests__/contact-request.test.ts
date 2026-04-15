import * as v from "valibot";
import { describe, expect, it } from "vitest";

import { ContactRequestSchema } from "../contact-request";

describe("ContactRequestSchema", () => {
  it("should validate a valid contact request", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      message: "Hello, I have a question",
      token: "abc123token",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.name).toBe("John Doe");
      expect(result.output.email).toBe("john@example.com");
      expect(result.output.message).toBe("Hello, I have a question");
    }
  });

  it("should validate optional company field", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      company: "Acme Corp",
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.company).toBe("Acme Corp");
    }
  });

  it("should validate optional phone field", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.phone).toBe("+1234567890");
    }
  });

  it("should reject missing name", () => {
    const payload = {
      email: "john@example.com",
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should reject missing email", () => {
    const payload = {
      name: "John Doe",
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should reject missing message", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const payload = {
      name: "John Doe",
      email: "not-an-email",
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should enforce name max length of 256", () => {
    const payload = {
      name: "a".repeat(257),
      email: "john@example.com",
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should enforce email max length of 320", () => {
    const payload = {
      name: "John Doe",
      email: `${"a".repeat(64)}@${"b".repeat(256)}.com`,
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should enforce message max length of 5000", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      message: "a".repeat(5001),
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should enforce company max length of 256", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      company: "a".repeat(257),
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should enforce phone max length of 50", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      phone: "a".repeat(51),
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should reject missing token", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      message: "Hello",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should reject missing expiresAt", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      message: "Hello",
      token: "abc123",
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should accept honeypot field when empty", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      message: "Hello",
      __hp: "",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(true);
  });

  it("should trim whitespace from name", () => {
    const payload = {
      name: "  John Doe  ",
      email: "john@example.com",
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.name).toBe("John Doe");
    }
  });

  it("should trim whitespace from email", () => {
    const payload = {
      name: "John Doe",
      email: "  john@example.com  ",
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.email).toBe("john@example.com");
    }
  });

  it("should trim whitespace from message", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      message: "  Hello there  ",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.message).toBe("Hello there");
    }
  });

  it("should reject empty name after trimming", () => {
    const payload = {
      name: "   ",
      email: "john@example.com",
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should reject empty message after trimming", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      message: "   ",
      token: "abc123",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should require non-empty token", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      message: "Hello",
      token: "",
      expiresAt: Date.now() + 900000,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should require expiresAt to be an integer", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      message: "Hello",
      token: "abc123",
      expiresAt: 123.456,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(false);
  });

  it("should allow expiresAt to be 0", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      message: "Hello",
      token: "abc123",
      expiresAt: 0,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(true);
  });

  it("should ignore unknown fields", () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      message: "Hello",
      token: "abc123",
      expiresAt: Date.now() + 900000,
      unknownField: "should be ignored",
      anotherUnknown: 123,
    };

    const result = v.safeParse(ContactRequestSchema, payload);
    expect(result.success).toBe(true);
  });
});
