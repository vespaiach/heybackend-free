import { Suspense } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { contactRequestService } from "@/lib/domain";
import type { ContactRequest } from "@/lib/domain/types";
import { getWebsite } from "@/lib/route-helpers";
import { ContactsTable } from "./_components/contacts-table";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { websiteId } = await params;
  const website = await getWebsite(websiteId);
  const sp = await searchParams;

  // Parse and validate search params
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const pageSizeRaw = parseInt(typeof sp.pageSize === "string" ? sp.pageSize : "20", 10);
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSizeRaw) ? pageSizeRaw : 20;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const company = typeof sp.company === "string" ? sp.company : "";
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

  let contacts: ContactRequest[] = [];
  let total = 0;
  let availableCompanies: string[] = [];

  const [result, companies] = await Promise.all([
    contactRequestService.listContactRequests({
      websiteId: (await getWebsite(websiteId)).id,
      q: q || undefined,
      company: company || undefined,
      readStatus,
      sortField,
      sortDir,
      page,
      pageSize,
    }),
    // Get unique companies from all contacts
    contactRequestService
      .listContactRequests({
        websiteId: (await getWebsite(websiteId)).id,
        pageSize: 1000,
      })
      .then(
        (r) =>
          [
            ...new Set(
              r.contactRequests
                .map((c) => c.company)
                .filter((company): company is string => company !== null),
            ),
          ] as string[],
      ),
  ]);

  contacts = result.contactRequests;
  total = result.total;
  availableCompanies = companies;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>{website.name}</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Contacts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex-1 p-4">
        <Suspense fallback={<div>Loading...</div>}>
          <ContactsTable
            selectedWebsiteId={(await getWebsite(websiteId)).id}
            contacts={contacts}
            total={total}
            page={page}
            pageSize={pageSize}
            search={{ q, readStatus }}
            company={company}
            sortField={sortField}
            sortDir={sortDir}
            availableCompanies={availableCompanies}
          />
        </Suspense>
      </main>
    </>
  );
}
