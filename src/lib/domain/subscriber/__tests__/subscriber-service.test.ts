// @vitest-environment node

// Hoist mock variables before vi.mock() calls
const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockSubscriberFindUnique = vi.hoisted(() => vi.fn());
const mockSubscriberUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscriptionRequest: {
      create: mockCreate,
      update: mockUpdate,
    },
    subscriber: {
      findUnique: mockSubscriberFindUnique,
      update: mockSubscriberUpdate,
    },
  },
}));

import { PrismaSubscriberService } from "../subscriber-service";

const service = new PrismaSubscriberService();

// ─── Shared mock return value factory ─────────────────────────────────────────

function mockRequestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "req_1",
    email: "alice@example.com",
    websiteId: "site_1",
    type: "SUBSCRIBE",
    status: "ACCEPTED",
    rejectionReason: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    country: null,
    region: null,
    city: null,
    area: null,
    timezone: null,
    platform: null,
    browser: null,
    deviceType: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── logRequest() ─────────────────────────────────────────────────────────────

describe("logRequest()", () => {
  it("creates a SubscriptionRequest record with correct fields", async () => {
    mockCreate.mockResolvedValue(mockRequestRow());

    const result = await service.logRequest({
      email: "alice@example.com",
      websiteId: "site_1",
      type: "SUBSCRIBE",
      status: "ACCEPTED",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: { email: "alice@example.com", websiteId: "site_1", type: "SUBSCRIBE", status: "ACCEPTED" },
    });
    expect(result.id).toBe("req_1");
    expect(result.rejectionReason).toBeNull();
  });

  it("includes rejectionReason in data when provided", async () => {
    mockCreate.mockResolvedValue(mockRequestRow({ status: "REJECTED", rejectionReason: "RATE_LIMIT_IP" }));

    await service.logRequest({
      email: "",
      websiteId: "site_1",
      type: "SUBSCRIBE",
      status: "REJECTED",
      rejectionReason: "RATE_LIMIT_IP",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        email: "",
        websiteId: "site_1",
        type: "SUBSCRIBE",
        status: "REJECTED",
        rejectionReason: "RATE_LIMIT_IP",
      },
    });
  });

  it("omits rejectionReason key from data when not provided", async () => {
    mockCreate.mockResolvedValue(mockRequestRow());

    await service.logRequest({
      email: "a@b.com",
      websiteId: "site_1",
      type: "SUBSCRIBE",
      status: "ACCEPTED",
    });

    const callArg = mockCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect("rejectionReason" in callArg.data).toBe(false);
  });

  it("maps all returned fields to the SubscriptionRequest interface", async () => {
    const now = new Date("2026-01-01");
    mockCreate.mockResolvedValue(mockRequestRow({ createdAt: now, country: "US", platform: "macOS" }));

    const result = await service.logRequest({
      email: "alice@example.com",
      websiteId: "site_1",
      type: "SUBSCRIBE",
      status: "ACCEPTED",
    });

    expect(result).toEqual({
      id: "req_1",
      email: "alice@example.com",
      websiteId: "site_1",
      type: "SUBSCRIBE",
      status: "ACCEPTED",
      rejectionReason: null,
      createdAt: now,
      country: "US",
      region: null,
      city: null,
      area: null,
      timezone: null,
      platform: "macOS",
      browser: null,
      deviceType: null,
    });
  });
});

// ─── enrichRequest() ──────────────────────────────────────────────────────────

describe("enrichRequest()", () => {
  it("calls prisma update with the given id and all enrichment fields", async () => {
    mockUpdate.mockResolvedValue({});

    await service.enrichRequest("req_1", {
      country: "US",
      region: "CA",
      city: "San Francisco",
      area: null,
      timezone: "America/Los_Angeles",
      browser: "Chrome",
      deviceType: "desktop",
      platform: "macOS",
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "req_1" },
      data: {
        country: "US",
        region: "CA",
        city: "San Francisco",
        area: null,
        timezone: "America/Los_Angeles",
        browser: "Chrome",
        deviceType: "desktop",
        platform: "macOS",
      },
    });
  });

  it("writes null values as-is (does not filter them out)", async () => {
    mockUpdate.mockResolvedValue({});

    await service.enrichRequest("req_1", {
      country: null,
      region: null,
      city: null,
      area: null,
      timezone: null,
      browser: null,
      deviceType: null,
      platform: null,
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "req_1" },
      data: {
        country: null,
        region: null,
        city: null,
        area: null,
        timezone: null,
        browser: null,
        deviceType: null,
        platform: null,
      },
    });
  });
});

// ─── unsubscribeByEmail() ─────────────────────────────────────────────────────

describe("unsubscribeByEmail()", () => {
  it("returns false when the subscriber is not found", async () => {
    mockSubscriberFindUnique.mockResolvedValue(null);

    const result = await service.unsubscribeByEmail("nobody@example.com", "site_1");

    expect(result).toBe(false);
    expect(mockSubscriberUpdate).not.toHaveBeenCalled();
  });

  it("returns true and updates unsubscribedAt when subscriber exists", async () => {
    mockSubscriberFindUnique.mockResolvedValue({ id: "sub_1" });
    mockSubscriberUpdate.mockResolvedValue({});

    const before = new Date();
    const result = await service.unsubscribeByEmail("alice@example.com", "site_1");
    const after = new Date();

    expect(result).toBe(true);
    expect(mockSubscriberFindUnique).toHaveBeenCalledWith({
      where: { email_websiteId: { email: "alice@example.com", websiteId: "site_1" } },
      select: { id: true },
    });
    expect(mockSubscriberUpdate).toHaveBeenCalledWith({
      where: { id: "sub_1" },
      data: { unsubscribedAt: expect.any(Date) },
    });
    const updatedAt: Date = mockSubscriberUpdate.mock.calls[0]![0].data.unsubscribedAt;
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("returns true (idempotent) when subscriber is already unsubscribed", async () => {
    // findUnique returns the subscriber regardless of its unsubscribedAt state
    mockSubscriberFindUnique.mockResolvedValue({ id: "sub_1" });
    mockSubscriberUpdate.mockResolvedValue({});

    const result = await service.unsubscribeByEmail("alice@example.com", "site_1");

    expect(result).toBe(true);
    expect(mockSubscriberUpdate).toHaveBeenCalledTimes(1);
  });
});
