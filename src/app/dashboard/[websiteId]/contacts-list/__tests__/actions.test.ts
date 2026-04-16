// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

const { markContactAsRead } = await import("../actions");

describe("Contact List Actions", () => {
  let testWebsiteId: string;
  let testTenantId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create test data
    const user = await prisma.user.create({
      data: {
        email: "test-" + Date.now() + "@example.com",
        emailVerified: new Date(),
      },
    });
    testUserId = user.id;

    const tenant = await prisma.tenant.create({
      data: {
        fullName: "Test Tenant",
        email: "tenant@example.com",
        userId: testUserId,
      },
    });
    testTenantId = tenant.id;

    const website = await prisma.website.create({
      data: {
        name: "Test Site",
        url: "https://test.com",
        key: "test-key-" + Date.now(),
        tenantId: testTenantId,
      },
    });
    testWebsiteId = website.id;
  });

  afterEach(async () => {
    await prisma.contactRequest.deleteMany({ where: { websiteId: testWebsiteId } });
    await prisma.website.deleteMany({ where: { id: testWebsiteId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  describe("markContactAsRead", () => {
    it("marks contact as read for authorized user", async () => {
      const contact = await prisma.contactRequest.create({
        data: {
          websiteId: testWebsiteId,
          email: "test@example.com",
          name: "John",
          message: "Hello",
          readAt: null,
        },
      });

      mockAuth.mockResolvedValue({
        user: { id: testUserId },
      });

      const result = await markContactAsRead(contact.id);

      expect(result.error).toBeUndefined();

      const updated = await prisma.contactRequest.findUnique({
        where: { id: contact.id },
      });
      expect(updated?.readAt).not.toBeNull();
    });
  });
});
