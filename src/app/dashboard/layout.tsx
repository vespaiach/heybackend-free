import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { FirstWebsiteSetup } from "@/components/first-website-setup";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { WebsiteGuard } from "@/components/website-guard";
import { tenantService } from "@/lib/domain";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);

  if (!tenant) {
    redirect("/onboarding");
  }

  if (tenant.websites.length === 0) {
    return (
      <>
        <FirstWebsiteSetup />
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar user={{ ...session.user, name: tenant.fullName }} websites={tenant.websites} />
      <SidebarInset>
        <WebsiteGuard websites={tenant.websites}>{children}</WebsiteGuard>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
