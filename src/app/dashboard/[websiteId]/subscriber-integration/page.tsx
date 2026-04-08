import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { tenantService } from "@/lib/domain";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { IntegrationGuide } from "./components/integration-guide";

export default async function IntegrationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const wid = typeof params["wid"] === "string" ? params["wid"] : undefined;

  const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);
  if (!tenant) redirect("/onboarding");

  const resolvedId = tenant.websites.find((w) => w.id === wid)?.id;

  if (!resolvedId) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Integration</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 p-4">
          <p className="text-muted-foreground">Select a website to view the integration guide.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Integration</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex-1 p-4 pb-10">
        <div className="mb-10 space-y-1">
          <h1 className="text-xl font-semibold">Subscriber Implementation Guide</h1>
          <p className="text-sm text-muted-foreground">
            This guide outlines the required integration flow for the Subscriber API. To ensure security and
            data consistency, all subscription requests must be handled through the functions exposed in
            bff.js rather than via direct API calls.
          </p>
        </div>

        <IntegrationGuide websiteId={resolvedId} />
      </main>
    </>
  );
}
