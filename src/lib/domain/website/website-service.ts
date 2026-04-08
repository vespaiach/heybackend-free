import type {
  CreateWebsiteFieldInput,
  CreateWebsiteInput,
  UpdateWebsiteFieldInput,
  UpdateWebsiteInput,
  Website,
  WebsiteField,
  WebsiteFieldType,
  WebsiteForSubscribe,
} from "@/lib/domain/types";
import { prisma } from "@/lib/prisma";
import type { WebsiteService } from "./website-service.interface";

const MAX_WEBSITES_PER_TENANT = 10;

function toWebsite(w: {
  id: string;
  name: string;
  url: string;
  key: string;
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
}): Website {
  return {
    id: w.id,
    name: w.name,
    url: w.url,
    key: w.key,
    isActive: w.isActive,
    tenantId: w.tenantId,
    createdAt: w.createdAt,
  };
}

function toWebsiteField(f: {
  id: string;
  websiteId: string;
  slug: string;
  label: string;
  type: string;
  required: boolean;
  position: number;
  createdAt: Date;
}): WebsiteField {
  return {
    id: f.id,
    websiteId: f.websiteId,
    slug: f.slug,
    label: f.label,
    type: f.type as WebsiteFieldType,
    required: f.required,
    position: f.position,
    createdAt: f.createdAt,
  };
}

export class PrismaWebsiteService implements WebsiteService {
  async getWebsiteByIdAndKey(id: string, key: string): Promise<WebsiteForSubscribe | null> {
    const website = await prisma.website.findUnique({
      where: { id },
      select: { id: true, url: true, isActive: true, key: true },
    });
    if (!website || website.key !== key) return null;
    return { id: website.id, url: website.url, isActive: website.isActive };
  }

  async getWebsiteById(id: string): Promise<WebsiteForSubscribe | null> {
    const website = await prisma.website.findUnique({
      where: { id },
      select: { id: true, url: true, isActive: true },
    });
    if (!website) return null;
    return { id: website.id, url: website.url, isActive: website.isActive };
  }

  async createWebsite(input: CreateWebsiteInput): Promise<Website> {
    const count = await prisma.website.count({ where: { tenantId: input.tenantId } });
    if (count >= MAX_WEBSITES_PER_TENANT) {
      throw new Error(`Website limit reached (max ${MAX_WEBSITES_PER_TENANT} per tenant)`);
    }

    const key = crypto.randomUUID();
    const website = await prisma.website.create({
      data: { name: input.name, url: input.url, key, tenantId: input.tenantId },
    });
    return toWebsite(website);
  }

  async updateWebsite(id: string, tenantId: string, input: UpdateWebsiteInput): Promise<Website | null> {
    const existing = await prisma.website.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) return null;

    const data: { name: string; url: string; key?: string } = { name: input.name, url: input.url };
    if (input.regenerateKey) data.key = crypto.randomUUID();

    const website = await prisma.website.update({ where: { id }, data });
    return toWebsite(website);
  }

  async deactivateWebsite(id: string, tenantId: string): Promise<boolean> {
    const existing = await prisma.website.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) return false;
    await prisma.website.update({ where: { id }, data: { isActive: false } });
    return true;
  }

  async getWebsiteFields(websiteId: string): Promise<WebsiteField[]> {
    const fields = await prisma.websiteField.findMany({
      where: { websiteId },
      orderBy: { position: "asc" },
    });
    return fields.map(toWebsiteField);
  }

  async createWebsiteField(tenantId: string, input: CreateWebsiteFieldInput): Promise<WebsiteField | null> {
    const site = await prisma.website.findFirst({
      where: { id: input.websiteId, tenantId },
      select: { id: true },
    });
    if (!site) return null;

    const field = await prisma.websiteField.create({
      data: {
        websiteId: input.websiteId,
        slug: input.slug,
        label: input.label,
        type: input.type,
        required: input.required,
        position: input.position ?? 0,
      },
    });
    return toWebsiteField(field);
  }

  async updateWebsiteField(
    fieldId: string,
    tenantId: string,
    input: UpdateWebsiteFieldInput,
  ): Promise<WebsiteField | null> {
    const existing = await prisma.websiteField.findFirst({
      where: { id: fieldId, website: { tenantId } },
      select: { id: true },
    });
    if (!existing) return null;

    const data: Partial<{ label: string; type: string; required: boolean; position: number }> = {};
    if (input.label !== undefined) data.label = input.label;
    if (input.type !== undefined) data.type = input.type;
    if (input.required !== undefined) data.required = input.required;
    if (input.position !== undefined) data.position = input.position;

    const field = await prisma.websiteField.update({ where: { id: fieldId }, data });
    return toWebsiteField(field);
  }

  async deleteWebsiteField(fieldId: string, tenantId: string): Promise<boolean> {
    const existing = await prisma.websiteField.findFirst({
      where: { id: fieldId, website: { tenantId } },
      select: { id: true },
    });
    if (!existing) return false;
    await prisma.websiteField.delete({ where: { id: fieldId } });
    return true;
  }
}
