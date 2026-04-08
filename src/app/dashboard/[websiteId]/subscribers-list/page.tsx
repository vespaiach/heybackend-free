import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { subscriberService, tenantService, websiteService } from "@/lib/domain";
import { SubscribersTable } from "./subscribers-table";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const wid = typeof params.wid === "string" ? params.wid : undefined;
  const page = Math.max(1, parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const pageSizeRaw = parseInt(typeof params.pageSize === "string" ? params.pageSize : "20", 10);
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSizeRaw) ? pageSizeRaw : 20;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const statusRaw = typeof params.status === "string" ? params.status : "all";
  const status = (["all", "active", "unsubscribed"] as const).includes(
    statusRaw as "all" | "active" | "unsubscribed",
  )
    ? (statusRaw as "all" | "active" | "unsubscribed")
    : "all";
  const sortFieldRaw = typeof params.sortField === "string" ? params.sortField : "createdAt";
  const sortField = (["firstName", "lastName", "createdAt"] as const).includes(
    sortFieldRaw as "firstName" | "lastName" | "createdAt",
  )
    ? (sortFieldRaw as "firstName" | "lastName" | "createdAt")
    : "createdAt";
  const sortDir = params.sortDir === "asc" ? "asc" : ("desc" as const);
  const tagsRaw = typeof params.tags === "string" ? params.tags : "";
  const selectedTagIds = tagsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);

  if (!tenant) redirect("/onboarding");

  const resolvedId = tenant.websites.find((w) => w.id === wid)?.id;

  let subscribers: import("@/lib/domain/types").Subscriber[] = [];
  let total = 0;
  let availableTags: { id: string; name: string; color: string | null; description: string | null }[] = [];
  let websiteFields: import("@/lib/domain/types").WebsiteField[] = [];

  if (resolvedId) {
    const [result, tags, fields] = await Promise.all([
      subscriberService.listSubscribers({
        websiteId: resolvedId,
        q: q || undefined,
        status,
        sortField,
        sortDir,
        page,
        pageSize,
        tags: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      }),
      subscriberService.getTagsForWebsite(resolvedId),
      websiteService.getWebsiteFields(resolvedId),
    ]);

    subscribers = result.subscribers;
    total = result.total;
    availableTags = tags;
    websiteFields = fields;
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Subscribers</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <main className="flex-1 p-4">
        <Suspense>
          <SubscribersTable
            selectedWebsiteId={resolvedId ?? ""}
            subscribers={subscribers}
            total={total}
            page={page}
            pageSize={pageSize}
            search={{ q, status }}
            sortField={sortField}
            sortDir={sortDir}
            availableTags={availableTags}
            selectedTagIds={selectedTagIds}
            websiteFields={websiteFields}
          />
        </Suspense>
      </main>
    </>
  );
}
