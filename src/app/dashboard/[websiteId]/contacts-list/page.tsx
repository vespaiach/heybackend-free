import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { contactRequestService, tenantService } from "@/lib/domain";
import type { ContactRequest } from "@/lib/domain/types";
import { ContactsActiveFilters } from "./_components/contacts-active-filters";
import { ContactsFilterPopover } from "./_components/contacts-filter-popover";
import { ContactsTable } from "./_components/contacts-table";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { websiteId } = await params;
  const sp = await searchParams;

  // Parse and validate search params
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const pageSizeRaw = parseInt(typeof sp.pageSize === "string" ? sp.pageSize : "20", 10);
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSizeRaw) ? pageSizeRaw : 20;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const country = typeof sp.country === "string" ? sp.country : "";
  const readStatusRaw = typeof sp.readStatus === "string" ? sp.readStatus : "all";
  const readStatus = (["all", "read", "unread"] as const).includes(readStatusRaw as "all" | "read" | "unread")
    ? (readStatusRaw as "all" | "read" | "unread")
    : "all";
  const sortFieldRaw = typeof sp.sortField === "string" ? sp.sortField : "createdAt";
  const sortField = (["name", "email", "country", "createdAt"] as const).includes(
    sortFieldRaw as "name" | "email" | "country" | "createdAt",
  )
    ? (sortFieldRaw as "name" | "email" | "country" | "createdAt")
    : "createdAt";
  const sortDir = sp.sortDir === "asc" ? ("asc" as const) : ("desc" as const);

  // Get tenant and verify website access
  const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);

  if (!tenant) redirect("/onboarding");

  const resolvedId = tenant.websites.find((w) => w.id === websiteId)?.id;

  let contacts: ContactRequest[] = [];
  let total = 0;
  let availableCountries: string[] = [];

  if (resolvedId) {
    const [result, countries] = await Promise.all([
      contactRequestService.listContactRequests({
        websiteId: resolvedId,
        q: q || undefined,
        country: country || undefined,
        readStatus,
        sortField,
        sortDir,
        page,
        pageSize,
      }),
      // Get unique countries from all contacts
      contactRequestService
        .listContactRequests({
          websiteId: resolvedId,
          pageSize: 1000,
        })
        .then(
          (r) =>
            [
              ...new Set(
                r.contactRequests
                  .map((c) => c.country)
                  .filter((country): country is string => country !== null),
              ),
            ] as string[],
        ),
    ]);

    contacts = result.contactRequests;
    total = result.total;
    availableCountries = countries;
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Contacts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex-1 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Contacts</h1>
          <ContactsFilterPopover availableCountries={availableCountries} onFilterChange={() => {}} />
        </div>

        <ContactsActiveFilters search={{ q, readStatus }} country={country} onRemoveFilter={() => {}} />

        <Suspense fallback={<div>Loading...</div>}>
          <ContactsTable
            selectedWebsiteId={resolvedId ?? ""}
            contacts={contacts}
            total={total}
            page={page}
            pageSize={pageSize}
            sortField={sortField}
            sortDir={sortDir}
            availableCountries={availableCountries}
          />
        </Suspense>
      </main>
    </>
  );
}
