import { readFileSync } from "fs";
import { join } from "path";
import { getTenantDb, createD1Client, provisionD1Database } from "@/lib/d1";
import type {
  Website,
  WebsiteForSubscribe,
  CreateWebsiteInput,
  UpdateWebsiteInput,
  WebsiteField,
  WebsiteFieldType,
  CreateWebsiteFieldInput,
  UpdateWebsiteFieldInput,
} from "@/lib/domain/types";
import type { WebsiteService } from "./website-service.interface";

const MAX_WEBSITES_PER_TENANT = 10;

type WebsiteRow = {
  id: string;
  name: string;
  url: string;
  key: string;
  is_active: number;
  tenant_id: string;
  d1_database_id: string | null;
  created_at: string;
};

type WebsiteFieldRow = {
  id: string;
  website_id: string;
  slug: string;
  label: string;
  type: string;
  required: number;
  position: number;
  created_at: string;
};

export function toWebsite(row: WebsiteRow): Website {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    key: row.key,
    isActive: row.is_active === 1,
    tenantId: row.tenant_id,
    createdAt: new Date(row.created_at),
  };
}

function toWebsiteField(row: WebsiteFieldRow): WebsiteField {
  return {
    id: row.id,
    websiteId: row.website_id,
    slug: row.slug,
    label: row.label,
    type: row.type as WebsiteFieldType,
    required: row.required === 1,
    position: row.position,
    createdAt: new Date(row.created_at),
  };
}

/** Parse the per-website schema SQL into individual statements for batch execution. */
function getWebsiteSchemaStatements(): Array<{ sql: string }> {
  const schemaPath = join(process.cwd(), "db", "schema-website.sql");
  const raw = readFileSync(schemaPath, "utf-8");
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"))
    .map((sql) => ({ sql }));
}

export class D1WebsiteService implements WebsiteService {
  async getWebsiteByIdAndKey(id: string, key: string): Promise<WebsiteForSubscribe | null> {
    const db = getTenantDb();
    const rows = await db.query<Pick<WebsiteRow, "id" | "url" | "is_active" | "key">>(
      "SELECT id, url, is_active, key FROM websites WHERE id = ? LIMIT 1",
      [id],
    );
    const row = rows[0];
    if (!row || row.key !== key) return null;
    return { id: row.id, url: row.url, isActive: row.is_active === 1 };
  }

  async getWebsiteById(id: string): Promise<WebsiteForSubscribe | null> {
    const db = getTenantDb();
    const rows = await db.query<Pick<WebsiteRow, "id" | "url" | "is_active">>(
      "SELECT id, url, is_active FROM websites WHERE id = ? LIMIT 1",
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, url: row.url, isActive: row.is_active === 1 };
  }

  async createWebsite(input: CreateWebsiteInput): Promise<Website> {
    const db = getTenantDb();

    // Enforce 10-website cap per tenant
    const countRows = await db.query<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM websites WHERE tenant_id = ?",
      [input.tenantId],
    );
    const currentCount = countRows[0]?.cnt ?? 0;
    if (currentCount >= MAX_WEBSITES_PER_TENANT) {
      throw new Error(`Website limit reached (max ${MAX_WEBSITES_PER_TENANT} per tenant)`);
    }

    const id = crypto.randomUUID();
    const key = crypto.randomUUID();

    // Provision a dedicated D1 database for this website
    const d1DatabaseId = await provisionD1Database(`bff-${id}`);

    // Apply the per-website schema to the new database
    const websiteDb = createD1Client(d1DatabaseId);
    await websiteDb.batch(getWebsiteSchemaStatements());

    // Insert the website row (with d1_database_id stored for future lookups)
    await db.run(
      "INSERT INTO websites (id, name, url, key, is_active, tenant_id, d1_database_id) VALUES (?, ?, ?, ?, 1, ?, ?)",
      [id, input.name, input.url, key, input.tenantId, d1DatabaseId],
    );

    const rows = await db.query<WebsiteRow>("SELECT * FROM websites WHERE id = ? LIMIT 1", [id]);
    return toWebsite(rows[0]);
  }

  async updateWebsite(id: string, tenantId: string, input: UpdateWebsiteInput): Promise<Website | null> {
    const db = getTenantDb();
    const existing = await db.query<{ tenant_id: string }>(
      "SELECT tenant_id FROM websites WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existing[0] || existing[0].tenant_id !== tenantId) return null;

    const newKey = input.regenerateKey ? crypto.randomUUID() : undefined;
    if (newKey) {
      await db.run("UPDATE websites SET name = ?, url = ?, key = ? WHERE id = ?", [
        input.name,
        input.url,
        newKey,
        id,
      ]);
    } else {
      await db.run("UPDATE websites SET name = ?, url = ? WHERE id = ?", [input.name, input.url, id]);
    }

    const rows = await db.query<WebsiteRow>("SELECT * FROM websites WHERE id = ? LIMIT 1", [id]);
    return toWebsite(rows[0]);
  }

  async deactivateWebsite(id: string, tenantId: string): Promise<boolean> {
    const db = getTenantDb();
    const existing = await db.query<{ tenant_id: string }>(
      "SELECT tenant_id FROM websites WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existing[0] || existing[0].tenant_id !== tenantId) return false;

    await db.run("UPDATE websites SET is_active = 0 WHERE id = ?", [id]);
    return true;
  }

  async getWebsiteFields(websiteId: string): Promise<WebsiteField[]> {
    const db = getTenantDb();
    const rows = await db.query<WebsiteFieldRow>(
      "SELECT * FROM website_fields WHERE website_id = ? ORDER BY position ASC",
      [websiteId],
    );
    return rows.map(toWebsiteField);
  }

  async createWebsiteField(tenantId: string, input: CreateWebsiteFieldInput): Promise<WebsiteField | null> {
    const db = getTenantDb();
    const site = await db.query<{ tenant_id: string }>(
      "SELECT tenant_id FROM websites WHERE id = ? LIMIT 1",
      [input.websiteId],
    );
    if (!site[0] || site[0].tenant_id !== tenantId) return null;

    const id = crypto.randomUUID();
    await db.run(
      "INSERT INTO website_fields (id, website_id, slug, label, type, required, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, input.websiteId, input.slug, input.label, input.type, input.required ? 1 : 0, input.position ?? 0],
    );

    const rows = await db.query<WebsiteFieldRow>("SELECT * FROM website_fields WHERE id = ? LIMIT 1", [id]);
    return toWebsiteField(rows[0]);
  }

  async updateWebsiteField(
    fieldId: string,
    tenantId: string,
    input: UpdateWebsiteFieldInput,
  ): Promise<WebsiteField | null> {
    const db = getTenantDb();
    const existing = await db.query<{ website_id: string }>(
      "SELECT website_id FROM website_fields WHERE id = ? LIMIT 1",
      [fieldId],
    );
    if (!existing[0]) return null;

    const site = await db.query<{ tenant_id: string }>(
      "SELECT tenant_id FROM websites WHERE id = ? LIMIT 1",
      [existing[0].website_id],
    );
    if (!site[0] || site[0].tenant_id !== tenantId) return null;

    const updates: string[] = [];
    const params: unknown[] = [];
    if (input.label !== undefined) {
      updates.push("label = ?");
      params.push(input.label);
    }
    if (input.type !== undefined) {
      updates.push("type = ?");
      params.push(input.type);
    }
    if (input.required !== undefined) {
      updates.push("required = ?");
      params.push(input.required ? 1 : 0);
    }
    if (input.position !== undefined) {
      updates.push("position = ?");
      params.push(input.position);
    }

    if (updates.length > 0) {
      params.push(fieldId);
      await db.run(`UPDATE website_fields SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    const rows = await db.query<WebsiteFieldRow>("SELECT * FROM website_fields WHERE id = ? LIMIT 1", [
      fieldId,
    ]);
    return toWebsiteField(rows[0]);
  }

  async deleteWebsiteField(fieldId: string, tenantId: string): Promise<boolean> {
    const db = getTenantDb();
    const existing = await db.query<{ website_id: string }>(
      "SELECT website_id FROM website_fields WHERE id = ? LIMIT 1",
      [fieldId],
    );
    if (!existing[0]) return false;

    const site = await db.query<{ tenant_id: string }>(
      "SELECT tenant_id FROM websites WHERE id = ? LIMIT 1",
      [existing[0].website_id],
    );
    if (!site[0] || site[0].tenant_id !== tenantId) return false;

    await db.run("DELETE FROM website_fields WHERE id = ?", [fieldId]);
    return true;
  }
}
