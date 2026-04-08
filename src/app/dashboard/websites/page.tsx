import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { tenantService } from "@/lib/domain";
import { WebsitesTable } from "./websites-table";

export default async function WebsitesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);

  if (!tenant) {
    redirect("/onboarding");
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Websites</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <main className="flex-1 p-4">
        <Suspense>
          <WebsitesTable websites={tenant.websites} />
        </Suspense>
      </main>
    </>
  );
}
