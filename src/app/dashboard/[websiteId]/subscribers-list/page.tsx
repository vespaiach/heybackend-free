import { Suspense } from "react";
import TopPageBreadcrumb from "@/components/ui/top-breadcrumb";
import { subscriberService } from "@/lib/domain";
import { checkSessionAndGetWebsiteData } from "@/lib/route-helpers";
import { SubscribersTable } from "./_components/subscribers-table";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default async function SubscribersPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [website, websites] = await checkSessionAndGetWebsiteData((await params).websiteId);

  const sp = await searchParams;
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const pageSizeRaw = parseInt(typeof sp.pageSize === "string" ? sp.pageSize : "20", 10);
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSizeRaw) ? pageSizeRaw : 20;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const statusRaw = typeof sp.status === "string" ? sp.status : "all";
  const status = (["all", "active", "unsubscribed"] as const).includes(
    statusRaw as "all" | "active" | "unsubscribed",
  )
    ? (statusRaw as "all" | "active" | "unsubscribed")
    : "all";
  const sortFieldRaw = typeof sp.sortField === "string" ? sp.sortField : "createdAt";
  const sortField = (["firstName", "lastName", "createdAt"] as const).includes(
    sortFieldRaw as "firstName" | "lastName" | "createdAt",
  )
    ? (sortFieldRaw as "firstName" | "lastName" | "createdAt")
    : "createdAt";
  const sortDir = sp.sortDir === "asc" ? "asc" : ("desc" as const);
  const tagsRaw = typeof sp.tags === "string" ? sp.tags : "";
  const selectedTagIds = tagsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let subscribers: import("@/lib/domain/types").Subscriber[] = [];
  let total = 0;
  let availableTags: { id: string; name: string; color: string | null; description: string | null }[] = [];

  const [result, tags] = await Promise.all([
    subscriberService.listSubscribers({
      websiteId: website.id,
      q: q || undefined,
      status,
      sortField,
      sortDir,
      page,
      pageSize,
      tags: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    }),
    subscriberService.getTagsForWebsite(website.id),
  ]);

  subscribers = result.subscribers;
  total = result.total;
  availableTags = tags;

  return (
    <>
      <TopPageBreadcrumb website={website} websites={websites} category="Subscribers" pageTitle="List" />
      <div className="flex-1 p-4">
        <Suspense>
          <SubscribersTable
            selectedWebsiteId={website.id}
            subscribers={subscribers}
            total={total}
            page={page}
            pageSize={pageSize}
            search={{ q, status }}
            sortField={sortField}
            sortDir={sortDir}
            availableTags={availableTags}
            selectedTagIds={selectedTagIds}
          />
        </Suspense>
      </div>
    </>
  );
}
