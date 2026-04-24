import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltips";
import { WebsiteSelectDialog } from "@/components/website-select-dialog";
import { tenantService } from "@/lib/domain";

export default async function DashboardLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ websiteId: string }>;
}>) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);
  if (!tenant) {
    redirect("/onboarding");
  }

  const { websiteId } = await params;
  const isWebsiteIdValid = tenant.websites.some((w) => w.id === websiteId);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          user={{ ...session.user, name: tenant.fullName }}
          websites={tenant.websites}
          websiteId={websiteId}
        />
        <SidebarInset>
          {isWebsiteIdValid && children}
          {!isWebsiteIdValid && <WebsiteSelectDialog websites={tenant.websites} />}
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  );
}
