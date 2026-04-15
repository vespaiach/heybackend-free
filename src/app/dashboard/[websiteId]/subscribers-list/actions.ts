"use server";

import { auth } from "@/auth";
import { subscriberService, tenantService } from "@/lib/domain";
import type { Subscriber, SubscriberMetadata } from "@/lib/domain/types";
import { logger } from "@/lib/logger";

export async function unsubscribeSubscriber(id: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id);
    const ok = await subscriberService.unsubscribeSubscriber(id, tenantId);
    if (!ok) return { error: "Subscriber not found" };
    return {};
  } catch (e) {
    logger.error("unsubscribeSubscriber", e);
    return { error: "Failed to unsubscribe subscriber" };
  }
}

export async function addTagToSubscriber(
  subscriberId: string,
  tagName: string,
): Promise<
  { tag: { id: string; name: string; color: string | null; description: string | null } } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id);
    const tag = await subscriberService.addTagToSubscriber(subscriberId, tagName, tenantId);
    if (!tag) return { error: "Subscriber not found" };
    return { tag };
  } catch (e) {
    logger.error("addTagToSubscriber", e);
    return { error: "Failed to add tag" };
  }
}

export async function removeTagFromSubscriber(
  subscriberId: string,
  tagId: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id);
    const ok = await subscriberService.removeTagFromSubscriber(subscriberId, tagId, tenantId);
    if (!ok) return { error: "Subscriber not found" };
    return {};
  } catch (e) {
    logger.error("removeTagFromSubscriber", e);
    return { error: "Failed to remove tag" };
  }
}

export async function resubscribeSubscriber(id: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id);
    const ok = await subscriberService.resubscribeSubscriber(id, tenantId);
    if (!ok) return { error: "Subscriber not found" };
    return {};
  } catch (e) {
    logger.error("resubscribeSubscriber", e);
    return { error: "Failed to resubscribe subscriber" };
  }
}

export async function bulkResubscribeSubscribers(
  subscriberIds: string[],
): Promise<{ count: number } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id);
    return await subscriberService.bulkResubscribe(subscriberIds, tenantId);
  } catch (e) {
    logger.error("bulkResubscribeSubscribers", e);
    return { error: "Failed to bulk resubscribe" };
  }
}

export async function bulkUnsubscribeSubscribers(
  subscriberIds: string[],
): Promise<{ count: number } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id);
    return await subscriberService.bulkUnsubscribe(subscriberIds, tenantId);
  } catch (e) {
    logger.error("bulkUnsubscribeSubscribers", e);
    return { error: "Failed to bulk unsubscribe" };
  }
}

export async function bulkAddTag(
  subscriberIds: string[],
  tagName: string,
): Promise<{ count: number } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id);
    const result = await subscriberService.bulkAddTag(subscriberIds, tagName, tenantId);
    if (result.count === 0) return { error: "No valid subscribers found" };
    return result;
  } catch (e) {
    logger.error("bulkAddTag", e);
    return { error: "Failed to bulk add tag" };
  }
}

export async function bulkRemoveTag(
  subscriberIds: string[],
  tagId: string,
): Promise<{ count: number } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id);
    return await subscriberService.bulkRemoveTag(subscriberIds, tagId, tenantId);
  } catch (e) {
    logger.error("bulkRemoveTag", e);
    return { error: "Failed to bulk remove tag" };
  }
}

export async function exportSubscribers(filter: {
  websiteId: string;
  q?: string;
  status?: "all" | "active" | "unsubscribed";
  sortField?: "firstName" | "lastName" | "createdAt";
  sortDir?: "asc" | "desc";
  tags?: string[];
}): Promise<{ subscribers: Subscriber[] } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);
    if (!tenant) return { error: "Tenant not found" };
    const website = tenant.websites.find((w) => w.id === filter.websiteId);
    if (!website) return { error: "Website not found" };

    const subscribers = await subscriberService.exportSubscribers(filter);
    return { subscribers };
  } catch (e) {
    logger.error("exportSubscribers", e);
    return { error: "Failed to export subscribers" };
  }
}

export async function updateSubscriberMetadata(
  subscriberId: string,
  metadata: SubscriberMetadata,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id);
    const result = await subscriberService.updateSubscriberMetadata(subscriberId, tenantId, { metadata });
    if (!result) return { error: "Subscriber not found" };
    return {};
  } catch (e) {
    logger.error("updateSubscriberMetadata", e);
    return { error: "Failed to update subscriber data" };
  }
}
