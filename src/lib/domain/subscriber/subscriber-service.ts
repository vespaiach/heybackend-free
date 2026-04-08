import type { Prisma } from "@prisma/client";
import type {
  AnalyticsRange,
  GrowthDataPoint,
  ListSubscribersFilter,
  ListSubscribersResult,
  Subscriber,
  SubscriberAnalytics,
  Tag,
  UpdateSubscriberMetadataInput,
  UpsertSubscriberInput,
} from "@/lib/domain/types";
import { prisma } from "@/lib/prisma";
import type { SubscriberService } from "./subscriber-service.interface";

// ─── Analytics helpers ────────────────────────────────────────────────────────

function getRangeStart(range: AnalyticsRange, now: Date): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getPrevRangeStart(range: AnalyticsRange, now: Date): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const d = new Date(now);
  d.setDate(d.getDate() - days * 2);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fillGrowthGaps(
  signupMap: Map<string, number>,
  unsubMap: Map<string, number>,
  start: Date | null,
  end: Date,
): GrowthDataPoint[] {
  if (!start) {
    const allDates = new Set([...signupMap.keys(), ...unsubMap.keys()]);
    return [...allDates].sort().map((date) => ({
      date,
      newSubscribers: signupMap.get(date) ?? 0,
      unsubscribes: unsubMap.get(date) ?? 0,
    }));
  }
  const points: GrowthDataPoint[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    points.push({ date: key, newSubscribers: signupMap.get(key) ?? 0, unsubscribes: unsubMap.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

function normalizeDeviceType(dt: string | null): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!dt) return "unknown";
  const lower = dt.toLowerCase();
  if (lower.includes("mobile") || lower.includes("phone")) return "mobile";
  if (lower.includes("tablet")) return "tablet";
  return "desktop";
}

function formatDate(d: Date | string): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

// ─── Type helpers ─────────────────────────────────────────────────────────────

type SubscriberWithTags = Prisma.SubscriberGetPayload<{
  include: { tags: { include: { tag: true } } };
}>;

const subscriberInclude = { tags: { include: { tag: true } } } as const;

function toSubscriber(row: SubscriberWithTags): Subscriber {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    websiteId: row.websiteId,
    createdAt: row.createdAt,
    unsubscribedAt: row.unsubscribedAt,
    timezone: row.timezone,
    country: row.country,
    region: row.region,
    city: row.city,
    os: row.os,
    deviceType: row.deviceType,
    browser: row.browser,
    metadata: row.metadata as SubscriberMetadata | null,
    tags: row.tags.map((st) => ({
      id: st.tag.id,
      name: st.tag.name,
      color: st.tag.color,
      description: st.tag.description,
    })),
  };
}

// ─── Service implementation ────────────────────────────────────────────────────

export class PrismaSubscriberService implements SubscriberService {
  async listSubscribers(filter: ListSubscribersFilter): Promise<ListSubscribersResult> {
    const {
      websiteId,
      q,
      status = "all",
      sortField = "createdAt",
      sortDir = "desc",
      page = 1,
      pageSize = 20,
      tags,
    } = filter;

    const where: Prisma.SubscriberWhereInput = { websiteId };

    if (q) {
      where.OR = [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }];
    }
    if (status === "active") where.unsubscribedAt = null;
    if (status === "unsubscribed") where.unsubscribedAt = { not: null };
    if (tags && tags.length > 0) {
      where.AND = tags.map((tagId) => ({ tags: { some: { tagId } } }));
    }

    const orderBy: Prisma.SubscriberOrderByWithRelationInput = { [sortField]: sortDir };

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: subscriberInclude,
      }),
      prisma.subscriber.count({ where }),
    ]);

    return { subscribers: subscribers.map(toSubscriber), total };
  }

  async upsertSubscriber(input: UpsertSubscriberInput): Promise<Subscriber> {
    const {
      email,
      firstName,
      lastName,
      websiteId,
      timezone,
      country,
      region,
      city,
      browser,
      deviceType,
      os,
    } = input;

    const updateData = {
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      timezone: timezone ?? null,
      country: country ?? null,
      region: region ?? null,
      city: city ?? null,
      browser: browser ?? null,
      deviceType: deviceType ?? null,
      os: os ?? null,
    };

    const result = await prisma.subscriber.upsert({
      where: { email_websiteId: { email, websiteId } },
      update: updateData,
      create: { email, websiteId, ...updateData },
      include: subscriberInclude,
    });

    return toSubscriber(result);
  }

  async unsubscribeSubscriber(subscriberId: string, tenantId: string): Promise<boolean> {
    const sub = await prisma.subscriber.findFirst({ where: { id: subscriberId, website: { tenantId } } });
    if (!sub) return false;
    await prisma.subscriber.update({ where: { id: subscriberId }, data: { unsubscribedAt: new Date() } });
    return true;
  }

  async resubscribeSubscriber(subscriberId: string, tenantId: string): Promise<boolean> {
    const sub = await prisma.subscriber.findFirst({ where: { id: subscriberId, website: { tenantId } } });
    if (!sub) return false;
    await prisma.subscriber.update({ where: { id: subscriberId }, data: { unsubscribedAt: null } });
    return true;
  }

  async bulkUnsubscribe(subscriberIds: string[], tenantId: string): Promise<{ count: number }> {
    const result = await prisma.subscriber.updateMany({
      where: { id: { in: subscriberIds }, website: { tenantId }, unsubscribedAt: null },
      data: { unsubscribedAt: new Date() },
    });
    return { count: result.count };
  }

  async bulkResubscribe(subscriberIds: string[], tenantId: string): Promise<{ count: number }> {
    const result = await prisma.subscriber.updateMany({
      where: { id: { in: subscriberIds }, website: { tenantId }, unsubscribedAt: { not: null } },
      data: { unsubscribedAt: null },
    });
    return { count: result.count };
  }

  async addTagToSubscriber(
    subscriberId: string,
    tagName: string,
    tenantId: string,
  ): Promise<Pick<Tag, "id" | "name" | "color" | "description"> | null> {
    const sub = await prisma.subscriber.findFirst({
      where: { id: subscriberId, website: { tenantId } },
      select: { websiteId: true },
    });
    if (!sub) return null;

    const tag = await prisma.tag.upsert({
      where: { name_websiteId: { name: tagName, websiteId: sub.websiteId } },
      update: {},
      create: { name: tagName, websiteId: sub.websiteId },
    });

    await prisma.subscriberTag.upsert({
      where: { subscriberId_tagId: { subscriberId, tagId: tag.id } },
      update: {},
      create: { subscriberId, tagId: tag.id },
    });

    return { id: tag.id, name: tag.name, color: tag.color, description: tag.description };
  }

  async removeTagFromSubscriber(subscriberId: string, tagId: string, tenantId: string): Promise<boolean> {
    const sub = await prisma.subscriber.findFirst({ where: { id: subscriberId, website: { tenantId } } });
    if (!sub) return false;
    try {
      await prisma.subscriberTag.delete({ where: { subscriberId_tagId: { subscriberId, tagId } } });
      return true;
    } catch {
      return false;
    }
  }

  async bulkAddTag(subscriberIds: string[], tagName: string, tenantId: string): Promise<{ count: number }> {
    const firstSub = await prisma.subscriber.findFirst({
      where: { id: { in: subscriberIds }, website: { tenantId } },
      select: { websiteId: true },
    });
    if (!firstSub) return { count: 0 };

    const tag = await prisma.tag.upsert({
      where: { name_websiteId: { name: tagName, websiteId: firstSub.websiteId } },
      update: {},
      create: { name: tagName, websiteId: firstSub.websiteId },
    });

    const validSubs = await prisma.subscriber.findMany({
      where: { id: { in: subscriberIds }, website: { tenantId } },
      select: { id: true },
    });

    let count = 0;
    for (const { id } of validSubs) {
      await prisma.subscriberTag.upsert({
        where: { subscriberId_tagId: { subscriberId: id, tagId: tag.id } },
        update: {},
        create: { subscriberId: id, tagId: tag.id },
      });
      count++;
    }
    return { count };
  }

  async getTagsForWebsite(websiteId: string): Promise<Pick<Tag, "id" | "name" | "color" | "description">[]> {
    return prisma.tag.findMany({
      where: { websiteId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, description: true },
    });
  }

  async exportSubscribers(filter: Omit<ListSubscribersFilter, "page" | "pageSize">): Promise<Subscriber[]> {
    const { websiteId, q, status = "all", sortField = "createdAt", sortDir = "desc", tags } = filter;

    const where: Prisma.SubscriberWhereInput = { websiteId };
    if (q) {
      where.OR = [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }];
    }
    if (status === "active") where.unsubscribedAt = null;
    if (status === "unsubscribed") where.unsubscribedAt = { not: null };
    if (tags && tags.length > 0) {
      where.AND = tags.map((tagId) => ({ tags: { some: { tagId } } }));
    }

    const rows = await prisma.subscriber.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      include: subscriberInclude,
    });
    return rows.map(toSubscriber);
  }

  async updateSubscriberMetadata(
    subscriberId: string,
    tenantId: string,
    input: UpdateSubscriberMetadataInput,
  ): Promise<Subscriber | null> {
    const sub = await prisma.subscriber.findFirst({ where: { id: subscriberId, website: { tenantId } } });
    if (!sub) return null;

    const updated = await prisma.subscriber.update({
      where: { id: subscriberId },
      data: { metadata: input.metadata as Prisma.InputJsonValue },
      include: subscriberInclude,
    });
    return toSubscriber(updated);
  }

  async unsubscribeByEmail(email: string, websiteId: string): Promise<boolean> {
    const result = await prisma.subscriber.updateMany({
      where: { email, websiteId, unsubscribedAt: null },
      data: { unsubscribedAt: new Date() },
    });
    return result.count > 0;
  }

  async getAnalytics(websiteId: string, range: AnalyticsRange): Promise<SubscriberAnalytics> {
    const now = new Date();
    const rangeStart = getRangeStart(range, now);
    const prevRangeStart = getPrevRangeStart(range, now);

    const [totalActive, totalUnsubscribed] = await Promise.all([
      prisma.subscriber.count({ where: { websiteId, unsubscribedAt: null } }),
      prisma.subscriber.count({ where: { websiteId, unsubscribedAt: { not: null } } }),
    ]);

    const newThisPeriodCount = rangeStart
      ? await prisma.subscriber.count({ where: { websiteId, createdAt: { gte: rangeStart } } })
      : await prisma.subscriber.count({ where: { websiteId } });

    const unsubscribedThisPeriodCount = rangeStart
      ? await prisma.subscriber.count({ where: { websiteId, unsubscribedAt: { gte: rangeStart } } })
      : await prisma.subscriber.count({ where: { websiteId, unsubscribedAt: { not: null } } });

    const newPrevPeriod =
      prevRangeStart && rangeStart
        ? await prisma.subscriber.count({
            where: { websiteId, createdAt: { gte: prevRangeStart, lt: rangeStart } },
          })
        : null;

    const growthRate =
      newPrevPeriod !== null && newPrevPeriod > 0
        ? Math.round(((newThisPeriodCount - newPrevPeriod) / newPrevPeriod) * 100)
        : newPrevPeriod === 0 && newThisPeriodCount > 0
          ? 100
          : null;

    // Growth chart via raw SQL (date grouping)
    const signupRows = rangeStart
      ? await prisma.$queryRaw<Array<{ date: Date; cnt: bigint }>>`
          SELECT DATE(createdAt) as date, COUNT(*) as cnt
          FROM Subscriber
          WHERE websiteId = ${websiteId} AND createdAt >= ${rangeStart}
          GROUP BY DATE(createdAt)
          ORDER BY date ASC
        `
      : await prisma.$queryRaw<Array<{ date: Date; cnt: bigint }>>`
          SELECT DATE(createdAt) as date, COUNT(*) as cnt
          FROM Subscriber
          WHERE websiteId = ${websiteId}
          GROUP BY DATE(createdAt)
          ORDER BY date ASC
        `;

    const unsubRows = rangeStart
      ? await prisma.$queryRaw<Array<{ date: Date; cnt: bigint }>>`
          SELECT DATE(unsubscribedAt) as date, COUNT(*) as cnt
          FROM Subscriber
          WHERE websiteId = ${websiteId} AND unsubscribedAt IS NOT NULL AND unsubscribedAt >= ${rangeStart}
          GROUP BY DATE(unsubscribedAt)
          ORDER BY date ASC
        `
      : await prisma.$queryRaw<Array<{ date: Date; cnt: bigint }>>`
          SELECT DATE(unsubscribedAt) as date, COUNT(*) as cnt
          FROM Subscriber
          WHERE websiteId = ${websiteId} AND unsubscribedAt IS NOT NULL
          GROUP BY DATE(unsubscribedAt)
          ORDER BY date ASC
        `;

    const signupMap = new Map(signupRows.map((r) => [formatDate(r.date), Number(r.cnt)]));
    const unsubMap = new Map(unsubRows.map((r) => [formatDate(r.date), Number(r.cnt)]));

    // Country breakdown
    const countryRows = await prisma.subscriber.groupBy({
      by: ["country"],
      where: { websiteId, country: { not: null } },
      _count: { country: true },
      orderBy: { _count: { country: "desc" } },
      take: 10,
    });

    // Device breakdown
    const deviceRows = await prisma.subscriber.groupBy({
      by: ["deviceType"],
      where: { websiteId },
      _count: { deviceType: true },
    });

    const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0, unknown: 0 };
    for (const row of deviceRows) {
      const bucket = normalizeDeviceType(row.deviceType);
      deviceBreakdown[bucket] += row._count.deviceType;
    }

    // Timezone breakdown
    const timezoneRows = await prisma.subscriber.groupBy({
      by: ["timezone"],
      where: { websiteId, timezone: { not: null } },
      _count: { timezone: true },
      orderBy: { _count: { timezone: "desc" } },
      take: 10,
    });

    return {
      totalActive,
      newThisPeriod: newThisPeriodCount,
      unsubscribedThisPeriod: unsubscribedThisPeriodCount,
      growthRate,
      growth: fillGrowthGaps(signupMap, unsubMap, rangeStart, now),
      statusBreakdown: { active: totalActive, unsubscribed: totalUnsubscribed },
      topCountries: countryRows.map((r) => ({ country: r.country as string, count: r._count.country })),
      deviceBreakdown,
      topTimezones: timezoneRows.map((r) => ({ timezone: r.timezone as string, count: r._count.timezone })),
    };
  }
}
