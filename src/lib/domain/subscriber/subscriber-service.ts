import { getTenantDb, getWebsiteDb } from "@/lib/d1";
import type {
  AnalyticsRange,
  GrowthDataPoint,
  ListSubscribersFilter,
  ListSubscribersResult,
  Subscriber,
  SubscriberAnalytics,
  SubscriberMetadata,
  Tag,
  UpdateSubscriberMetadataInput,
  UpsertSubscriberInput,
} from "@/lib/domain/types";
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

// ─── Row types ─────────────────────────────────────────────────────────────────

type SubscriberRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  unsubscribed_at: string | null;
  user_agent: string | null;
  referrer: string | null;
  timezone: string | null;
  locale: string | null;
  screen_width: number | null;
  screen_height: number | null;
  viewport_width: number | null;
  viewport_height: number | null;
  country: string | null;
  region: string | null;
  city: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  metadata: string | null;
};

type TagRow = { id: string; name: string; color: string | null; description: string | null };

function toSubscriber(row: SubscriberRow, websiteId: string, tags: TagRow[]): Subscriber {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    websiteId,
    createdAt: new Date(row.created_at),
    unsubscribedAt: row.unsubscribed_at ? new Date(row.unsubscribed_at) : null,
    tags,
    userAgent: row.user_agent,
    referrer: row.referrer,
    timezone: row.timezone,
    locale: row.locale,
    screenWidth: row.screen_width,
    screenHeight: row.screen_height,
    viewportWidth: row.viewport_width,
    viewportHeight: row.viewport_height,
    country: row.country,
    region: row.region,
    city: row.city,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmTerm: row.utm_term,
    utmContent: row.utm_content,
    metadata: row.metadata ? (JSON.parse(row.metadata) as SubscriberMetadata) : null,
  };
}

/** Fetch tags for a list of subscriber IDs in one query. */
async function fetchTagsForSubscribers(
  db: Awaited<ReturnType<typeof getWebsiteDb>>,
  subscriberIds: string[],
): Promise<Map<string, TagRow[]>> {
  if (subscriberIds.length === 0) return new Map();
  const placeholders = subscriberIds.map(() => "?").join(", ");
  const rows = await db.query<{
    subscriber_id: string;
    tag_id: string;
    name: string;
    color: string | null;
    description: string | null;
  }>(
    `SELECT st.subscriber_id, t.id AS tag_id, t.name, t.color, t.description
     FROM subscriber_tags st
     JOIN tags t ON t.id = st.tag_id
     WHERE st.subscriber_id IN (${placeholders})`,
    subscriberIds,
  );
  const map = new Map<string, TagRow[]>();
  for (const r of rows) {
    const list = map.get(r.subscriber_id) ?? [];
    list.push({ id: r.tag_id, name: r.name, color: r.color, description: r.description });
    map.set(r.subscriber_id, list);
  }
  return map;
}

/** Verify that a websiteId belongs to the given tenantId. Returns the website's d1_database_id. */
async function verifyWebsiteOwnership(websiteId: string, tenantId: string): Promise<boolean> {
  const tenantDb = getTenantDb();
  const rows = await tenantDb.query<{ tenant_id: string }>(
    "SELECT tenant_id FROM websites WHERE id = ? LIMIT 1",
    [websiteId],
  );
  return rows[0]?.tenant_id === tenantId;
}

/** Upsert a tag by name — returns its id. */
async function upsertTag(db: Awaited<ReturnType<typeof getWebsiteDb>>, tagName: string): Promise<string> {
  const existing = await db.query<{ id: string }>("SELECT id FROM tags WHERE name = ? LIMIT 1", [tagName]);
  if (existing[0]) return existing[0].id;
  const id = crypto.randomUUID();
  await db.run("INSERT INTO tags (id, name) VALUES (?, ?)", [id, tagName]);
  return id;
}

// ─── Service implementation ────────────────────────────────────────────────────

export class D1SubscriberService implements SubscriberService {
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

    const db = await getWebsiteDb(websiteId);

    // Build WHERE clauses
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q) {
      conditions.push("(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)");
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (status === "active") conditions.push("unsubscribed_at IS NULL");
    if (status === "unsubscribed") conditions.push("unsubscribed_at IS NOT NULL");

    // Tag filter: subscribers that have ALL specified tags (via subquery per tag)
    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        conditions.push("id IN (SELECT subscriber_id FROM subscriber_tags WHERE tag_id = ?)");
        params.push(tagId);
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const colMap: Record<string, string> = {
      firstName: "first_name",
      lastName: "last_name",
      createdAt: "created_at",
    };
    const orderCol = colMap[sortField] ?? "created_at";
    const orderDir = sortDir === "asc" ? "ASC" : "DESC";
    const offset = (page - 1) * pageSize;

    const [rows, countRows] = await Promise.all([
      db.query<SubscriberRow>(
        `SELECT * FROM subscribers ${where} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
      db.query<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM subscribers ${where}`, params),
    ]);

    const total = countRows[0]?.cnt ?? 0;
    const ids = rows.map((r) => r.id);
    const tagsMap = await fetchTagsForSubscribers(db, ids);

    return {
      subscribers: rows.map((r) => toSubscriber(r, websiteId, tagsMap.get(r.id) ?? [])),
      total,
    };
  }

  async upsertSubscriber(input: UpsertSubscriberInput): Promise<Subscriber> {
    const { enrichment = {}, metadata, websiteId } = input;
    const metadataStr = metadata !== undefined ? JSON.stringify(metadata) : null;
    const db = await getWebsiteDb(websiteId);

    const existing = await db.query<SubscriberRow>("SELECT * FROM subscribers WHERE email = ? LIMIT 1", [
      input.email,
    ]);

    if (existing[0]) {
      await db.run(
        `UPDATE subscribers SET
          first_name = ?, last_name = ?,
          user_agent = ?, referrer = ?, timezone = ?, locale = ?,
          screen_width = ?, screen_height = ?, viewport_width = ?, viewport_height = ?,
          country = ?, region = ?, city = ?,
          utm_source = ?, utm_medium = ?, utm_campaign = ?, utm_term = ?, utm_content = ?
          ${metadataStr !== null ? ", metadata = ?" : ""}
        WHERE email = ?`,
        [
          input.firstName ?? null,
          input.lastName ?? null,
          enrichment.userAgent ?? null,
          enrichment.referrer ?? null,
          enrichment.timezone ?? null,
          enrichment.locale ?? null,
          enrichment.screenWidth ?? null,
          enrichment.screenHeight ?? null,
          enrichment.viewportWidth ?? null,
          enrichment.viewportHeight ?? null,
          enrichment.country ?? null,
          enrichment.region ?? null,
          enrichment.city ?? null,
          enrichment.utmSource ?? null,
          enrichment.utmMedium ?? null,
          enrichment.utmCampaign ?? null,
          enrichment.utmTerm ?? null,
          enrichment.utmContent ?? null,
          ...(metadataStr !== null ? [metadataStr] : []),
          input.email,
        ],
      );
    } else {
      const id = crypto.randomUUID();
      await db.run(
        `INSERT INTO subscribers (
          id, email, first_name, last_name,
          user_agent, referrer, timezone, locale,
          screen_width, screen_height, viewport_width, viewport_height,
          country, region, city,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.email,
          input.firstName ?? null,
          input.lastName ?? null,
          enrichment.userAgent ?? null,
          enrichment.referrer ?? null,
          enrichment.timezone ?? null,
          enrichment.locale ?? null,
          enrichment.screenWidth ?? null,
          enrichment.screenHeight ?? null,
          enrichment.viewportWidth ?? null,
          enrichment.viewportHeight ?? null,
          enrichment.country ?? null,
          enrichment.region ?? null,
          enrichment.city ?? null,
          enrichment.utmSource ?? null,
          enrichment.utmMedium ?? null,
          enrichment.utmCampaign ?? null,
          enrichment.utmTerm ?? null,
          enrichment.utmContent ?? null,
          metadataStr,
        ],
      );
    }

    const rows = await db.query<SubscriberRow>("SELECT * FROM subscribers WHERE email = ? LIMIT 1", [
      input.email,
    ]);
    const tagsMap = await fetchTagsForSubscribers(db, [rows[0].id]);
    return toSubscriber(rows[0], websiteId, tagsMap.get(rows[0].id) ?? []);
  }

  async unsubscribeSubscriber(subscriberId: string, tenantId: string): Promise<boolean> {
    // Find which websiteId this subscriber belongs to — check all websites for tenant
    const tenantDb = getTenantDb();
    const websites = await tenantDb.query<{ id: string; d1_database_id: string }>(
      "SELECT id, d1_database_id FROM websites WHERE tenant_id = ? AND d1_database_id IS NOT NULL",
      [tenantId],
    );
    for (const site of websites) {
      const db = await getWebsiteDb(site.id);
      const row = await db.query<{ id: string }>("SELECT id FROM subscribers WHERE id = ? LIMIT 1", [
        subscriberId,
      ]);
      if (row[0]) {
        await db.run("UPDATE subscribers SET unsubscribed_at = ? WHERE id = ?", [
          new Date().toISOString(),
          subscriberId,
        ]);
        return true;
      }
    }
    return false;
  }

  async unsubscribeByEmail(email: string, websiteId: string): Promise<boolean> {
    const db = await getWebsiteDb(websiteId);
    const result = await db.run(
      "UPDATE subscribers SET unsubscribed_at = ? WHERE email = ? AND unsubscribed_at IS NULL",
      [new Date().toISOString(), email],
    );
    return result.changes > 0;
  }

  async resubscribeSubscriber(subscriberId: string, tenantId: string): Promise<boolean> {
    const tenantDb = getTenantDb();
    const websites = await tenantDb.query<{ id: string }>(
      "SELECT id FROM websites WHERE tenant_id = ? AND d1_database_id IS NOT NULL",
      [tenantId],
    );
    for (const site of websites) {
      const db = await getWebsiteDb(site.id);
      const row = await db.query<{ id: string }>("SELECT id FROM subscribers WHERE id = ? LIMIT 1", [
        subscriberId,
      ]);
      if (row[0]) {
        await db.run("UPDATE subscribers SET unsubscribed_at = NULL WHERE id = ?", [subscriberId]);
        return true;
      }
    }
    return false;
  }

  async bulkUnsubscribe(subscriberIds: string[], tenantId: string): Promise<{ count: number }> {
    if (!(await verifyWebsiteOwnership(subscriberIds[0] ?? "", tenantId))) {
      // We don't have websiteId here — iterate per website
    }
    // bulkUnsubscribe is called with subscriberIds from a single website (from the UI)
    // We need the websiteId. This method is called from dashboard actions that have it.
    // Since we can't get websiteId from subscriberId alone without scanning, we rely on
    // the dashboard actions passing websiteId via a separate service call pattern.
    // For now, scan all tenant websites (bounded by 10).
    const tenantDb = getTenantDb();
    const websites = await tenantDb.query<{ id: string }>(
      "SELECT id FROM websites WHERE tenant_id = ? AND d1_database_id IS NOT NULL",
      [tenantId],
    );
    let count = 0;
    const placeholders = subscriberIds.map(() => "?").join(", ");
    for (const site of websites) {
      const db = await getWebsiteDb(site.id);
      const result = await db.run(
        `UPDATE subscribers SET unsubscribed_at = ? WHERE id IN (${placeholders}) AND unsubscribed_at IS NULL`,
        [new Date().toISOString(), ...subscriberIds],
      );
      count += result.changes;
    }
    return { count };
  }

  async bulkResubscribe(subscriberIds: string[], tenantId: string): Promise<{ count: number }> {
    const tenantDb = getTenantDb();
    const websites = await tenantDb.query<{ id: string }>(
      "SELECT id FROM websites WHERE tenant_id = ? AND d1_database_id IS NOT NULL",
      [tenantId],
    );
    let count = 0;
    const placeholders = subscriberIds.map(() => "?").join(", ");
    for (const site of websites) {
      const db = await getWebsiteDb(site.id);
      const result = await db.run(
        `UPDATE subscribers SET unsubscribed_at = NULL WHERE id IN (${placeholders}) AND unsubscribed_at IS NOT NULL`,
        [...subscriberIds],
      );
      count += result.changes;
    }
    return { count };
  }

  async addTagToSubscriber(
    subscriberId: string,
    tagName: string,
    tenantId: string,
  ): Promise<Pick<Tag, "id" | "name" | "color" | "description"> | null> {
    const tenantDb = getTenantDb();
    const websites = await tenantDb.query<{ id: string }>(
      "SELECT id FROM websites WHERE tenant_id = ? AND d1_database_id IS NOT NULL",
      [tenantId],
    );
    for (const site of websites) {
      const db = await getWebsiteDb(site.id);
      const sub = await db.query<{ id: string }>("SELECT id FROM subscribers WHERE id = ? LIMIT 1", [
        subscriberId,
      ]);
      if (!sub[0]) continue;

      const tagId = await upsertTag(db, tagName);
      // Insert join row, ignore if already exists
      await db.run(
        "INSERT OR IGNORE INTO subscriber_tags (subscriber_id, tag_id, created_at) VALUES (?, ?, ?)",
        [subscriberId, tagId, new Date().toISOString()],
      );
      const tagRow = await db.query<{
        id: string;
        name: string;
        color: string | null;
        description: string | null;
      }>("SELECT id, name, color, description FROM tags WHERE id = ? LIMIT 1", [tagId]);
      return tagRow[0] ?? null;
    }
    return null;
  }

  async removeTagFromSubscriber(subscriberId: string, tagId: string, tenantId: string): Promise<boolean> {
    const tenantDb = getTenantDb();
    const websites = await tenantDb.query<{ id: string }>(
      "SELECT id FROM websites WHERE tenant_id = ? AND d1_database_id IS NOT NULL",
      [tenantId],
    );
    for (const site of websites) {
      const db = await getWebsiteDb(site.id);
      const sub = await db.query<{ id: string }>("SELECT id FROM subscribers WHERE id = ? LIMIT 1", [
        subscriberId,
      ]);
      if (!sub[0]) continue;
      await db.run("DELETE FROM subscriber_tags WHERE subscriber_id = ? AND tag_id = ?", [
        subscriberId,
        tagId,
      ]);
      return true;
    }
    return false;
  }

  async bulkAddTag(subscriberIds: string[], tagName: string, tenantId: string): Promise<{ count: number }> {
    const tenantDb = getTenantDb();
    const websites = await tenantDb.query<{ id: string }>(
      "SELECT id FROM websites WHERE tenant_id = ? AND d1_database_id IS NOT NULL",
      [tenantId],
    );
    let count = 0;
    const placeholders = subscriberIds.map(() => "?").join(", ");
    for (const site of websites) {
      const db = await getWebsiteDb(site.id);
      const subs = await db.query<{ id: string }>(
        `SELECT id FROM subscribers WHERE id IN (${placeholders})`,
        subscriberIds,
      );
      if (subs.length === 0) continue;

      const tagId = await upsertTag(db, tagName);
      for (const sub of subs) {
        await db.run(
          "INSERT OR IGNORE INTO subscriber_tags (subscriber_id, tag_id, created_at) VALUES (?, ?, ?)",
          [sub.id, tagId, new Date().toISOString()],
        );
        count++;
      }
    }
    return { count };
  }

  async getTagsForWebsite(websiteId: string): Promise<Pick<Tag, "id" | "name" | "color" | "description">[]> {
    const db = await getWebsiteDb(websiteId);
    return db.query<{ id: string; name: string; color: string | null; description: string | null }>(
      "SELECT id, name, color, description FROM tags ORDER BY name ASC",
    );
  }

  async exportSubscribers(filter: Omit<ListSubscribersFilter, "page" | "pageSize">): Promise<Subscriber[]> {
    const { websiteId, q, status = "all", sortField = "createdAt", sortDir = "desc", tags } = filter;
    const db = await getWebsiteDb(websiteId);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q) {
      conditions.push("(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)");
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (status === "active") conditions.push("unsubscribed_at IS NULL");
    if (status === "unsubscribed") conditions.push("unsubscribed_at IS NOT NULL");
    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        conditions.push("id IN (SELECT subscriber_id FROM subscriber_tags WHERE tag_id = ?)");
        params.push(tagId);
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const colMap: Record<string, string> = {
      firstName: "first_name",
      lastName: "last_name",
      createdAt: "created_at",
    };
    const orderCol = colMap[sortField] ?? "created_at";
    const orderDir = sortDir === "asc" ? "ASC" : "DESC";

    const rows = await db.query<SubscriberRow>(
      `SELECT * FROM subscribers ${where} ORDER BY ${orderCol} ${orderDir}`,
      params,
    );

    const tagsMap = await fetchTagsForSubscribers(
      db,
      rows.map((r) => r.id),
    );
    return rows.map((r) => toSubscriber(r, websiteId, tagsMap.get(r.id) ?? []));
  }

  async updateSubscriberMetadata(
    subscriberId: string,
    tenantId: string,
    input: UpdateSubscriberMetadataInput,
  ): Promise<Subscriber | null> {
    const tenantDb = getTenantDb();
    const websites = await tenantDb.query<{ id: string }>(
      "SELECT id FROM websites WHERE tenant_id = ? AND d1_database_id IS NOT NULL",
      [tenantId],
    );
    for (const site of websites) {
      const db = await getWebsiteDb(site.id);
      const row = await db.query<SubscriberRow>("SELECT * FROM subscribers WHERE id = ? LIMIT 1", [
        subscriberId,
      ]);
      if (!row[0]) continue;

      await db.run("UPDATE subscribers SET metadata = ? WHERE id = ?", [
        JSON.stringify(input.metadata),
        subscriberId,
      ]);
      const updated = await db.query<SubscriberRow>("SELECT * FROM subscribers WHERE id = ? LIMIT 1", [
        subscriberId,
      ]);
      const tagsMap = await fetchTagsForSubscribers(db, [subscriberId]);
      return toSubscriber(updated[0], site.id, tagsMap.get(subscriberId) ?? []);
    }
    return null;
  }

  async getAnalytics(websiteId: string, range: AnalyticsRange): Promise<SubscriberAnalytics> {
    const db = await getWebsiteDb(websiteId);
    const now = new Date();
    const rangeStart = getRangeStart(range, now);
    const prevRangeStart = getPrevRangeStart(range, now);

    type DateCountRow = { date: string; cnt: number };
    type DeviceRow = { bucket: string; cnt: number };
    type StringCountRow = { val: string | null; cnt: number };

    const rangeFilter = rangeStart ? `AND created_at >= ?` : "";
    const unsubRangeFilter = rangeStart ? `AND unsubscribed_at >= ?` : "";
    const rangeParams = rangeStart ? [rangeStart.toISOString()] : [];
    const unsubRangeParams = rangeStart ? [rangeStart.toISOString()] : [];

    const prevFilterSql = prevRangeStart && rangeStart ? `AND created_at >= ? AND created_at < ?` : "";
    const prevFilterParams =
      prevRangeStart && rangeStart ? [prevRangeStart.toISOString(), rangeStart.toISOString()] : [];

    const [
      totalActiveRows,
      totalUnsubscribedRows,
      newThisPeriodRows,
      unsubThisPeriodRows,
      newPrevRows,
      signupRows,
      unsubRows,
      countryRows,
      deviceRows,
      timezoneRows,
    ] = await Promise.all([
      db.query<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM subscribers WHERE unsubscribed_at IS NULL"),
      db.query<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM subscribers WHERE unsubscribed_at IS NOT NULL"),
      rangeStart
        ? db.query<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM subscribers WHERE created_at >= ?`, [
            rangeStart.toISOString(),
          ])
        : db.query<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM subscribers"),
      rangeStart
        ? db.query<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM subscribers WHERE unsubscribed_at >= ?`, [
            rangeStart.toISOString(),
          ])
        : db.query<{ cnt: number }>(
            "SELECT COUNT(*) AS cnt FROM subscribers WHERE unsubscribed_at IS NOT NULL",
          ),
      prevFilterSql
        ? db.query<DateCountRow>(
            `SELECT '0' AS date, COUNT(*) AS cnt FROM subscribers WHERE 1=1 ${prevFilterSql}`,
            prevFilterParams,
          )
        : Promise.resolve<DateCountRow[]>([]),
      db.query<DateCountRow>(
        `SELECT date(created_at) AS date, COUNT(*) AS cnt FROM subscribers WHERE 1=1 ${rangeFilter} GROUP BY date(created_at) ORDER BY date ASC`,
        rangeParams,
      ),
      db.query<DateCountRow>(
        `SELECT date(unsubscribed_at) AS date, COUNT(*) AS cnt FROM subscribers WHERE unsubscribed_at IS NOT NULL ${unsubRangeFilter} GROUP BY date(unsubscribed_at) ORDER BY date ASC`,
        unsubRangeParams,
      ),
      db.query<StringCountRow>(
        "SELECT country AS val, COUNT(*) AS cnt FROM subscribers WHERE country IS NOT NULL GROUP BY country ORDER BY cnt DESC LIMIT 10",
      ),
      db.query<DeviceRow>(
        `SELECT
           CASE
             WHEN COALESCE(screen_width, viewport_width) < 768 THEN 'mobile'
             WHEN COALESCE(screen_width, viewport_width) <= 1024 THEN 'tablet'
             WHEN COALESCE(screen_width, viewport_width) > 1024 THEN 'desktop'
             ELSE 'unknown'
           END AS bucket,
           COUNT(*) AS cnt
         FROM subscribers
         GROUP BY bucket`,
      ),
      db.query<StringCountRow>(
        "SELECT timezone AS val, COUNT(*) AS cnt FROM subscribers WHERE timezone IS NOT NULL GROUP BY timezone ORDER BY cnt DESC LIMIT 10",
      ),
    ]);

    const totalActive = totalActiveRows[0]?.cnt ?? 0;
    const totalUnsubscribed = totalUnsubscribedRows[0]?.cnt ?? 0;
    const newThisPeriodCount = newThisPeriodRows[0]?.cnt ?? 0;
    const unsubscribedThisPeriodCount = unsubThisPeriodRows[0]?.cnt ?? 0;
    const newPrevPeriod = newPrevRows.length > 0 ? newPrevRows[0].cnt : null;

    const growthRate =
      newPrevPeriod !== null && newPrevPeriod > 0
        ? Math.round(((newThisPeriodCount - newPrevPeriod) / newPrevPeriod) * 100)
        : newPrevPeriod === 0 && newThisPeriodCount > 0
          ? 100
          : null;

    const signupMap = new Map(signupRows.map((r) => [r.date.slice(0, 10), r.cnt]));
    const unsubMap = new Map(unsubRows.map((r) => [r.date.slice(0, 10), r.cnt]));
    const deviceMap = new Map(deviceRows.map((r) => [r.bucket, r.cnt]));

    return {
      totalActive,
      newThisPeriod: newThisPeriodCount,
      unsubscribedThisPeriod: unsubscribedThisPeriodCount,
      growthRate,
      growth: fillGrowthGaps(signupMap, unsubMap, rangeStart, now),
      statusBreakdown: { active: totalActive, unsubscribed: totalUnsubscribed },
      topCountries: countryRows.map((r) => ({ country: String(r.val), count: r.cnt })),
      deviceBreakdown: {
        mobile: deviceMap.get("mobile") ?? 0,
        tablet: deviceMap.get("tablet") ?? 0,
        desktop: deviceMap.get("desktop") ?? 0,
        unknown: deviceMap.get("unknown") ?? 0,
      },
      topTimezones: timezoneRows.map((r) => ({ timezone: String(r.val), count: r.cnt })),
    };
  }
}
