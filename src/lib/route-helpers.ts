import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { tenantService } from "@/lib/domain";

export async function getSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session as NonNullable<{ user: { id: string } }>;
}

export async function getLoggedInTenant() {
  const session = await getSession();
  const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);

  if (!tenant) {
    redirect("/onboarding");
  }

  return tenant;
}

export async function getWebsitesForLoggedInTenant() {
  const tenant = await getLoggedInTenant();
  return tenant.websites;
}

export async function getWebsite(websiteId: string) {
  const websites = await getWebsitesForLoggedInTenant();
  const website = websites.find((w) => w.id === websiteId);
  if (!website) redirect("/onboarding");
  return website;
}

export async function checkSessionAndGetWebsiteData(websiteIdParam: string) {
  const websites = await getWebsitesForLoggedInTenant();
  if (websites.length === 0) {
    redirect("/onboarding");
  }

  const website = websites.find((w) => w.id === websiteIdParam);
  if (!website) redirect("/onboarding");
  return [website, websites] as const;
}
