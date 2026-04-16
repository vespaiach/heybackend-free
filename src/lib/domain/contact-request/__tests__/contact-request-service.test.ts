import { beforeEach, describe, expect, it, vi } from "vitest";

import { contactRequestService } from "@/lib/domain";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contactRequest: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
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
      const testDate = new Date();
      vi.mocked(prisma.contactRequest.findUnique).mockResolvedValue({
        id: "contact_123",
        websiteId: testWebsiteId,
        email: "test@example.com",
        name: "John Doe",
        message: "Hello",
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
        readAt: null,
        website: {
          id: testWebsiteId,
          tenant: {
            id: testTenantId,
          },
        },
      } as any);

      vi.mocked(prisma.contactRequest.update).mockResolvedValue({
        id: "contact_123",
        websiteId: testWebsiteId,
        email: "test@example.com",
        name: "John Doe",
        message: "Hello",
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
        readAt: testDate,
      } as any);

      await contactRequestService.markContactAsRead("contact_123", testTenantId);

      expect(prisma.contactRequest.update).toHaveBeenCalled();
      const updateCall = vi.mocked(prisma.contactRequest.update).mock.calls[0]?.[0];
      expect(updateCall?.where.id).toBe("contact_123");
      expect(updateCall?.data.readAt).not.toBeNull();
    });

    it("throws if contact does not belong to tenant", async () => {
      const otherTenantId = "tenant_other_123";

      vi.mocked(prisma.contactRequest.findUnique).mockResolvedValue({
        id: "contact_123",
        websiteId: testWebsiteId,
        email: "test@example.com",
        name: "John",
        message: "Hello",
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
        readAt: null,
        website: {
          id: testWebsiteId,
          tenant: {
            id: otherTenantId,
          },
        },
      } as any);

      await expect(contactRequestService.markContactAsRead("contact_123", testTenantId)).rejects.toThrow(
        /Contact not found or access denied/,
      );

      // Verify update was never called
      expect(prisma.contactRequest.update).not.toHaveBeenCalled();
    });

    it("throws if contact not found", async () => {
      vi.mocked(prisma.contactRequest.findUnique).mockResolvedValue(null);

      await expect(contactRequestService.markContactAsRead("nonexistent-id", testTenantId)).rejects.toThrow(
        /Contact not found/,
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
    });
  });
});
