import { beforeEach, describe, expect, it, vi } from "vitest";

import { contactRequestService } from "@/lib/domain";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contactRequest: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    website: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("ContactRequestService", () => {
  const testWebsiteId = "website_test_123";
  const testTenantId = "tenant_test_123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createContactRequest", () => {
    it("should create a contact request with required fields", async () => {
      const input = {
        websiteId: testWebsiteId,
        email: "john@example.com",
        name: "John Doe",
        message: "I have a question",
      };

      vi.mocked(prisma.contactRequest.create).mockResolvedValue({
        id: "contact_123",
        websiteId: testWebsiteId,
        email: "john@example.com",
        name: "John Doe",
        message: "I have a question",
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

      const result = await contactRequestService.createContactRequest(input);

      expect(result).toBeDefined();
      expect(result.id).toBe("contact_123");
      expect(result.websiteId).toBe(testWebsiteId);
      expect(result.email).toBe("john@example.com");
      expect(result.name).toBe("John Doe");
      expect(result.message).toBe("I have a question");
      expect(result.company).toBeNull();
      expect(result.phone).toBeNull();
    });

    it("should create a contact request with optional company field", async () => {
      const input = {
        websiteId: testWebsiteId,
        email: "jane@example.com",
        name: "Jane Smith",
        company: "Tech Corp",
        message: "Interested in your service",
      };

      vi.mocked(prisma.contactRequest.create).mockResolvedValue({
        id: "contact_124",
        websiteId: testWebsiteId,
        email: "jane@example.com",
        name: "Jane Smith",
        company: "Tech Corp",
        message: "Interested in your service",
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

      const result = await contactRequestService.createContactRequest(input);

      expect(result.company).toBe("Tech Corp");
      expect(result.email).toBe("jane@example.com");
    });

    it("should create a contact request with optional phone field", async () => {
      const input = {
        websiteId: testWebsiteId,
        email: "bob@example.com",
        name: "Bob Johnson",
        phone: "+1234567890",
        message: "Call me back",
      };

      vi.mocked(prisma.contactRequest.create).mockResolvedValue({
        id: "contact_125",
        websiteId: testWebsiteId,
        email: "bob@example.com",
        name: "Bob Johnson",
        phone: "+1234567890",
        message: "Call me back",
        company: null,
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

      const result = await contactRequestService.createContactRequest(input);

      expect(result.phone).toBe("+1234567890");
    });

    it("should create a contact request with metadata", async () => {
      const input = {
        websiteId: testWebsiteId,
        email: "alice@example.com",
        name: "Alice Brown",
        message: "Custom data",
        metadata: {
          source: "referral",
          budget: "5000",
        },
      };

      vi.mocked(prisma.contactRequest.create).mockResolvedValue({
        id: "contact_126",
        websiteId: testWebsiteId,
        email: "alice@example.com",
        name: "Alice Brown",
        message: "Custom data",
        company: null,
        phone: null,
        metadata: {
          source: "referral",
          budget: "5000",
        },
        country: null,
        region: null,
        city: null,
        timezone: null,
        os: null,
        deviceType: null,
        browser: null,
        createdAt: new Date(),
      } as any);

      const result = await contactRequestService.createContactRequest(input);

      expect(result.metadata).toEqual({
        source: "referral",
        budget: "5000",
      });
    });
  });

  describe("enrichContactRequest", () => {
    it("should update enrichment fields on a contact request", async () => {
      const enrichmentData = {
        country: "United States",
        region: "California",
        city: "San Francisco",
        timezone: "America/Los_Angeles",
        os: "macOS",
        browser: "Chrome",
        deviceType: "Desktop",
      };

      vi.mocked(prisma.contactRequest.update).mockResolvedValue({
        id: "contact_123",
        websiteId: testWebsiteId,
        email: "enrich@example.com",
        name: "Enrichment Test",
        message: "Testing enrichment",
        company: null,
        phone: null,
        metadata: null,
        country: "United States",
        region: "California",
        city: "San Francisco",
        timezone: "America/Los_Angeles",
        os: "macOS",
        deviceType: "Desktop",
        browser: "Chrome",
        createdAt: new Date(),
      } as any);

      await contactRequestService.enrichContactRequest("contact_123", enrichmentData);

      expect(prisma.contactRequest.update).toHaveBeenCalled();
    });

    it("should handle partial enrichment data", async () => {
      const enrichmentData = {
        country: "Canada",
        city: "Toronto",
      };

      vi.mocked(prisma.contactRequest.update).mockResolvedValue({
        id: "contact_124",
        websiteId: testWebsiteId,
        email: "partial@example.com",
        name: "Partial Enrichment",
        message: "Testing partial enrichment",
        company: null,
        phone: null,
        metadata: null,
        country: "Canada",
        region: null,
        city: "Toronto",
        timezone: null,
        os: null,
        deviceType: null,
        browser: null,
        createdAt: new Date(),
      } as any);

      await contactRequestService.enrichContactRequest("contact_124", enrichmentData);

      expect(prisma.contactRequest.update).toHaveBeenCalled();
    });
  });

  describe("listContactRequests", () => {
    it("should list all contact requests for a website", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([
        {
          id: "contact_1",
          websiteId: testWebsiteId,
          email: "user1@example.com",
          name: "User One",
          message: "Message 1",
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
        },
        {
          id: "contact_2",
          websiteId: testWebsiteId,
          email: "user2@example.com",
          name: "User Two",
          message: "Message 2",
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
        },
      ] as any);

      vi.mocked(prisma.contactRequest.count).mockResolvedValue(2 as any);

      const result = await contactRequestService.listContactRequests({
        websiteId: testWebsiteId,
      });

      expect(result.contactRequests).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should paginate contact requests", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([
        {
          id: "contact_1",
          websiteId: testWebsiteId,
          email: "user1@example.com",
          name: "User 1",
          message: "Message 1",
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
        },
        {
          id: "contact_2",
          websiteId: testWebsiteId,
          email: "user2@example.com",
          name: "User 2",
          message: "Message 2",
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
        },
      ] as any);

      vi.mocked(prisma.contactRequest.count).mockResolvedValue(5 as any);

      const result = await contactRequestService.listContactRequests({
        websiteId: testWebsiteId,
        page: 1,
        pageSize: 2,
      });

      expect(result.contactRequests).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it("should sort contact requests by name", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([
        {
          id: "contact_1",
          websiteId: testWebsiteId,
          email: "apple@example.com",
          name: "Apple User",
          message: "A message",
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
        },
        {
          id: "contact_2",
          websiteId: testWebsiteId,
          email: "zebra@example.com",
          name: "Zebra User",
          message: "Z message",
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
        },
      ] as any);

      vi.mocked(prisma.contactRequest.count).mockResolvedValue(2 as any);

      const result = await contactRequestService.listContactRequests({
        websiteId: testWebsiteId,
        sortField: "name",
        sortDir: "asc",
      });

      expect(result.contactRequests).toHaveLength(2);
      expect(result.contactRequests[0].name).toBe("Apple User");
      expect(result.contactRequests[1].name).toBe("Zebra User");
    });

    it("should filter by search query", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([
        {
          id: "contact_1",
          websiteId: testWebsiteId,
          email: "john@example.com",
          name: "John Developer",
          message: "I'm a developer",
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
        },
      ] as any);

      vi.mocked(prisma.contactRequest.count).mockResolvedValue(1 as any);

      const result = await contactRequestService.listContactRequests({
        websiteId: testWebsiteId,
        q: "developer",
      });

      expect(result.contactRequests).toHaveLength(1);
      expect(result.contactRequests[0].name).toBe("John Developer");
    });
  });

  describe("getContactRequest", () => {
    it("should get a contact request by ID", async () => {
      vi.mocked(prisma.contactRequest.findUnique).mockResolvedValue({
        id: "contact_123",
        websiteId: testWebsiteId,
        email: "get@example.com",
        name: "Get Test",
        message: "Testing get",
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
        website: {
          id: testWebsiteId,
          tenant: {
            id: testTenantId,
          },
        },
      } as any);

      const result = await contactRequestService.getContactRequest("contact_123", testTenantId);

      expect(result).toBeDefined();
      expect(result?.id).toBe("contact_123");
      expect(result?.email).toBe("get@example.com");
    });

    it("should return null for non-existent contact request", async () => {
      vi.mocked(prisma.contactRequest.findUnique).mockResolvedValue(null);

      const result = await contactRequestService.getContactRequest("nonexistent_id", testTenantId);

      expect(result).toBeNull();
    });

    it("should return null if tenant ownership check fails", async () => {
      vi.mocked(prisma.contactRequest.findUnique).mockResolvedValue({
        id: "contact_123",
        websiteId: testWebsiteId,
        email: "ownership@example.com",
        name: "Ownership Test",
        message: "Testing ownership",
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
        website: {
          id: testWebsiteId,
          tenant: {
            id: "different_tenant_id",
          },
        },
      } as any);

      const result = await contactRequestService.getContactRequest("contact_123", testTenantId);

      expect(result).toBeNull();
    });
  });

  describe("markContactAsRead", () => {
    it("sets readAt to current timestamp", async () => {
      vi.mocked(prisma.contactRequest.updateMany).mockResolvedValue({ count: 1 });

      await contactRequestService.markContactAsRead("contact_123", testTenantId);

      expect(prisma.contactRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "contact_123" }),
          data: expect.objectContaining({ readAt: expect.any(Date) }),
        }),
      );
    });

    it("throws if contact does not belong to tenant", async () => {
      vi.mocked(prisma.contactRequest.updateMany).mockResolvedValue({ count: 0 });

      await expect(contactRequestService.markContactAsRead("contact_123", testTenantId)).rejects.toThrow(
        /Contact not found or access denied/,
      );
    });

    it("throws if contact not found", async () => {
      vi.mocked(prisma.contactRequest.updateMany).mockResolvedValue({ count: 0 });

      await expect(contactRequestService.markContactAsRead("nonexistent-id", testTenantId)).rejects.toThrow(
        /Contact not found or access denied/,
      );
    });
  });

  describe("listContactRequests", () => {
    it("returns only unread contacts when readStatus=unread", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([
        {
          id: "unread_1",
          websiteId: testWebsiteId,
          email: "unread@example.com",
          name: "Unread Contact",
          message: "Message",
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
          readAt: null,
          createdAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.contactRequest.count).mockResolvedValue(1 as any);

      const result = await contactRequestService.listContactRequests({
        websiteId: testWebsiteId,
        readStatus: "unread",
      });

      expect(result.contactRequests).toHaveLength(1);
      expect(result.contactRequests[0].email).toBe("unread@example.com");

      const findManyCall = vi.mocked(prisma.contactRequest.findMany).mock.calls[0]?.[0];
      expect(findManyCall?.where).toMatchObject({ readAt: null });

      const countCall = vi.mocked(prisma.contactRequest.count).mock.calls[0]?.[0];
      expect(countCall?.where).toMatchObject({ readAt: null });
    });

    it("returns only read contacts when readStatus=read", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([
        {
          id: "read_1",
          websiteId: testWebsiteId,
          email: "read@example.com",
          name: "Read Contact",
          message: "Message",
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
          readAt: new Date("2026-04-15"),
          createdAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.contactRequest.count).mockResolvedValue(1 as any);

      const result = await contactRequestService.listContactRequests({
        websiteId: testWebsiteId,
        readStatus: "read",
      });

      expect(result.contactRequests).toHaveLength(1);
      expect(result.contactRequests[0].email).toBe("read@example.com");

      const findManyCall = vi.mocked(prisma.contactRequest.findMany).mock.calls[0]?.[0];
      expect(findManyCall?.where).toMatchObject({ readAt: { not: null } });

      const countCall = vi.mocked(prisma.contactRequest.count).mock.calls[0]?.[0];
      expect(countCall?.where).toMatchObject({ readAt: { not: null } });
    });

    it("returns all contacts when readStatus=all", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([
        {
          id: "unread_1",
          websiteId: testWebsiteId,
          email: "unread@example.com",
          name: "Unread Contact",
          message: "Message",
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
          readAt: null,
          createdAt: new Date(),
        },
        {
          id: "read_1",
          websiteId: testWebsiteId,
          email: "read@example.com",
          name: "Read Contact",
          message: "Message",
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
          readAt: new Date("2026-04-15"),
          createdAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.contactRequest.count).mockResolvedValue(2 as any);

      const result = await contactRequestService.listContactRequests({
        websiteId: testWebsiteId,
        readStatus: "all",
      });

      expect(result.contactRequests).toHaveLength(2);

      const findManyCall = vi.mocked(prisma.contactRequest.findMany).mock.calls[0]?.[0];
      expect(findManyCall?.where).not.toHaveProperty("readAt");

      const countCall = vi.mocked(prisma.contactRequest.count).mock.calls[0]?.[0];
      expect(countCall?.where).not.toHaveProperty("readAt");
    });
  });

  describe("getContactAnalytics", () => {
    const websiteId = "site_1";

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns zero stats when there are no contacts", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await contactRequestService.getContactAnalytics(websiteId);

      expect(result.total).toBe(0);
      expect(result.read).toBe(0);
      expect(result.unread).toBe(0);
      expect(result.momChange).toBeNull();
      expect(result.monthlyTrend).toHaveLength(12);
      expect(result.monthlyTrend.every((m) => m.count === 0)).toBe(true);
      expect(result.dailyActivity).toEqual([]);
      expect(result.companyBreakdown).toEqual([]);
    });

    it("counts read/unread correctly", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.count)
        .mockResolvedValueOnce(3) // total
        .mockResolvedValueOnce(1); // readCount

      const result = await contactRequestService.getContactAnalytics(websiteId);

      expect(result.total).toBe(3);
      expect(result.read).toBe(1);
      expect(result.unread).toBe(2);
    });

    it("builds dailyActivity correctly", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([
        { createdAt: new Date(2024, 3, 1, 10, 0, 0), readAt: null },
        { createdAt: new Date(2024, 3, 1, 15, 0, 0), readAt: null },
        { createdAt: new Date(2024, 3, 3, 8, 0, 0), readAt: null },
      ] as any);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await contactRequestService.getContactAnalytics(websiteId);

      const day1 = result.dailyActivity.find((d) => d.date === "2024-04-01");
      const day3 = result.dailyActivity.find((d) => d.date === "2024-04-03");
      expect(day1?.count).toBe(2);
      expect(day3?.count).toBe(1);
    });

    it("builds monthlyTrend with 12 entries, recent months have correct counts", async () => {
      const now = new Date();
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 10);
      const currMonthDate = new Date(now.getFullYear(), now.getMonth(), 5);
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([
        { createdAt: prevMonthDate, readAt: null },
        { createdAt: currMonthDate, readAt: null },
        { createdAt: currMonthDate, readAt: null },
      ] as any);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await contactRequestService.getContactAnalytics(websiteId);

      expect(result.monthlyTrend).toHaveLength(12);
      const prevKey = prevMonthDate.toISOString().slice(0, 7);
      const currKey = now.toISOString().slice(0, 7);
      expect(result.monthlyTrend.find((m) => m.month === prevKey)?.count).toBe(1);
      expect(result.monthlyTrend.find((m) => m.month === currKey)?.count).toBe(2);
    });

    it("calculates momChange as percentage", async () => {
      // 2 in previous month, 3 in current month → +50%
      const now = new Date();
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);

      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([
        { createdAt: prevDate, readAt: null },
        { createdAt: prevDate, readAt: null },
        { createdAt: now, readAt: null },
        { createdAt: now, readAt: null },
        { createdAt: now, readAt: null },
      ] as any);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await contactRequestService.getContactAnalytics(websiteId);

      expect(result.momChange).toBe(50);
    });

    it("returns null momChange when previous month has 0 contacts", async () => {
      const now = new Date();
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([{ createdAt: now, readAt: null }] as any);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await contactRequestService.getContactAnalytics(websiteId);

      expect(result.momChange).toBeNull();
    });

    it("builds companyBreakdown from groupBy result (top 8 + Others)", async () => {
      // 9 companies → top 8 + Others
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([
        { company: "Alpha", _count: { id: 10 } },
        { company: "Beta", _count: { id: 8 } },
        { company: "Gamma", _count: { id: 7 } },
        { company: "Delta", _count: { id: 6 } },
        { company: "Epsilon", _count: { id: 5 } },
        { company: "Zeta", _count: { id: 4 } },
        { company: "Eta", _count: { id: 3 } },
        { company: "Theta", _count: { id: 2 } },
        { company: "Iota", _count: { id: 1 } }, // 9th → Others
      ] as any);
      vi.mocked(prisma.contactRequest.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await contactRequestService.getContactAnalytics(websiteId);

      expect(result.companyBreakdown).toHaveLength(9); // 8 named + Others
      const others = result.companyBreakdown.find((c) => c.company === "Others");
      expect(others?.count).toBe(1);
      expect(result.companyBreakdown[0]).toEqual({ company: "Alpha", count: 10 });
    });

    it('maps null company to "Unknown"', async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([
        { company: null, _count: { id: 5 } },
        { company: "Acme", _count: { id: 3 } },
      ] as any);
      vi.mocked(prisma.contactRequest.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await contactRequestService.getContactAnalytics(websiteId);

      const unknown = result.companyBreakdown.find((c) => c.company === "Unknown");
      expect(unknown?.count).toBe(5);
    });

    it("monthlyTrend always has exactly 12 entries", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await contactRequestService.getContactAnalytics(websiteId);

      expect(result.monthlyTrend).toHaveLength(12);
    });

    it("keeps Unknown separate from Others in company breakdown", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([]);
      // 9 named + 1 null → top 8 named + Others (1 named) + Unknown (null)
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([
        { company: "Alpha", _count: { id: 10 } },
        { company: "Beta", _count: { id: 9 } },
        { company: "Gamma", _count: { id: 8 } },
        { company: "Delta", _count: { id: 7 } },
        { company: "Epsilon", _count: { id: 6 } },
        { company: "Zeta", _count: { id: 5 } },
        { company: "Eta", _count: { id: 4 } },
        { company: "Theta", _count: { id: 3 } },
        { company: "Iota", _count: { id: 2 } }, // 9th named → Others
        { company: null, _count: { id: 7 } }, // null → Unknown (separate)
      ] as any);
      vi.mocked(prisma.contactRequest.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await contactRequestService.getContactAnalytics(websiteId);

      const others = result.companyBreakdown.find((c) => c.company === "Others");
      const unknown = result.companyBreakdown.find((c) => c.company === "Unknown");
      expect(others?.count).toBe(2); // Iota only
      expect(unknown?.count).toBe(7); // null entry
      expect(
        result.companyBreakdown.filter((c) => c.company !== "Others" && c.company !== "Unknown"),
      ).toHaveLength(8);
    });

    it("omits Unknown and Others when their counts are 0", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([]);
      // Exactly 3 named, no null
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([
        { company: "Alpha", _count: { id: 5 } },
        { company: "Beta", _count: { id: 3 } },
        { company: "Gamma", _count: { id: 1 } },
      ] as any);
      vi.mocked(prisma.contactRequest.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await contactRequestService.getContactAnalytics(websiteId);

      expect(result.companyBreakdown.find((c) => c.company === "Others")).toBeUndefined();
      expect(result.companyBreakdown.find((c) => c.company === "Unknown")).toBeUndefined();
      expect(result.companyBreakdown).toHaveLength(3);
    });
  });
});
