import { getTenantDb } from "@/lib/d1";
import type { Tenant, TenantWithWebsites, UpsertTenantInput } from "@/lib/domain/types";
import type { TenantService } from "./tenant-service.interface";

type TenantRow = {
  id: string;
  full_name: string;
  email: string;
  user_id: string;
  created_at: string;
};

type WebsiteRow = {
  id: string;
  name: string;
  url: string;
  key: string;
  is_active: number;
  tenant_id: string;
  created_at: string;
};

function toTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
  };
}

function toWebsite(row: WebsiteRow) {
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

export class D1TenantService implements TenantService {
  async getTenantWithWebsitesByUserId(userId: string): Promise<TenantWithWebsites | null> {
    const db = getTenantDb();
    const tenants = await db.query<TenantRow>("SELECT * FROM tenants WHERE user_id = ? LIMIT 1", [userId]);
    if (!tenants[0]) return null;
    const tenant = toTenant(tenants[0]);

    const websites = await db.query<WebsiteRow>(
      "SELECT * FROM websites WHERE tenant_id = ? ORDER BY created_at DESC",
      [tenant.id],
    );

    return { ...tenant, websites: websites.map(toWebsite) };
  }

  async getTenantByUserId(userId: string): Promise<Tenant | null> {
    const db = getTenantDb();
    const rows = await db.query<TenantRow>("SELECT * FROM tenants WHERE user_id = ? LIMIT 1", [userId]);
    return rows[0] ? toTenant(rows[0]) : null;
  }

  async getTenantIdByUserId(userId: string): Promise<string> {
    const db = getTenantDb();
    const rows = await db.query<{ id: string }>("SELECT id FROM tenants WHERE user_id = ? LIMIT 1", [userId]);
    if (!rows[0]) throw new Error("Tenant not found");
    return rows[0].id;
  }

  async upsertTenant(input: UpsertTenantInput): Promise<Tenant> {
    const db = getTenantDb();

    const users = await db.query<{ id: string }>("SELECT id FROM users WHERE id = ? LIMIT 1", [input.userId]);
    if (!users[0]) throw new Error("User not found");

    const existing = await db.query<TenantRow>("SELECT * FROM tenants WHERE user_id = ? LIMIT 1", [
      input.userId,
    ]);

    if (existing[0]) {
      await db.run("UPDATE tenants SET full_name = ? WHERE user_id = ?", [input.fullName, input.userId]);
    } else {
      const id = crypto.randomUUID();
      await db.run("INSERT INTO tenants (id, full_name, email, user_id) VALUES (?, ?, ?, ?)", [
        id,
        input.fullName,
        input.email,
        input.userId,
      ]);
    }

    // Keep users.name in sync so it flows into the JWT session
    await db.run("UPDATE users SET name = ? WHERE id = ?", [input.fullName, input.userId]);

    const rows = await db.query<TenantRow>("SELECT * FROM tenants WHERE user_id = ? LIMIT 1", [input.userId]);
    return toTenant(rows[0]);
  }
}
