// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

const mockTenantService = {
  getTenantIdByUserId: vi.fn(),
};

const mockContactRequestService = {
  markContactAsRead: vi.fn(),
};

vi.mock("@/lib/domain", () => ({
  tenantService: mockTenantService,
  contactRequestService: mockContactRequestService,
}));

const { markContactAsRead } = await import("../actions");

describe("Contact List Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("markContactAsRead", () => {
    const testUserId = "user-123";
    const testTenantId = "tenant-123";
    const testContactId = "contact-123";

    it("marks contact as read for authorized user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: testUserId },
      });

      mockTenantService.getTenantIdByUserId.mockResolvedValue(testTenantId);
      mockContactRequestService.markContactAsRead.mockResolvedValue(undefined);

      const result = await markContactAsRead(testContactId);

      expect(result.error).toBeUndefined();
      expect(mockTenantService.getTenantIdByUserId).toHaveBeenCalledWith(testUserId);
      expect(mockContactRequestService.markContactAsRead).toHaveBeenCalledWith(testContactId, testTenantId);
    });

    it("returns error if user not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await markContactAsRead(testContactId);

      expect(result.error).toBe("Unauthorized");
      expect(mockTenantService.getTenantIdByUserId).not.toHaveBeenCalled();
    });

    it("returns error if tenant not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: testUserId },
      });

      mockTenantService.getTenantIdByUserId.mockResolvedValue(null);

      const result = await markContactAsRead(testContactId);

      expect(result.error).toBe("Tenant not found");
      expect(mockContactRequestService.markContactAsRead).not.toHaveBeenCalled();
    });

    it("returns error if service throws", async () => {
      mockAuth.mockResolvedValue({
        user: { id: testUserId },
      });

      mockTenantService.getTenantIdByUserId.mockResolvedValue(testTenantId);
      mockContactRequestService.markContactAsRead.mockRejectedValue(new Error("Contact not found"));

      const result = await markContactAsRead(testContactId);

      expect(result.error).toBe("Failed to mark contact as read");
    });
  });
});
