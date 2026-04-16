import type { Prisma } from "@prisma/client";
import type {
  ContactRequest,
  ContactRequestEnrichment,
  CreateContactRequestInput,
  ListContactRequestsFilter,
  ListContactRequestsResult,
} from "@/lib/domain/types";
import { prisma } from "@/lib/prisma";
import type { ContactRequestService } from "./contact-request-service.interface";

export class PrismaContactRequestService implements ContactRequestService {
  async createContactRequest(input: CreateContactRequestInput): Promise<ContactRequest> {
    const contactRequest = await prisma.contactRequest.create({
      data: {
        websiteId: input.websiteId,
        email: input.email,
        name: input.name,
        company: input.company ?? null,
        phone: input.phone ?? null,
        message: input.message,
        ...(input.metadata && { metadata: input.metadata }),
      },
    });

    return this.mapToContactRequest(contactRequest);
  }

  async enrichContactRequest(contactRequestId: string, data: ContactRequestEnrichment): Promise<void> {
    await prisma.contactRequest.update({
      where: { id: contactRequestId },
      data: {
        timezone: data.timezone ?? undefined,
        country: data.country ?? undefined,
        region: data.region ?? undefined,
        city: data.city ?? undefined,
        os: data.os ?? undefined,
        deviceType: data.deviceType ?? undefined,
        browser: data.browser ?? undefined,
      },
    });
  }

  async listContactRequests(filter: ListContactRequestsFilter): Promise<ListContactRequestsResult> {
    const pageSize = filter.pageSize ?? 10;
    const page = filter.page ?? 1;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ContactRequestWhereInput = {
      websiteId: filter.websiteId,
    };

    // Search by name or email
    if (filter.q) {
      where.OR = [{ name: { contains: filter.q } }, { email: { contains: filter.q } }];
    }

    // Filter by country
    if (filter.country) {
      where.country = filter.country;
    }

    // Filter by date range
    if (filter.fromDate || filter.toDate) {
      const createdAt: Prisma.DateTimeFilter = {};

      if (filter.fromDate) {
        createdAt.gte = new Date(filter.fromDate);
      }

      if (filter.toDate) {
        createdAt.lte = new Date(filter.toDate);
      }

      where.createdAt = createdAt;
    }

    const sortableFields = {
      createdAt: "createdAt",
      email: "email",
      name: "name",
      country: "country",
    } satisfies Record<string, keyof Prisma.ContactRequestOrderByWithRelationInput>;

    const sortField = sortableFields[filter.sortField ?? "createdAt"] ?? sortableFields.createdAt;
    const sortDir: Prisma.SortOrder = filter.sortDir === "asc" ? "asc" : "desc";
    const orderBy: Prisma.ContactRequestOrderByWithRelationInput = {
      [sortField]: sortDir,
    };

    const [contactRequests, total] = await Promise.all([
      prisma.contactRequest.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.contactRequest.count({ where }),
    ]);

    return {
      contactRequests: contactRequests.map((cr) => this.mapToContactRequest(cr)),
      total,
    };
  }

  async getContactRequest(contactRequestId: string, tenantId: string): Promise<ContactRequest | null> {
    const contactRequest = await prisma.contactRequest.findUnique({
      where: { id: contactRequestId },
      include: {
        website: {
          include: {
            tenant: true,
          },
        },
      },
    });

    // Check ownership: does the website belong to the tenant?
    if (!contactRequest || contactRequest.website.tenant.id !== tenantId) {
      return null;
    }

    return this.mapToContactRequest(contactRequest);
  }

  async markContactAsRead(contactRequestId: string, tenantId: string): Promise<void> {
    const contactRequest = await prisma.contactRequest.findUnique({
      where: { id: contactRequestId },
      include: {
        website: {
          include: {
            tenant: true,
          },
        },
      },
    });

    // Check ownership: does the website belong to the tenant?
    if (!contactRequest || contactRequest.website.tenant.id !== tenantId) {
      throw new Error("Contact not found or access denied");
    }

    await prisma.contactRequest.update({
      where: { id: contactRequestId },
      data: {
        readAt: new Date(),
      },
    });
  }

  private mapToContactRequest(
    dbContactRequest: Awaited<ReturnType<typeof prisma.contactRequest.findUnique>>,
  ): ContactRequest {
    if (!dbContactRequest) {
      throw new Error("Contact request not found");
    }
    return {
      id: dbContactRequest.id,
      websiteId: dbContactRequest.websiteId,
      email: dbContactRequest.email,
      name: dbContactRequest.name,
      company: dbContactRequest.company,
      phone: dbContactRequest.phone,
      message: dbContactRequest.message,
      metadata: dbContactRequest.metadata as Record<string, string | number | boolean | null> | null,
      timezone: dbContactRequest.timezone,
      country: dbContactRequest.country,
      region: dbContactRequest.region,
      city: dbContactRequest.city,
      os: dbContactRequest.os,
      deviceType: dbContactRequest.deviceType,
      browser: dbContactRequest.browser,
      createdAt: dbContactRequest.createdAt,
    };
  }
}
