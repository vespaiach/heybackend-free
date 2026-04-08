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

export async function getLoggedInTenant(userId: string) {
  const tenant = await tenantService.getTenantWithWebsitesByUserId(userId);

  if (!tenant) {
    redirect("/onboarding");
  }

  return tenant;
}
