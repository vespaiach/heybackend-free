"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchXIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { type PageSizeOption, PaginationBar } from "@/components/pagination-bar";
import { RelativeDate } from "@/components/relative-date";
import { TablePageHeader } from "@/components/table-page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/tables";
import { getCountryFlag } from "@/lib/country-flags";
import type { ContactRequest } from "@/lib/domain/types";
import { downloadCsv } from "@/lib/export-csv";
import { exportContacts } from "../actions";
import { ContactDetailModal } from "./contact-detail-modal";
import { ContactsActiveFilters } from "./contacts-active-filters";
import { type ContactFilterValues, ContactsFilterPopover } from "./contacts-filter-popover";

export type ContactSortField = "name" | "email" | "country" | "createdAt";
export type ContactSortDir = "asc" | "desc";

interface ContactsTableProps {
  selectedWebsiteId: string;
  contacts: ContactRequest[];
  total: number;
  page: number;
  pageSize: number;
  search: { q: string; readStatus: "all" | "read" | "unread" };
  company: string;
  sortField: ContactSortField;
  sortDir: ContactSortDir;
  availableCompanies: string[];
}

type ColumnKey = "name" | "email" | "company" | "country" | "createdAt" | "readStatus";

const COLUMNS = [
  { key: "name" as const, label: "Name", defaultVisible: true },
  { key: "email" as const, label: "Email", defaultVisible: true },
  { key: "company" as const, label: "Company", defaultVisible: true },
  { key: "country" as const, label: "Country", defaultVisible: false },
  { key: "createdAt" as const, label: "Created Date", defaultVisible: true },
  { key: "readStatus" as const, label: "Read Status", defaultVisible: true },
] as const;

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: ContactSortField;
  sortField: ContactSortField;
  sortDir: ContactSortDir;
}) {
  if (field !== sortField) return <ArrowUpDownIcon className="ml-1 inline-block h-3 w-3 opacity-50" />;
  return sortDir === "asc" ? (
    <ArrowUpIcon className="ml-1 inline-block h-3 w-3" />
  ) : (
    <ArrowDownIcon className="ml-1 inline-block h-3 w-3" />
  );
}

export function ContactsTable({
  selectedWebsiteId,
  contacts,
  total,
  page,
  pageSize,
  search,
  company,
  sortField,
  sortDir,
  availableCompanies,
}: ContactsTableProps) {
  const router = useRouter();
  const [selectedContact, setSelectedContact] = React.useState<ContactRequest | null>(null);
  const [isPagePending, startPageTransition] = React.useTransition();
  const [isExportPending, startExportTransition] = React.useTransition();
  const [visibleColumns, setVisibleColumns] = React.useState<Set<ColumnKey>>(() => {
    const visible = new Set<ColumnKey>();
    COLUMNS.forEach((col) => {
      if (col.defaultVisible) {
        visible.add(col.key);
      }
    });
    return visible;
  });

  const baseUrl = `/dashboard/${selectedWebsiteId}/contacts-list`;
  const hasActiveFilters = search.q !== "" || search.readStatus !== "all" || company !== "";

  function handleToggleColumn(key: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key as ColumnKey)) {
        next.delete(key as ColumnKey);
      } else {
        next.add(key as ColumnKey);
      }
      return next;
    });
  }

  function handleExport() {
    startExportTransition(async () => {
      const result = await exportContacts({
        websiteId: selectedWebsiteId,
        q: search.q || undefined,
        company: company || undefined,
        readStatus: search.readStatus,
        sortField,
        sortDir,
      });
      if ("error" in result) return;
      const rows = result.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company,
        phone: c.phone,
        message: c.message,
        country: c.country,
        region: c.region,
        city: c.city,
        timezone: c.timezone,
        os: c.os,
        deviceType: c.deviceType,
        browser: c.browser,
        readStatus: c.readAt ? "read" : "unread",
        readAt: c.readAt,
        createdAt: c.createdAt,
      }));
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(rows, `contacts-${selectedWebsiteId}-${date}.csv`);
    });
  }

  function buildParams(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search.q) params.set("q", search.q);
    if (search.readStatus !== "all") params.set("readStatus", search.readStatus);
    if (company) params.set("company", company);
    params.set("sortField", sortField);
    params.set("sortDir", sortDir);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return params.toString();
  }

  function toggleSort(field: ContactSortField) {
    const newDir = field === sortField && sortDir === "asc" ? "desc" : "asc";
    startPageTransition(() => {
      router.push(`${baseUrl}?${buildParams({ sortField: field, sortDir: newDir, page: "1" })}`);
    });
  }

  function handlePageChange(newPage: number) {
    startPageTransition(() => {
      router.push(`${baseUrl}?${buildParams({ page: String(newPage) })}`);
    });
  }

  function handlePageSizeChange(newPageSize: PageSizeOption) {
    startPageTransition(() => {
      router.push(`${baseUrl}?${buildParams({ page: "1", pageSize: String(newPageSize) })}`);
    });
  }

  function handleApplyFilters(filters: ContactFilterValues) {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    params.set("sortField", sortField);
    params.set("sortDir", sortDir);
    if (filters.query) params.set("q", filters.query);
    if (filters.company && filters.company !== "__all__") params.set("company", filters.company);
    if (filters.readStatus !== "all") params.set("readStatus", filters.readStatus);
    router.push(`${baseUrl}?${params.toString()}`);
  }

  function handleResetAllFilters() {
    router.push(
      `${baseUrl}?${buildParams({
        page: "1",
        q: "",
        readStatus: "",
        company: "",
      })}`,
    );
  }

  function handleRemoveFilter(type: "query" | "readStatus" | "company") {
    router.push(
      `${baseUrl}?${buildParams({
        page: "1",
        q: type === "query" ? "" : search.q,
        readStatus: type === "readStatus" ? "" : search.readStatus === "all" ? "" : search.readStatus,
        company: type === "company" ? "" : company,
      })}`,
    );
  }

  return (
    <div className="space-y-4">
      <TablePageHeader
        title="Contacts"
        description="Contact requests submitted through your website."
        columns={COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
        filterSlot={
          <ContactsFilterPopover
            availableCompanies={availableCompanies}
            currentFilters={{
              query: search.q,
              company: company || "__all__",
              readStatus: search.readStatus,
            }}
            total={total}
            hasActiveFilters={hasActiveFilters}
            onApply={handleApplyFilters}
            onReset={handleResetAllFilters}
          />
        }
        activeFiltersContent={
          hasActiveFilters ? (
            <ContactsActiveFilters
              search={search}
              company={company}
              onRemoveFilter={handleRemoveFilter}
              onResetAll={handleResetAllFilters}
            />
          ) : undefined
        }
        onExport={handleExport}
        isExportPending={isExportPending}
      />
      {contacts.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SearchXIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="mb-1 text-base font-medium">No contacts found</h3>
          <p className="mb-4 text-sm text-muted-foreground">No results match your current filters.</p>
          <Button variant="outline" size="sm" onClick={handleResetAllFilters}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.has("name") && (
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => toggleSort("name")}>
                      Name <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.has("email") && (
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => toggleSort("email")}>
                      Email <SortIcon field="email" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.has("company") && <TableHead>Company</TableHead>}
                {visibleColumns.has("country") && <TableHead>Country</TableHead>}
                {visibleColumns.has("createdAt") && (
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => toggleSort("createdAt")}>
                      Created At <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.has("readStatus") && <TableHead>Read At</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedContact(contact);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Contact from ${contact.name}`}
                  className="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                  {visibleColumns.has("name") && <TableCell>{contact.name}</TableCell>}
                  {visibleColumns.has("email") && <TableCell>{contact.email}</TableCell>}
                  {visibleColumns.has("company") && <TableCell>{contact.company || "-"}</TableCell>}
                  {visibleColumns.has("country") && (
                    <TableCell>
                      {contact.country ? (
                        <span>
                          {getCountryFlag(contact.country)} {contact.country}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.has("createdAt") && (
                    <TableCell>
                      <RelativeDate date={contact.createdAt} />
                    </TableCell>
                  )}
                  {visibleColumns.has("readStatus") && (
                    <TableCell>
                      {contact.readAt ? <ReadIcon readAt={contact.readAt} /> : "-- Unread --"}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          open={!!selectedContact}
          onOpenChange={(open) => {
            if (!open) setSelectedContact(null);
          }}
        />
      )}

      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isPagePending}
      />
    </div>
  );
}

function ReadIcon({ readAt }: { readAt: Date }) {
  return (
    <div className="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15" fill="none" width="14" height="14">
        <title>Read At</title>
        <path
          fill="currentColor"
          d="M7.16016 0.118583C7.41609 0.026115 7.70086 0.0422529 7.94727 0.165458L14.4473 3.41546L14.5684 3.48675C14.8359 3.67163 14.9999 3.97791 15 4.30901V12.0004C14.9998 12.5525 14.5521 13.0004 14 13.0004H1C0.447856 13.0004 0.00022869 12.5525 0 12.0004V4.30901C0.00015935 3.93055 0.214303 3.58486 0.552734 3.41546L7.05273 0.165458L7.16016 0.118583ZM7.70996 8.19866C7.57876 8.26772 7.42124 8.26772 7.29004 8.19866L1 4.88421V12.0004H14V4.88421L7.70996 8.19866ZM1.43066 4.09319L7.5 7.29143L13.5684 4.09319L7.5 1.05901L1.43066 4.09319Z"
        />
      </svg>
      <RelativeDate date={readAt} />
    </div>
  );
}
