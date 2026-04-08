"use server";

import { redirect } from "next/navigation";
import * as v from "valibot";
import { auth } from "@/auth";
import { tenantService, websiteService } from "@/lib/domain";
import { logger } from "@/lib/logger";
import { type OnboardingInput, OnboardingSchema } from "./schema";

export async function createTenant(input: OnboardingInput) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  const { fullName, websites } = v.parse(OnboardingSchema, input);

  try {
    const tenant = await tenantService.upsertTenant({
      userId: session.user.id,
      email: session.user.email,
      fullName,
    });

    // Create any initial websites sequentially (each provisions a D1 database)
    for (const site of websites) {
      const normalizedUrl = new URL(site.url).origin;
      await websiteService.createWebsite({ name: site.name, url: normalizedUrl, tenantId: tenant.id });
    }
  } catch (err) {
    if (err instanceof Error && err.message === "User not found") {
      redirect("/login");
    }
    logger.error("createTenant", err);
    throw err;
  }

  redirect("/dashboard/home");
}
