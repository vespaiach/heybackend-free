export type { SubscriberService } from "./subscriber/subscriber-service.interface";
export type { TenantService } from "./tenant/tenant-service.interface";
export type { ContactRequestService } from "./contact-request/contact-request-service.interface";
export * from "./types";
export type { WebsiteService } from "./website/website-service.interface";

import { PrismaSubscriberService } from "./subscriber/subscriber-service";
import type { SubscriberService } from "./subscriber/subscriber-service.interface";
import { PrismaTenantService } from "./tenant/tenant-service";
import type { TenantService } from "./tenant/tenant-service.interface";
import { PrismaWebsiteService } from "./website/website-service";
import type { WebsiteService } from "./website/website-service.interface";
import { PrismaContactRequestService } from "./contact-request/contact-request-service";
import type { ContactRequestService } from "./contact-request/contact-request-service.interface";

export const tenantService: TenantService = new PrismaTenantService();
export const websiteService: WebsiteService = new PrismaWebsiteService();
export const subscriberService: SubscriberService = new PrismaSubscriberService();
export const contactRequestService: ContactRequestService = new PrismaContactRequestService();
