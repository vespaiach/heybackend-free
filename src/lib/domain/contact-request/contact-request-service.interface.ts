import type {
  ContactAnalytics,
  ContactRequest,
  ContactRequestEnrichment,
  CreateContactRequestInput,
  ListContactRequestsFilter,
  ListContactRequestsResult,
} from "@/lib/domain/types";

export interface ContactRequestService {
  /**
   * Create a new contact request from form submission.
   */
  createContactRequest(input: CreateContactRequestInput): Promise<ContactRequest>;

  /**
   * Enrich contact request with geo, device, and other metadata.
   * Called post-response via after() to avoid blocking the response.
   */
  enrichContactRequest(contactRequestId: string, data: ContactRequestEnrichment): Promise<void>;

  /**
   * Paginated, filtered contact request list for a website (dashboard).
   */
  listContactRequests(filter: ListContactRequestsFilter): Promise<ListContactRequestsResult>;

  /**
   * Get a single contact request, verifying ownership via tenantId.
   * Returns null if not found or ownership check fails.
   */
  getContactRequest(contactRequestId: string, tenantId: string): Promise<ContactRequest | null>;

  /**
   * Mark a contact as read by setting readAt to current timestamp.
   * Verifies ownership via tenantId.
   */
  markContactAsRead(contactRequestId: string, tenantId: string): Promise<void>;

  /**
   * Returns all-time analytics for a website's contact requests:
   * stat totals, daily activity heatmap, monthly trend + MoM change, company breakdown.
   */
  getContactAnalytics(websiteId: string): Promise<ContactAnalytics>;
}
