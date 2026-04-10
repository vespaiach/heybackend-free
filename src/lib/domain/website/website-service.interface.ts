import type {
  CreateWebsiteFieldInput,
  CreateWebsiteInput,
  UpdateWebsiteFieldInput,
  UpdateWebsiteInput,
  Website,
  WebsiteField,
  WebsiteForSubscribe,
} from "@/lib/domain/types";

export interface WebsiteService {
  /**
   * Looks up a website by its ID and verifies the provided API key matches.
   * The key comparison is performed inside the service — the raw key is never
   * returned to the caller.
   * Returns a minimal projection, or null when not found, inactive, or key mismatch.
   */
  getWebsiteByIdAndKey(id: string, key: string): Promise<WebsiteForSubscribe | null>;

  /**
   * Fetch minimal website data including the signing key.
   * Used exclusively by the public subscribe guard for HMAC verification.
   * Returns null when not found.
   */
  getWebsiteForSigning(
    id: string,
  ): Promise<{ id: string; url: string; isActive: boolean; key: string } | null>;

  /**
   * Looks up a website by ID only (no key check).
   * Returns a minimal projection, or null when not found.
   * The isActive flag is included so callers can reject inactive websites.
   */
  getWebsiteById(id: string): Promise<WebsiteForSubscribe | null>;

  /**
   * Creates a new website owned by the given tenant.
   */
  createWebsite(input: CreateWebsiteInput): Promise<Website>;

  /**
   * Updates name/url on a website, verifying ownership first.
   * If regenerateKey is true, replaces the API key with a new UUID.
   * Returns null when the website is not found or ownership fails.
   */
  updateWebsite(id: string, tenantId: string, input: UpdateWebsiteInput): Promise<Website | null>;

  /**
   * Sets isActive = false, verifying ownership first.
   * Returns false when the website is not found or ownership fails.
   */
  deactivateWebsite(id: string, tenantId: string): Promise<boolean>;

  /**
   * Returns all custom field definitions for a website, ordered by position.
   */
  getWebsiteFields(websiteId: string): Promise<WebsiteField[]>;

  /**
   * Creates a new custom field for a website, verifying tenant ownership.
   * Returns null on ownership failure.
   */
  createWebsiteField(tenantId: string, input: CreateWebsiteFieldInput): Promise<WebsiteField | null>;

  /**
   * Updates an existing field, verifying tenant ownership via websiteId.
   * Returns null when not found or ownership fails.
   */
  updateWebsiteField(
    fieldId: string,
    tenantId: string,
    input: UpdateWebsiteFieldInput,
  ): Promise<WebsiteField | null>;

  /**
   * Deletes a field, verifying tenant ownership.
   * Returns false when not found or ownership fails.
   */
  deleteWebsiteField(fieldId: string, tenantId: string): Promise<boolean>;
}
