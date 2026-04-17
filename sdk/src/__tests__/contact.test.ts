import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetTokenCache, coreContactSubmit, HbError } from "../contact";
import * as signing from "../signing";

vi.mock("../signing");

describe("coreContactSubmit", () => {
  const mockConfig = {
    websiteId: "test_site_123",
    baseUrl: "https://app.heybackend.com",
  };

  const testData = {
    name: "John Doe",
    email: "john@example.com",
    message: "Test message",
    company: "Acme Inc",
    phone: "+1234567890",
  };

  beforeEach(() => {
    __resetTokenCache();
    vi.clearAllMocks();
    vi.mocked(signing.fetchToken).mockResolvedValue({
      token: "mock_token_abc",
      expiresAt: Date.now() + 900_000, // 15 min
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits valid contact data and returns 201", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({}), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
    );

    const result = await coreContactSubmit(mockConfig, testData);
    expect(result.status).toBe(201);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://app.heybackend.com/api/test_site_123/contact",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("includes all fields in request body", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({}), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
    );

    await coreContactSubmit(mockConfig, testData);

    const fetchMock = vi.mocked(global.fetch);
    const callArg = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(callArg.body as string);

    expect(body.name).toBe("John Doe");
    expect(body.email).toBe("john@example.com");
    expect(body.message).toBe("Test message");
    expect(body.company).toBe("Acme Inc");
    expect(body.phone).toBe("+1234567890");
    expect(body.__hp).toBe("");
    expect(body.token).toBe("mock_token_abc");
  });

  it("omits optional fields when not provided", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({}), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
    );

    const minimalData = {
      name: "Jane",
      email: "jane@example.com",
      message: "Hello",
    };

    await coreContactSubmit(mockConfig, minimalData);

    const fetchMock = vi.mocked(global.fetch);
    const callArg = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(callArg.body as string);

    expect(body.name).toBe("Jane");
    expect(body.email).toBe("jane@example.com");
    expect(body.message).toBe("Hello");
    expect(body.company).toBeUndefined();
    expect(body.phone).toBeUndefined();
  });

  it("throws VALIDATION_ERROR on 400 response", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "Invalid email" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );

    await expect(coreContactSubmit(mockConfig, testData)).rejects.toThrow(HbError);
    try {
      await coreContactSubmit(mockConfig, testData);
    } catch (err) {
      expect((err as HbError).code).toBe("VALIDATION_ERROR");
      expect((err as HbError).status).toBe(400);
    }
  });

  it("throws RATE_LIMITED on 429 response", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "Rate limit exceeded" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
    );

    try {
      await coreContactSubmit(mockConfig, testData);
    } catch (err) {
      expect((err as HbError).code).toBe("RATE_LIMITED");
      expect((err as HbError).status).toBe(429);
    }
  });

  it("clears token cache on 401 and does not retry", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
    );

    try {
      await coreContactSubmit(mockConfig, testData);
    } catch (err) {
      expect((err as HbError).code).toBe("TOKEN_ERROR");
      expect((err as HbError).status).toBe(401);
    }
  });

  it("retries once on network error after 2s delay", async () => {
    let callCount = 0;
    global.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Network error");
      }
      return new Response(JSON.stringify({}), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    vi.useFakeTimers();
    const promise = coreContactSubmit(mockConfig, testData);
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;
    vi.useRealTimers();

    expect(result.status).toBe(201);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("retries once on TOKEN_ERROR after 2s delay", async () => {
    let callCount = 0;
    global.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(JSON.stringify({ message: "Token expired" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    vi.useFakeTimers();
    const promise = coreContactSubmit(mockConfig, testData);
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;
    vi.useRealTimers();

    expect(result.status).toBe(201);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry on VALIDATION_ERROR (400)", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "Missing field" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );

    try {
      await coreContactSubmit(mockConfig, testData);
    } catch (err) {
      expect((err as HbError).code).toBe("VALIDATION_ERROR");
    }

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry on RATE_LIMITED (429)", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "Too many requests" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
    );

    try {
      await coreContactSubmit(mockConfig, testData);
    } catch (err) {
      expect((err as HbError).code).toBe("RATE_LIMITED");
    }

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("parses array message from error response", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: ["Field 1 error", "Field 2 error"] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );

    try {
      await coreContactSubmit(mockConfig, testData);
    } catch (err) {
      expect((err as HbError).message).toBe("Field 1 error; Field 2 error");
    }
  });

  it("throws TOKEN_ERROR when fetchToken fails", async () => {
    vi.mocked(signing.fetchToken).mockRejectedValue(new Error("Token fetch failed"));

    try {
      await coreContactSubmit(mockConfig, testData);
    } catch (err) {
      expect((err as HbError).code).toBe("TOKEN_ERROR");
      expect((err as HbError).message).toBe("Failed to obtain contact token");
    }
  });
});
