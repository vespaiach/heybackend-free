import { cache } from "react";
import type { Tenant, TenantWithWebsites, UpsertTenantInput } from "@/lib/domain/types";
import { prisma } from "@/lib/prisma";
import type { TenantService } from "./tenant-service.interface";

function toWebsite(w: {
  id: string;
  name: string;
  url: string;
  key: string;
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
}) {
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

function toTenant(t: {
  id: string;
  fullName: string;
  email: string;
  userId: string;
  createdAt: Date;
}): Tenant {
  return {
    id: t.id,
    fullName: t.fullName,
    email: t.email,
    userId: t.userId,
    createdAt: t.createdAt,
  };
}

export class PrismaTenantService implements TenantService {
  getTenantWithWebsitesByUserId = cache(async (userId: string): Promise<TenantWithWebsites | null> => {
    const tenant = await prisma.tenant.findUnique({
      where: { userId },
      include: { websites: { orderBy: { createdAt: "desc" } } },
    });
    if (!tenant) return null;
    return { ...toTenant(tenant), websites: tenant.websites.map(toWebsite) };
  });

  getTenantByUserId = cache(async (userId: string): Promise<Tenant | null> => {
    const tenant = await prisma.tenant.findUnique({ where: { userId } });
    return tenant ? toTenant(tenant) : null;
  });

  getTenantIdByUserId = cache(async (userId: string): Promise<string> => {
    const tenant = await prisma.tenant.findUnique({ where: { userId }, select: { id: true } });
    if (!tenant) throw new Error("Tenant not found");
    return tenant.id;
  });

  async upsertTenant(input: UpsertTenantInput): Promise<Tenant> {
    const tenant = await prisma.tenant.upsert({
      where: { userId: input.userId },
      update: { fullName: input.fullName },
      create: { userId: input.userId, email: input.email, fullName: input.fullName },
    });

    // Keep User.name in sync so it flows into the JWT session
    await prisma.user.update({ where: { id: input.userId }, data: { name: input.fullName } });

    return toTenant(tenant);
  }
}
