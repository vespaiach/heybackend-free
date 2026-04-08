import type { Tenant, TenantWithWebsites, UpsertTenantInput } from "@/lib/domain/types";

export interface TenantService {
  /**
   * Returns the tenant (with websites ordered by createdAt desc) for a given
   * auth user, or null if no tenant exists yet (→ redirect to /onboarding).
   */
  getTenantWithWebsitesByUserId(userId: string): Promise<TenantWithWebsites | null>;

  /**
   * Returns only the tenant row (no relations).
   * Used by the onboarding page to check existence before rendering the form.
   */
  getTenantByUserId(userId: string): Promise<Tenant | null>;

  /**
   * Returns just the tenant ID.
   * Consolidated replacement for the duplicated getTenantId() helpers in
   * websites/actions.ts and subscribers/actions.ts.
   * Throws an error if no tenant is found for the given userId.
   */
  getTenantIdByUserId(userId: string): Promise<string>;

  /**
   * Upsert the tenant record and sync User.name.
   */
  upsertTenant(input: UpsertTenantInput): Promise<Tenant>;
}
