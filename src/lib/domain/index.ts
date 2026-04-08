export type { SubscriberService } from "./subscriber/subscriber-service.interface";
export type { TenantService } from "./tenant/tenant-service.interface";
export * from "./types";
export type { WebsiteService } from "./website/website-service.interface";

import { D1SubscriberService } from "./subscriber/subscriber-service";
import type { SubscriberService } from "./subscriber/subscriber-service.interface";
import { D1TenantService } from "./tenant/tenant-service";
import type { TenantService } from "./tenant/tenant-service.interface";
import { D1WebsiteService } from "./website/website-service";
import type { WebsiteService } from "./website/website-service.interface";

export const tenantService: TenantService = new D1TenantService();
export const websiteService: WebsiteService = new D1WebsiteService();
export const subscriberService: SubscriberService = new D1SubscriberService();
