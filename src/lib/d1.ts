// ─── D1 REST API client ────────────────────────────────────────────────────────
//
// All database access goes through this module. Never import lib/db anywhere.
//
// Two contexts:
//   tenantsDb  — the shared bff-tenants D1 database (auth, tenant, website metadata)
//   getWebsiteDb(websiteId) — per-website D1 database (subscribers, contacts, tags)
//
// Environment variables required:
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_API_TOKEN   — must have D1:read, D1:write, D1:edit permissions
//   CLOUDFLARE_D1_TENANTS_DB_ID    — the UUID of the bff-tenants database

interface D1Meta {
  changes: number;
  last_row_id: number;
  rows_read: number;
  rows_written: number;
}

interface D1ResultItem<T> {
  results: T[];
  success: boolean;
  errors: { code: number; message: string }[];
  meta: D1Meta;
}

interface D1ApiResponse<T> {
  result: D1ResultItem<T>[];
  success: boolean;
  errors: { code: number; message: string }[];
}

export interface D1Client {
  /** Run a SELECT — returns an array of row objects. */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;

  /** Run an INSERT / UPDATE / DELETE — returns mutation metadata. */
  run(sql: string, params?: unknown[]): Promise<{ changes: number; lastRowId: number }>;

  /** Run multiple statements atomically (batch endpoint). */
  batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<void>;

  /** The raw Cloudflare database UUID for this client (needed to provision sub-DBs). */
  readonly databaseId: string;
}

function cfBase(): string {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) throw new Error("CLOUDFLARE_ACCOUNT_ID is not set");
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`;
}

function cfHeaders(): HeadersInit {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN is not set");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export function createD1Client(databaseId: string): D1Client {
  const base = () => `${cfBase()}/${databaseId}`;

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await fetch(`${base()}/query`, {
      method: "POST",
      headers: cfHeaders(),
      body: JSON.stringify({ sql, params }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`D1 query failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as D1ApiResponse<T>;
    if (!data.success || !data.result[0]?.success) {
      throw new Error(`D1 query error: ${JSON.stringify(data.errors ?? data.result?.[0]?.errors)}`);
    }
    return data.result[0].results;
  }

  async function run(sql: string, params: unknown[] = []): Promise<{ changes: number; lastRowId: number }> {
    const res = await fetch(`${base()}/query`, {
      method: "POST",
      headers: cfHeaders(),
      body: JSON.stringify({ sql, params }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`D1 run failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as D1ApiResponse<never>;
    if (!data.success || !data.result[0]?.success) {
      throw new Error(`D1 run error: ${JSON.stringify(data.errors ?? data.result?.[0]?.errors)}`);
    }
    const meta = data.result[0].meta;
    return { changes: meta.changes, lastRowId: meta.last_row_id };
  }

  async function batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<void> {
    const res = await fetch(`${base()}/query`, {
      method: "POST",
      headers: cfHeaders(),
      body: JSON.stringify({ batch: statements.map((s) => ({ sql: s.sql, params: s.params ?? [] })) }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`D1 batch failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as D1ApiResponse<never>;
    if (!data.success) {
      throw new Error(`D1 batch error: ${JSON.stringify(data.errors)}`);
    }
  }

  return { query, run, batch, databaseId };
}

// ─── Shared tenant DB ──────────────────────────────────────────────────────────

/** Returns a D1Client for the shared bff-tenants database. */
export function getTenantDb(): D1Client {
  const id = process.env.CLOUDFLARE_D1_TENANTS_DB_ID;
  if (!id) throw new Error("CLOUDFLARE_D1_TENANTS_DB_ID is not set");
  return createD1Client(id);
}

// ─── Per-website DB lookup ─────────────────────────────────────────────────────
// Each website has its own D1 database. The Cloudflare UUID for that database
// is stored in the websites table of bff-tenants under d1_database_id.

const websiteDbCache = new Map<string, string>(); // websiteId → d1DatabaseId

export async function getWebsiteDb(websiteId: string): Promise<D1Client> {
  let d1DatabaseId = websiteDbCache.get(websiteId);
  if (!d1DatabaseId) {
    const db = getTenantDb();
    const rows = await db.query<{ d1_database_id: string }>(
      "SELECT d1_database_id FROM websites WHERE id = ? LIMIT 1",
      [websiteId],
    );
    if (!rows[0]?.d1_database_id) throw new Error(`Website ${websiteId} not found or not provisioned`);
    d1DatabaseId = rows[0].d1_database_id;
    websiteDbCache.set(websiteId, d1DatabaseId);
  }
  return createD1Client(d1DatabaseId);
}

// ─── Cloudflare D1 provisioning (used by website-service on website create) ────

export async function provisionD1Database(name: string): Promise<string> {
  const res = await fetch(cfBase(), {
    method: "POST",
    headers: cfHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 provision failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { result: { uuid: string } };
  return data.result.uuid;
}
