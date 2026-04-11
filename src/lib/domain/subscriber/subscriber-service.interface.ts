import type {
  AnalyticsRange,
  EnrichmentData,
  ListSubscribersFilter,
  ListSubscribersResult,
  Subscriber,
  SubscriberAnalytics,
  Tag,
  UpdateSubscriberMetadataInput,
  UpsertSubscriberInput,
} from "@/lib/domain/types";

export interface SubscriberService {
  /**
   * Paginated, filtered subscriber list for a website.
   */
  listSubscribers(filter: ListSubscribersFilter): Promise<ListSubscribersResult>;

  /**
   * Upsert a subscriber by email + websiteId (used by the public subscribe API).
   * First-touch semantics: existing non-null name fields are preserved.
   * Always clears unsubscribedAt (re-subscribe).
   */
  upsertSubscriber(input: UpsertSubscriberInput): Promise<{ subscriber: Subscriber; created: boolean }>;

  /**
   * Update geo/UA fields only where currently null (first-touch semantics).
   * Called post-response via after(). Safe to call concurrently.
   */
  enrichSubscriber(email: string, websiteId: string, data: EnrichmentData): Promise<void>;

  /**
   * Set unsubscribedAt = now, verifying that the subscriber belongs to the tenant.
   * Returns false when not found or ownership fails.
   */
  unsubscribeSubscriber(subscriberId: string, tenantId: string): Promise<boolean>;

  /**
   * Set unsubscribedAt = null, verifying ownership.
   * Returns false when not found or ownership fails.
   */
  resubscribeSubscriber(subscriberId: string, tenantId: string): Promise<boolean>;

  /**
   * Bulk set unsubscribedAt = now for all ids within the tenant.
   */
  bulkUnsubscribe(subscriberIds: string[], tenantId: string): Promise<{ count: number }>;

  /**
   * Bulk set unsubscribedAt = null for all ids within the tenant.
   */
  bulkResubscribe(subscriberIds: string[], tenantId: string): Promise<{ count: number }>;

  /**
   * Upsert tag by name on the subscriber's website, then attach it.
   * Verifies subscriber ownership via tenantId.
   * Returns the tag on success, null on ownership failure.
   */
  addTagToSubscriber(
    subscriberId: string,
    tagName: string,
    tenantId: string,
  ): Promise<Pick<Tag, "id" | "name" | "color" | "description"> | null>;

  /**
   * Remove a tag from a subscriber, verifying ownership.
   * Returns false when not found or ownership fails.
   */
  removeTagFromSubscriber(subscriberId: string, tagId: string, tenantId: string): Promise<boolean>;

  /**
   * Bulk upsert a tag by name across multiple subscribers (all under the tenant).
   */
  bulkAddTag(subscriberIds: string[], tagName: string, tenantId: string): Promise<{ count: number }>;

  /**
   * Returns all tags for a website, sorted by name.
   */
  getTagsForWebsite(websiteId: string): Promise<Pick<Tag, "id" | "name" | "color" | "description">[]>;

  /**
   * Export all subscribers matching the filter (no pagination).
   */
  exportSubscribers(filter: Omit<ListSubscribersFilter, "page" | "pageSize">): Promise<Subscriber[]>;

  /**
   * Aggregate analytics for a website over the given time range.
   */
  getAnalytics(websiteId: string, range: AnalyticsRange): Promise<SubscriberAnalytics>;

  /**
   * Set unsubscribedAt = now for a subscriber identified by email + websiteId.
   * Used by the public unsubscribe endpoint (no tenantId needed).
   * Returns false when subscriber not found. Idempotent: returns true even if already unsubscribed.
   */
  unsubscribeByEmail(email: string, websiteId: string): Promise<boolean>;

  /**
   * Update the metadata (custom fields + free-form bag) for a subscriber.
   * Verifies ownership via tenantId. Returns null on ownership failure.
   */
  updateSubscriberMetadata(
    subscriberId: string,
    tenantId: string,
    input: UpdateSubscriberMetadataInput,
  ): Promise<Subscriber | null>;
}
