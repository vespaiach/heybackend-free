"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { type PageSizeOption, PaginationBar } from "@/components/pagination-bar";
import { RelativeDate } from "@/components/relative-date";
import { TablePageHeader } from "@/components/table-page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ContactRequest } from "@/lib/domain/types";
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
  country: string;
  sortField: ContactSortField;
  sortDir: ContactSortDir;
  availableCountries: string[];
}

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
  country,
  sortField,
  sortDir,
  availableCountries,
}: ContactsTableProps) {
  const router = useRouter();
  const [selectedContact, setSelectedContact] = React.useState<ContactRequest | null>(null);
  const [isPagePending, startPageTransition] = React.useTransition();

  const baseUrl = `/dashboard/${selectedWebsiteId}/contacts-list`;
  const hasActiveFilters = search.q !== "" || search.readStatus !== "all" || country !== "";

  function buildParams(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search.q) params.set("q", search.q);
    if (search.readStatus !== "all") params.set("readStatus", search.readStatus);
    if (country) params.set("country", country);
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
    if (filters.country && filters.country !== "__all__") params.set("country", filters.country);
    if (filters.readStatus !== "all") params.set("readStatus", filters.readStatus);
    router.push(`${baseUrl}?${params.toString()}`);
  }

  function handleResetAllFilters() {
    router.push(
      `${baseUrl}?${buildParams({
        page: "1",
        q: "",
        readStatus: "",
        country: "",
      })}`,
    );
  }

  function handleRemoveFilter(type: "query" | "readStatus" | "country") {
    router.push(
      `${baseUrl}?${buildParams({
        page: "1",
        q: type === "query" ? "" : search.q,
        readStatus: type === "readStatus" ? "" : search.readStatus === "all" ? "" : search.readStatus,
        country: type === "country" ? "" : country,
      })}`,
    );
  }

  return (
    <div className="space-y-4">
      <TablePageHeader
        title="Contacts"
        description="Contact requests submitted through your website."
        filterSlot={
          <ContactsFilterPopover
            availableCountries={availableCountries}
            currentFilters={{
              query: search.q,
              country: country || "__all__",
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
              country={country}
              onRemoveFilter={handleRemoveFilter}
              onResetAll={handleResetAllFilters}
            />
          ) : undefined
        }
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                type="button"
                className="flex items-center font-medium hover:text-foreground"
                onClick={() => toggleSort("name")}>
                Name <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead>
              <button
                type="button"
                className="flex items-center font-medium hover:text-foreground"
                onClick={() => toggleSort("email")}>
                Email <SortIcon field="email" sortField={sortField} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead>Company</TableHead>
            <TableHead>
              <button
                type="button"
                className="flex items-center font-medium hover:text-foreground"
                onClick={() => toggleSort("country")}>
                Country <SortIcon field="country" sortField={sortField} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead>
              <button
                type="button"
                className="flex items-center font-medium hover:text-foreground"
                onClick={() => toggleSort("createdAt")}>
                Created Date <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead>Read Status</TableHead>
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
              <TableCell>{contact.name}</TableCell>
              <TableCell>{contact.email}</TableCell>
              <TableCell>{contact.company || "-"}</TableCell>
              <TableCell>{contact.country || "-"}</TableCell>
              <TableCell>
                <RelativeDate date={contact.createdAt} />
              </TableCell>
              <TableCell>
                {contact.readAt ? (
                  <Badge variant="secondary">
                    Read on <RelativeDate date={contact.readAt} />
                  </Badge>
                ) : (
                  <Badge variant="destructive">Unread</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
