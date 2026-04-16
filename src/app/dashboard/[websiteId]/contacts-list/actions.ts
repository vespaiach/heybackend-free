"use server";

import { auth } from "@/auth";
import { contactRequestService, tenantService } from "@/lib/domain";
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
