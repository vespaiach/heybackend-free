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

export type ContactMetadata = Record<string, string | number | boolean | null>;

export interface Contact {
  id: string;
  websiteId: string;
  email: string;
  name: string | null;
  phone: string | null;
  message: string;
  metadata: ContactMetadata | null;
  tags: Pick<Tag, "id" | "name" | "color" | "description">[];
  // Device / context
  userAgent: string | null;
  referrer: string | null;
  timezone: string | null;
  locale: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  // Location (derived from IP, raw IP never stored)
  country: string | null;
  region: string | null;
  city: string | null;
  // UTM attribution
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  createdAt: Date;
}

export interface ContactEnrichment {
  userAgent?: string | null;
  referrer?: string | null;
  timezone?: string | null;
  locale?: string | null;
  screenWidth?: number | null;
  screenHeight?: number | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
}

export interface CreateContactInput {
  websiteId: string;
  email: string;
  name: string;
  phone?: string | null;
  message: string;
  enrichment?: ContactEnrichment;
  metadata?: ContactMetadata;
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

export interface SubscriberEnrichment {
  userAgent?: string | null;
  referrer?: string | null;
  timezone?: string | null;
  locale?: string | null;
  screenWidth?: number | null;
  screenHeight?: number | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
}

export interface UpsertSubscriberInput {
  email: string;
  firstName: string | null;
  lastName: string | null;
  websiteId: string;
  timezone?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  browser?: string | null;
  deviceType?: string | null;
  os?: string | null;
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

export interface ListContactsFilter {
  websiteId: string;
  q?: string;
  fromDate?: string;
  toDate?: string;
  country?: string;
  sortField?: "name" | "createdAt";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  tags?: string[];
}

export interface ListContactsResult {
  contacts: Contact[];
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
