"use client";

import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  SearchXIcon,
  TagIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ManageTagsDialog } from "@/components/manage-tags-dialog";
import { type PageSizeOption, PaginationBar } from "@/components/pagination-bar";
import { RelativeDate } from "@/components/relative-date";
import { TablePageHeader } from "@/components/table-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadCsv } from "@/lib/export-csv";
import { formatDate } from "@/lib/utils";
import {
  addTagToSubscriber,
  bulkAddTag,
  bulkRemoveTag,
  bulkResubscribeSubscribers,
  bulkUnsubscribeSubscribers,
  exportSubscribers,
  removeTagFromSubscriber,
} from "../actions";
import { type Subscriber, SubscriberDetailPanel, type Tag } from "./subscriber-detail-dialog";
import { SubscribersActiveFilters } from "./subscribers-active-filters";
import { SubscribersBulkActionBar } from "./subscribers-bulk-action-bar";
import { type StatusFilter, SubscribersFilterPopover } from "./subscribers-filter-popover";

type ColumnKey = "firstName" | "lastName" | "email" | "createdAt" | "unsubscribedAt" | "tags";

const COLUMNS: readonly { key: ColumnKey; label: string; defaultVisible: boolean }[] = [
  { key: "firstName", label: "First Name", defaultVisible: true },
  { key: "lastName", label: "Last Name", defaultVisible: true },
  { key: "email", label: "Email", defaultVisible: true },
  { key: "createdAt", label: "Subscribed At", defaultVisible: true },
  { key: "unsubscribedAt", label: "Unsubscribed At", defaultVisible: false },
  { key: "tags", label: "Tags", defaultVisible: true },
] as const;

interface SubscribersTableProps {
  selectedWebsiteId: string;
  subscribers: Subscriber[];
  total: number;
  page: number;
  pageSize: number;
  search: { q: string; status: StatusFilter };
  sortField: SortField;
  sortDir: SortDir;
  availableTags: Tag[];
  selectedTagIds: string[];
}

export type SortField = "firstName" | "lastName" | "createdAt";
export type SortDir = "asc" | "desc";

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
}) {
  if (field !== sortField) return <ArrowUpDownIcon className="ml-1 inline-block h-3 w-3 opacity-50" />;
  return sortDir === "asc" ? (
    <ArrowUpIcon className="ml-1 inline-block h-3 w-3" />
  ) : (
    <ArrowDownIcon className="ml-1 inline-block h-3 w-3" />
  );
}

export function SubscribersTable({
  selectedWebsiteId,
  subscribers,
  total,
  page,
  pageSize,
  search,
  sortField,
  sortDir,
  availableTags,
  selectedTagIds,
}: SubscribersTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [detailSubscriberId, setDetailSubscriberId] = React.useState<string | null>(null);
  const [manageTagsForId, setManageTagsForId] = React.useState<string | null>(null);
  const [isBulkPending, startBulkTransition] = React.useTransition();
  const [isPagePending, startPageTransition] = React.useTransition();
  const [isManageTagsPending, startManageTagsTransition] = React.useTransition();
  const [isExportPending, startExportTransition] = React.useTransition();
  const [visibleColumns, setVisibleColumns] = React.useState<Set<ColumnKey>>(
    () => new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)),
  );
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = React.useState(false);
  const [bulkConfirmAction, setBulkConfirmAction] = React.useState<"unsubscribe" | "resubscribe" | null>(
    null,
  );

  const hasActiveFilters = search.q !== "" || search.status !== "all" || selectedTagIds.length > 0;

  const selectedSubscriberTags = React.useMemo(() => {
    const tagMap = new Map<string, Tag>();
    for (const sub of subscribers) {
      if (selectedIds.has(sub.id)) {
        for (const tag of sub.tags) {
          tagMap.set(tag.id, tag);
        }
      }
    }
    return [...tagMap.values()];
  }, [subscribers, selectedIds]);

  const baseUrl = `/dashboard/${selectedWebsiteId}/subscribers-list`;

  function buildParams(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search.q) params.set("q", search.q);
    if (search.status !== "all") params.set("status", search.status);
    if (selectedTagIds.length > 0) params.set("tags", selectedTagIds.join(","));
    params.set("sortField", sortField);
    params.set("sortDir", sortDir);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return params.toString();
  }

  function toggleSort(field: SortField) {
    const newDir = field === sortField && sortDir === "asc" ? "desc" : field === sortField ? "asc" : "asc";
    router.push(`${baseUrl}?${buildParams({ sortField: field, sortDir: newDir, page: "1" })}`);
  }

  function handleApplyFilters(filters: { query: string; status: StatusFilter; tagIds: string[] }) {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    if (filters.query) params.set("q", filters.query);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.tagIds.length > 0) params.set("tags", filters.tagIds.join(","));
    params.set("sortField", sortField);
    params.set("sortDir", sortDir);
    router.push(`${baseUrl}?${params.toString()}`);
  }

  function handleResetAllFilters() {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    params.set("sortField", sortField);
    params.set("sortDir", sortDir);
    router.push(`${baseUrl}?${params.toString()}`);
  }

  function handleRemoveFilter(type: "query" | "status" | "tag", tagId?: string) {
    const newQuery = type === "query" ? "" : search.q;
    const newStatus: StatusFilter = type === "status" ? "all" : search.status;
    const newTagIds = type === "tag" ? selectedTagIds.filter((id) => id !== tagId) : selectedTagIds;
    router.push(
      `${baseUrl}?${buildParams({
        page: "1",
        q: newQuery,
        status: newStatus === "all" ? "" : newStatus,
        tags: newTagIds.join(","),
      })}`,
    );
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

  const allOnPageSelected = subscribers.length > 0 && subscribers.every((s) => selectedIds.has(s.id));
  const someOnPageSelected = subscribers.some((s) => selectedIds.has(s.id));

  function toggleSelectAll() {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        subscribers.forEach((s) => {
          next.delete(s.id);
        });
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        subscribers.forEach((s) => {
          next.add(s.id);
        });
        return next;
      });
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleExport() {
    startExportTransition(async () => {
      const result = await exportSubscribers({
        websiteId: selectedWebsiteId,
        q: search.q || undefined,
        status: search.status,
        sortField,
        sortDir,
        tags: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });
      if ("error" in result) return;
      const rows = result.subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        status: s.unsubscribedAt ? "unsubscribed" : "active",
        country: s.country,
        region: s.region,
        city: s.city,
        timezone: s.timezone,
        os: s.os,
        deviceType: s.deviceType,
        browser: s.browser,
        tags: s.tags.map((t) => t.name).join(";"),
        createdAt: s.createdAt,
      }));
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(rows, `subscribers-${selectedWebsiteId}-${date}.csv`);
    });
  }

  function handleBulkUnsubscribe() {
    setBulkConfirmAction("unsubscribe");
  }

  function handleBulkResubscribe() {
    setBulkConfirmAction("resubscribe");
  }

  function handleConfirmBulkAction() {
    if (bulkConfirmAction === "unsubscribe") {
      startBulkTransition(async () => {
        await bulkUnsubscribeSubscribers([...selectedIds]);
        clearSelection();
        router.refresh();
      });
    } else if (bulkConfirmAction === "resubscribe") {
      startBulkTransition(async () => {
        await bulkResubscribeSubscribers([...selectedIds]);
        clearSelection();
        router.refresh();
      });
    }
    setBulkConfirmAction(null);
  }

  const selectedCount = selectedIds.size;
  const manageTagsSubscriber = manageTagsForId
    ? (subscribers.find((s) => s.id === manageTagsForId) ?? null)
    : null;
  const COL_COUNT = 2 + visibleColumns.size; // checkbox + expand + visible cols

  return (
    <>
      <TablePageHeader
        title="Subscribers"
        description="Manage the community that follows your latest news."
        columns={COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={(key) =>
          setVisibleColumns((prev) => {
            const next = new Set(prev);
            if (next.has(key as ColumnKey)) next.delete(key as ColumnKey);
            else next.add(key as ColumnKey);
            return next;
          })
        }
        filterSlot={
          <SubscribersFilterPopover
            search={search}
            selectedTagIds={selectedTagIds}
            availableTags={availableTags}
            total={total}
            hasActiveFilters={hasActiveFilters}
            onApply={handleApplyFilters}
            onReset={handleResetAllFilters}
          />
        }
        activeFiltersContent={
          <SubscribersActiveFilters
            search={search}
            selectedTagIds={selectedTagIds}
            availableTags={availableTags}
            onRemoveFilter={handleRemoveFilter}
            onResetAll={handleResetAllFilters}
          />
        }
        onExport={handleExport}
        isExportPending={isExportPending}
      />

      <SubscribersBulkActionBar
        selectedCount={selectedCount}
        isBulkPending={isBulkPending}
        onClear={clearSelection}
        onUnsubscribe={handleBulkUnsubscribe}
        onResubscribe={handleBulkResubscribe}
        onManageTags={() => setBulkTagDialogOpen(true)}
      />

      {subscribers.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SearchXIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="mb-1 text-base font-medium">No subscribers found</h3>
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
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                {visibleColumns.has("firstName") && (
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => toggleSort("firstName")}
                      className="flex items-center font-medium hover:text-foreground">
                      First Name
                      <SortIcon field="firstName" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.has("lastName") && (
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => toggleSort("lastName")}
                      className="flex items-center font-medium hover:text-foreground">
                      Last Name
                      <SortIcon field="lastName" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.has("email") && <TableHead>Email</TableHead>}
                {visibleColumns.has("createdAt") && (
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => toggleSort("createdAt")}
                      className="flex items-center font-medium hover:text-foreground">
                      Subscribed At
                      <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.has("unsubscribedAt") && <TableHead>Unsubscribed At</TableHead>}
                {visibleColumns.has("tags") && (
                  <TableHead className="flex items-center gap-1">
                    <TagIcon className="h-3 w-3" />
                    Tags
                  </TableHead>
                )}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COL_COUNT} className="py-8 text-center text-muted-foreground">
                    No subscribers found.
                  </TableCell>
                </TableRow>
              ) : (
                subscribers.map((subscriber) => (
                  <React.Fragment key={subscriber.id}>
                    <TableRow
                      data-state={selectedIds.has(subscriber.id) ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => setDetailSubscriberId(subscriber.id)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(subscriber.id)}
                          onCheckedChange={() => toggleRow(subscriber.id)}
                          aria-label={`Select ${subscriber.email}`}
                        />
                      </TableCell>
                      {visibleColumns.has("firstName") && (
                        <TableCell className="text-muted-foreground">{subscriber.firstName ?? "—"}</TableCell>
                      )}
                      {visibleColumns.has("lastName") && (
                        <TableCell className="text-muted-foreground">{subscriber.lastName ?? "—"}</TableCell>
                      )}
                      {visibleColumns.has("email") && <TableCell>{subscriber.email}</TableCell>}
                      {visibleColumns.has("createdAt") && (
                        <TableCell>
                          <RelativeDate date={subscriber.createdAt} />
                        </TableCell>
                      )}
                      {visibleColumns.has("unsubscribedAt") && (
                        <TableCell className="text-muted-foreground">
                          {subscriber.unsubscribedAt ? formatDate(subscriber.unsubscribedAt) : "—"}
                        </TableCell>
                      )}
                      {visibleColumns.has("tags") && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap items-center gap-1">
                            {subscriber.tags.map((tag) => (
                              <Badge key={tag.id} variant="outline" className="gap-1 text-xs">
                                {tag.color && (
                                  <span
                                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                )}
                                {tag.name}
                              </Badge>
                            ))}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => setManageTagsForId(subscriber.id)}
                              aria-label="Manage tags">
                              <TagIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            setDetailSubscriberId((prev) => (prev === subscriber.id ? null : subscriber.id))
                          }
                          aria-label="Expand details">
                          <ChevronDownIcon
                            className={`h-4 w-4 transition-transform ${detailSubscriberId === subscriber.id ? "rotate-180" : ""}`}
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {detailSubscriberId === subscriber.id && (
                      <TableRow>
                        <TableCell colSpan={COL_COUNT} className="bg-muted/30 px-6 py-4">
                          <SubscriberDetailPanel subscriber={subscriber} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isPagePending}
      />

      {manageTagsSubscriber && (
        <ManageTagsDialog
          description={manageTagsSubscriber.email}
          tags={manageTagsSubscriber.tags}
          availableTags={availableTags}
          isPending={isManageTagsPending}
          onAdd={(tagName) => {
            startManageTagsTransition(async () => {
              await addTagToSubscriber(manageTagsSubscriber.id, tagName);
              router.refresh();
            });
          }}
          onRemove={(tagId) => {
            startManageTagsTransition(async () => {
              await removeTagFromSubscriber(manageTagsSubscriber.id, tagId);
              router.refresh();
            });
          }}
          open={true}
          onOpenChange={(open) => {
            if (!open) setManageTagsForId(null);
          }}
        />
      )}

      <ManageTagsDialog
        description={`${selectedCount} subscriber${selectedCount === 1 ? "" : "s"} selected`}
        tags={selectedSubscriberTags}
        availableTags={availableTags}
        isPending={isBulkPending}
        open={bulkTagDialogOpen}
        onOpenChange={setBulkTagDialogOpen}
        onAdd={(tagName) => {
          startBulkTransition(async () => {
            await bulkAddTag([...selectedIds], tagName);
            setBulkTagDialogOpen(false);
            clearSelection();
            router.refresh();
          });
        }}
        onRemove={(tagId) => {
          startBulkTransition(async () => {
            await bulkRemoveTag([...selectedIds], tagId);
            router.refresh();
          });
        }}
      />

      <AlertDialog
        open={bulkConfirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setBulkConfirmAction(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirmAction === "unsubscribe" ? "Unsubscribe subscribers?" : "Re-subscribe subscribers?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirmAction === "unsubscribe"
                ? `This will unsubscribe ${selectedCount} subscriber${selectedCount === 1 ? "" : "s"}. They will stop receiving emails.`
                : `This will re-subscribe ${selectedCount} subscriber${selectedCount === 1 ? "" : "s"}. They will start receiving emails again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBulkAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
