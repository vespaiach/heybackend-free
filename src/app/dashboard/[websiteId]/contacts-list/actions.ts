"use server";

import { auth } from "@/auth";
import { contactRequestService, tenantService } from "@/lib/domain";
import type { ContactRequest } from "@/lib/domain/types";
import { logger } from "@/lib/logger";

export async function markContactAsRead(contactRequestId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id);
    if (!tenantId) return { error: "Tenant not found" };

    await contactRequestService.markContactAsRead(contactRequestId, tenantId);
    return {};
  } catch (e) {
    logger.error("markContactAsRead", e);
    return { error: "Failed to mark contact as read" };
  }
}

export async function exportContacts(filter: {
  websiteId: string;
  q?: string;
  country?: string;
  readStatus?: "all" | "read" | "unread";
  sortField?: "name" | "email" | "country" | "createdAt";
  sortDir?: "asc" | "desc";
}): Promise<{ contacts: ContactRequest[] } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);
    if (!tenant) return { error: "Tenant not found" };
    const website = tenant.websites.find((w) => w.id === filter.websiteId);
    if (!website) return { error: "Website not found" };

    const result = await contactRequestService.listContactRequests({
      ...filter,
      pageSize: 10000, // Fetch all contacts
    });
    return { contacts: result.contactRequests };
  } catch (e) {
    logger.error("exportContacts", e);
    return { error: "Failed to export contacts" };
  }
}
