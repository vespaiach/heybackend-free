// ─── Read models ─────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  createdAt: Date;
}

export interface Website {
  id: string;
  name: string;
  url: string;
  key: string;
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
}

export interface Tenant {
  id: string;
  fullName: string;
  email: string;
  userId: string;
  createdAt: Date;
}

export interface TenantWithWebsites extends Tenant {
  websites: Website[];
}

export type SubscriberMetadata = Record<string, string | number | boolean | null>;

export type ContactRequestMetadata = Record<string, string | number | boolean | null>;

export interface ContactRequest {
  id: string;
  websiteId: string;
  email: string;
  name: string;
  company: string | null;
  phone: string | null;
  message: string;
  metadata: ContactRequestMetadata | null;
  timezone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  os: string | null;
  deviceType: string | null;
  browser: string | null;
  createdAt: Date;
}

export interface ContactRequestEnrichment {
  timezone?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  os?: string | null;
  deviceType?: string | null;
  browser?: string | null;
}

export interface CreateContactRequestInput {
  websiteId: string;
  email: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  message: string;
  enrichment?: ContactRequestEnrichment;
  metadata?: ContactRequestMetadata;
}

export interface Subscriber {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  websiteId: string;
  createdAt: Date;
  unsubscribedAt: Date | null;
  timezone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  os: string | null;
  deviceType: string | null;
  browser: string | null;
  metadata: SubscriberMetadata | null;
  tags: Pick<Tag, "id" | "name" | "color" | "description">[];
}

export interface WebsiteForSubscribe {
  id: string;
  url: string;
  isActive: boolean;
}

export type WebsiteFieldType = "text" | "number" | "boolean" | "date";

export interface WebsiteField {
  id: string;
  websiteId: string;
  slug: string;
  label: string;
  type: WebsiteFieldType;
  required: boolean;
  position: number;
  createdAt: Date;
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface UpsertTenantInput {
  userId: string;
  email: string;
  fullName: string;
}

export interface CreateWebsiteInput {
  name: string;
  url: string;
  tenantId: string;
}

export interface UpdateWebsiteInput {
  name: string;
  url: string;
  regenerateKey?: boolean;
}

export interface UpsertSubscriberInput {
  email: string;
  firstName: string | null;
  lastName: string | null;
  websiteId: string;
}

export interface EnrichmentData {
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  browser: string | null;
  deviceType: string | null;
  os: string | null;
}

export interface UpdateSubscriberMetadataInput {
  metadata: SubscriberMetadata;
}

export interface CreateWebsiteFieldInput {
  websiteId: string;
  slug: string;
  label: string;
  type: WebsiteFieldType;
  required: boolean;
  position?: number;
}

export interface UpdateWebsiteFieldInput {
  label?: string;
  type?: WebsiteFieldType;
  required?: boolean;
  position?: number;
}

export interface ListSubscribersFilter {
  websiteId: string;
  q?: string;
  status?: "all" | "active" | "unsubscribed";
  sortField?: "firstName" | "lastName" | "createdAt";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  tags?: string[];
}

export interface ListSubscribersResult {
  subscribers: Subscriber[];
  total: number;
}

export interface ListContactRequestsFilter {
  websiteId: string;
  q?: string;
  fromDate?: string;
  toDate?: string;
  country?: string;
  sortField?: "name" | "createdAt";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface ListContactRequestsResult {
  contactRequests: ContactRequest[];
  total: number;
}

// ─── Analytics types ──────────────────────────────────────────────────────────

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

export interface GrowthDataPoint {
  date: string; // YYYY-MM-DD
  newSubscribers: number;
  unsubscribes: number;
}

export interface SubscriberAnalytics {
  // Stat cards
  totalActive: number;
  newThisPeriod: number;
  unsubscribedThisPeriod: number;
  growthRate: number | null; // % change vs previous equivalent period; null for "all"

  // Charts
  growth: GrowthDataPoint[];
  statusBreakdown: { active: number; unsubscribed: number };
  topCountries: { country: string; count: number }[];
  deviceBreakdown: { mobile: number; tablet: number; desktop: number; unknown: number };
  topTimezones: { timezone: string; count: number }[];
}
