import type { Prisma } from "@prisma/client";
import type {
  ContactAnalytics,
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

    // Filter by company
    if (filter.company) {
      where.company = filter.company;
    }

    // Filter by read status
    if (filter.readStatus === "read") {
      where.readAt = { not: null };
    } else if (filter.readStatus === "unread") {
      where.readAt = null;
    }
    // 'all' or undefined: no filter

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
    const result = await prisma.contactRequest.updateMany({
      where: {
        id: contactRequestId,
        website: {
          is: {
            tenant: {
              is: {
                id: tenantId,
              },
            },
          },
        },
      },
      data: {
        readAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error("Contact not found or access denied");
    }
  }

  async getContactAnalytics(websiteId: string): Promise<ContactAnalytics> {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const [rows, companyRows] = await Promise.all([
      prisma.contactRequest.findMany({
        where: { websiteId, createdAt: { gte: oneYearAgo } },
        select: { createdAt: true, readAt: true },
      }),
      prisma.contactRequest.groupBy({
        by: ["company"],
        where: { websiteId },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

    // Stat totals
    const total = rows.length;
    const read = rows.filter((r) => r.readAt !== null).length;
    const unread = total - read;

    // Daily activity: "YYYY-MM-DD" → count
    const dailyMap = new Map<string, number>();
    for (const { createdAt } of rows) {
      const key = createdAt.toISOString().slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
    const dailyActivity = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Monthly trend: "YYYY-MM" → count
    const monthlyMap = new Map<string, number>();
    for (const { createdAt } of rows) {
      const key = createdAt.toISOString().slice(0, 7);
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1);
    }
    const monthlyTrend: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrend.push({ month, count: monthlyMap.get(month) ?? 0 });
    }

    // MoM change
    const currentMonth = now.toISOString().slice(0, 7);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevDate.toISOString().slice(0, 7);
    const currentCount = monthlyMap.get(currentMonth) ?? 0;
    const prevCount = monthlyMap.get(prevMonth) ?? 0;
    const momChange = prevCount === 0 ? null : Math.round(((currentCount - prevCount) / prevCount) * 1000) / 10;

    // Company breakdown: top 8 + Others (named only); Unknown (null/empty) kept separate
    const TOP_N = 8;
    let unknownCount = 0;
    const namedMap = new Map<string, number>();
    for (const r of companyRows) {
      const name = r.company?.trim() || null;
      if (!name) {
        unknownCount += r._count.id;
      } else {
        namedMap.set(name, (namedMap.get(name) ?? 0) + r._count.id);
      }
    }
    const namedEntries = Array.from(namedMap.entries()).sort(([, a], [, b]) => b - a);

    const companyBreakdown: { company: string; count: number }[] = [];
    if (namedEntries.length > TOP_N) {
      companyBreakdown.push(...namedEntries.slice(0, TOP_N).map(([company, count]) => ({ company, count })));
      const othersCount = namedEntries.slice(TOP_N).reduce((sum, [, c]) => sum + c, 0);
      companyBreakdown.push({ company: "Others", count: othersCount });
    } else {
      companyBreakdown.push(...namedEntries.map(([company, count]) => ({ company, count })));
    }
    if (unknownCount > 0) {
      companyBreakdown.push({ company: "Unknown", count: unknownCount });
    }

    return { total, read, unread, momChange, monthlyTrend, dailyActivity, companyBreakdown };
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
      readAt: dbContactRequest.readAt,
      createdAt: dbContactRequest.createdAt,
    };
  }
}
