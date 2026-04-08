"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
  TagIcon,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PaginationBar, type PageSizeOption } from "@/components/pagination-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/ui/submit-button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RelativeDate } from "@/components/relative-date"
import { ManageTagsDialog } from "@/components/manage-tags-dialog"
import { BulkTagPopover } from "@/components/bulk-tag-popover"
import { TablePageHeader } from "@/components/table-page-header"
import {
  addTagToSubscriber,
  removeTagFromSubscriber,
  bulkUnsubscribeSubscribers,
  bulkResubscribeSubscribers,
  bulkAddTag,
  updateSubscriberMetadata,
  exportSubscribers,
} from "./actions"
import { downloadCsv } from "@/lib/export-csv"
import type { SubscriberMetadata, WebsiteField } from "@/lib/domain/types"
import { SubscriberDetailPanel, type Subscriber, type Tag } from "./_components/subscriber-detail-dialog"
import { formatDate } from "@/lib/utils"

type StatusFilter = "all" | "active" | "unsubscribed"

type ColumnKey = "firstName" | "lastName" | "email" | "createdAt" | "unsubscribedAt" | "tags"

const COLUMNS: readonly { key: ColumnKey; label: string; defaultVisible: boolean }[] = [
  { key: "firstName", label: "First Name", defaultVisible: true },
  { key: "lastName", label: "Last Name", defaultVisible: true },
  { key: "email", label: "Email", defaultVisible: true },
  { key: "createdAt", label: "Subscribed At", defaultVisible: true },
  { key: "unsubscribedAt", label: "Unsubscribed At", defaultVisible: false },
  { key: "tags", label: "Tags", defaultVisible: true },
] as const

interface SubscribersTableProps {
  selectedWebsiteId: string
  subscribers: Subscriber[]
  total: number
  page: number
  pageSize: number
  search: { q: string; status: StatusFilter }
  sortField: SortField
  sortDir: SortDir
  availableTags: Tag[]
  selectedTagIds: string[]
  websiteFields: WebsiteField[]
}

type SortField = "firstName" | "lastName" | "createdAt"
type SortDir = "asc" | "desc"

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField
  sortField: SortField
  sortDir: SortDir
}) {
  if (field !== sortField) return <ArrowUpDownIcon className="ml-1 inline-block h-3 w-3 opacity-50" />
  return sortDir === "asc" ? (
    <ArrowUpIcon className="ml-1 inline-block h-3 w-3" />
  ) : (
    <ArrowDownIcon className="ml-1 inline-block h-3 w-3" />
  )
}

function SubscriberMetadataDialog({
  subscriber,
  websiteFields,
  open,
  onOpenChange,
}: {
  subscriber: Subscriber
  websiteFields: WebsiteField[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [values, setValues] = React.useState<SubscriberMetadata>(() => subscriber.metadata ?? {})
  const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    if (open) setValues(subscriber.metadata ?? {})
  }, [open, subscriber.metadata])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await updateSubscriberMetadata(subscriber.id, values)
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit custom fields</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{subscriber.email}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {websiteFields.map((field) => {
            const val = values[field.slug]
            return (
              <div key={field.id} className="space-y-1">
                <Label htmlFor={`meta-${field.slug}`} className="text-sm">
                  {field.label}
                  {field.required && <span className="ml-0.5 text-destructive">*</span>}
                </Label>
                {field.type === "boolean" ? (
                  <Checkbox
                    id={`meta-${field.slug}`}
                    checked={!!val}
                    onCheckedChange={(checked) => setValues((prev) => ({ ...prev, [field.slug]: !!checked }))}
                    disabled={isPending}
                  />
                ) : (
                  <Input
                    id={`meta-${field.slug}`}
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    value={val !== null && val !== undefined ? String(val) : ""}
                    onChange={(e) => {
                      const raw = e.target.value
                      setValues((prev) => ({
                        ...prev,
                        [field.slug]:
                          field.type === "number" ? (raw === "" ? null : Number(raw)) : raw || null,
                      }))
                    }}
                    disabled={isPending}
                    required={field.required}
                  />
                )}
              </div>
            )
          })}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}>
              Cancel
            </Button>
            <SubmitButton pending={isPending} size="sm">
              Save
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
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
  websiteFields,
}: SubscribersTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [detailSubscriberId, setDetailSubscriberId] = React.useState<string | null>(null)
  const [manageTagsForId, setManageTagsForId] = React.useState<string | null>(null)
  const [editMetadataForId, setEditMetadataForId] = React.useState<string | null>(null)
  const [isBulkPending, startBulkTransition] = React.useTransition()
  const [isPagePending, startPageTransition] = React.useTransition()
  const [isManageTagsPending, startManageTagsTransition] = React.useTransition()
  const [isExportPending, startExportTransition] = React.useTransition()
  const [visibleColumns, setVisibleColumns] = React.useState<Set<ColumnKey>>(
    () => new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key))
  )
  const [isFilterOpen, setIsFilterOpen] = React.useState(false)
  const [draftFilters, setDraftFilters] = React.useState<{
    query: string
    status: StatusFilter
    tagIds: string[]
  }>({ query: search.q, status: search.status, tagIds: selectedTagIds })

  const hasActiveFilters = search.q !== "" || search.status !== "all" || selectedTagIds.length > 0

  function handleFilterOpenChange(open: boolean) {
    if (open) {
      setDraftFilters({ query: search.q, status: search.status, tagIds: selectedTagIds })
    }
    setIsFilterOpen(open)
  }

  function buildParams(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    if (selectedWebsiteId) params.set("wid", selectedWebsiteId)
    params.set("page", String(page))
    params.set("pageSize", String(pageSize))
    if (search.q) params.set("q", search.q)
    if (search.status !== "all") params.set("status", search.status)
    if (selectedTagIds.length > 0) params.set("tags", selectedTagIds.join(","))
    params.set("sortField", sortField)
    params.set("sortDir", sortDir)
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    return params.toString()
  }

  function toggleSort(field: SortField) {
    const newDir = field === sortField && sortDir === "asc" ? "desc" : field === sortField ? "asc" : "asc"
    router.push(`/dashboard/subscribers?${buildParams({ sortField: field, sortDir: newDir, page: "1" })}`)
  }

  function applyFilters() {
    const params = new URLSearchParams()
    if (selectedWebsiteId) params.set("wid", selectedWebsiteId)
    params.set("page", "1")
    params.set("pageSize", String(pageSize))
    if (draftFilters.query) params.set("q", draftFilters.query)
    if (draftFilters.status !== "all") params.set("status", draftFilters.status)
    if (draftFilters.tagIds.length > 0) params.set("tags", draftFilters.tagIds.join(","))
    params.set("sortField", sortField)
    params.set("sortDir", sortDir)
    setIsFilterOpen(false)
    router.push(`/dashboard/subscribers?${params.toString()}`)
  }

  function removeFilter(type: "query" | "status" | "tag", tagId?: string) {
    const params = new URLSearchParams()
    if (selectedWebsiteId) params.set("wid", selectedWebsiteId)
    params.set("page", "1")
    params.set("pageSize", String(pageSize))
    const newQuery = type === "query" ? "" : search.q
    const newStatus: StatusFilter = type === "status" ? "all" : search.status
    const newTagIds = type === "tag" ? selectedTagIds.filter((id) => id !== tagId) : selectedTagIds
    if (newQuery) params.set("q", newQuery)
    if (newStatus !== "all") params.set("status", newStatus)
    if (newTagIds.length > 0) params.set("tags", newTagIds.join(","))
    params.set("sortField", sortField)
    params.set("sortDir", sortDir)
    router.push(`/dashboard/subscribers?${params.toString()}`)
  }

  function resetAllFilters() {
    const params = new URLSearchParams()
    if (selectedWebsiteId) params.set("wid", selectedWebsiteId)
    params.set("page", "1")
    params.set("pageSize", String(pageSize))
    params.set("sortField", sortField)
    params.set("sortDir", sortDir)
    setIsFilterOpen(false)
    router.push(`/dashboard/subscribers?${params.toString()}`)
  }

  function handlePageChange(newPage: number) {
    startPageTransition(() => {
      router.push(`/dashboard/subscribers?${buildParams({ page: String(newPage) })}`)
    })
  }

  function handlePageSizeChange(newPageSize: PageSizeOption) {
    startPageTransition(() => {
      router.push(`/dashboard/subscribers?${buildParams({ page: "1", pageSize: String(newPageSize) })}`)
    })
  }

  const allOnPageSelected = subscribers.length > 0 && subscribers.every((s) => selectedIds.has(s.id))
  const someOnPageSelected = subscribers.some((s) => selectedIds.has(s.id))

  function toggleSelectAll() {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        subscribers.forEach((s) => next.delete(s.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        subscribers.forEach((s) => next.add(s.id))
        return next
      })
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
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
      })
      if ("error" in result) return
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
        locale: s.locale,
        referrer: s.referrer,
        userAgent: s.userAgent,
        utmSource: s.utmSource,
        utmMedium: s.utmMedium,
        utmCampaign: s.utmCampaign,
        utmTerm: s.utmTerm,
        utmContent: s.utmContent,
        tags: s.tags.map((t) => t.name).join(";"),
        createdAt: s.createdAt,
      }))
      const date = new Date().toISOString().slice(0, 10)
      downloadCsv(rows, `subscribers-${selectedWebsiteId}-${date}.csv`)
    })
  }

  function handleBulkUnsubscribe() {
    startBulkTransition(async () => {
      await bulkUnsubscribeSubscribers([...selectedIds])
      clearSelection()
      router.refresh()
    })
  }

  function handleBulkResubscribe() {
    startBulkTransition(async () => {
      await bulkResubscribeSubscribers([...selectedIds])
      clearSelection()
      router.refresh()
    })
  }

  const selectedCount = selectedIds.size
  const manageTagsSubscriber = manageTagsForId
    ? (subscribers.find((s) => s.id === manageTagsForId) ?? null)
    : null
  const editMetadataSubscriber = editMetadataForId
    ? (subscribers.find((s) => s.id === editMetadataForId) ?? null)
    : null

  const COL_COUNT = 2 + visibleColumns.size // checkbox + expand + visible cols

  return (
    <>
      <TablePageHeader
        title="Subscribers"
        description="Manage the community that follows your latest news."
        columns={COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={(key) =>
          setVisibleColumns((prev) => {
            const next = new Set(prev)
            if (next.has(key as ColumnKey)) next.delete(key as ColumnKey)
            else next.add(key as ColumnKey)
            return next
          })
        }
        hasActiveFilters={hasActiveFilters}
        total={total}
        isFilterOpen={isFilterOpen}
        onFilterOpenChange={handleFilterOpenChange}
        filtersContent={
          <>
            <div className="border-b p-3">
              <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Search
              </p>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Name or email..."
                  value={draftFilters.query}
                  onChange={(e) => setDraftFilters((prev) => ({ ...prev, query: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="border-b p-3">
              <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Status
              </p>
              <RadioGroup
                value={draftFilters.status}
                onValueChange={(v) => setDraftFilters((prev) => ({ ...prev, status: v as StatusFilter }))}
                className="gap-1.5">
                {(["all", "active", "unsubscribed"] as const).map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <RadioGroupItem value={s} id={`filter-status-${s}`} />
                    <Label htmlFor={`filter-status-${s}`} className="cursor-pointer font-normal capitalize">
                      {s}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {availableTags.length > 0 && (
              <div className="border-b p-3">
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Tags
                </p>
                <div className="max-h-36 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <div key={tag.id} className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`filter-tag-${tag.id}`}
                        checked={draftFilters.tagIds.includes(tag.id)}
                        onCheckedChange={(checked) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            tagIds: checked
                              ? [...prev.tagIds, tag.id]
                              : prev.tagIds.filter((id) => id !== tag.id),
                          }))
                        }
                      />
                      <Label htmlFor={`filter-tag-${tag.id}`} className="cursor-pointer font-normal">
                        {tag.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 p-3">
              {hasActiveFilters && (
                <Button variant="secondary" onClick={resetAllFilters}>
                  Clear all ×
                </Button>
              )}
              <Button className="flex-1" size="sm" onClick={applyFilters}>
                Apply
              </Button>
            </div>
          </>
        }
        activeFiltersContent={
          hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {search.q && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Search: {search.q}
                  <button
                    type="button"
                    onClick={() => removeFilter("query")}
                    className="ml-0.5 rounded-sm opacity-70 hover:opacity-100"
                    aria-label="Remove search filter">
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {search.status !== "all" && (
                <Badge variant="secondary" className="gap-1 pr-1 capitalize">
                  {search.status}
                  <button
                    type="button"
                    onClick={() => removeFilter("status")}
                    className="ml-0.5 rounded-sm opacity-70 hover:opacity-100"
                    aria-label="Remove status filter">
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedTagIds.map((tagId) => {
                const tag = availableTags.find((t) => t.id === tagId)
                if (!tag) return null
                return (
                  <Badge key={tagId} variant="secondary" className="gap-1 pr-1">
                    <TagIcon className="h-3 w-3" />
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => removeFilter("tag", tagId)}
                      className="ml-0.5 rounded-sm opacity-70 hover:opacity-100"
                      aria-label={`Remove tag filter: ${tag.name}`}>
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                Clear all ×
              </button>
            </div>
          ) : undefined
        }
        onExport={handleExport}
        isExportPending={isExportPending}
      />

      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full border bg-background px-3 py-2 shadow-lg">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={clearSelection}
              aria-label="Clear selection">
              <XIcon className="h-4 w-4" />
            </Button>
            <span className="min-w-16 text-center text-sm font-medium">{selectedCount} selected</span>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Button variant="ghost" size="sm" disabled={isBulkPending} onClick={handleBulkUnsubscribe}>
              Unsubscribe
            </Button>
            <Button variant="ghost" size="sm" disabled={isBulkPending} onClick={handleBulkResubscribe}>
              Re-subscribe
            </Button>
            <BulkTagPopover
              availableTags={availableTags}
              isPending={isBulkPending}
              onAdd={(tagName) => {
                startBulkTransition(async () => {
                  await bulkAddTag([...selectedIds], tagName)
                  clearSelection()
                  router.refresh()
                })
              }}
              onDone={clearSelection}
            />
          </div>
        </div>
      )}

      {subscribers.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SearchXIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="mb-1 text-base font-medium">No subscribers found</h3>
          <p className="mb-4 text-sm text-muted-foreground">No results match your current filters.</p>
          <Button variant="outline" size="sm" onClick={resetAllFilters}>
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
                                    className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
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
                          <SubscriberDetailPanel
                            subscriber={subscriber}
                            websiteFields={websiteFields}
                            onEditMetadata={() => {
                              setDetailSubscriberId(null)
                              setEditMetadataForId(subscriber.id)
                            }}
                          />
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
          email={manageTagsSubscriber.email}
          tags={manageTagsSubscriber.tags}
          availableTags={availableTags}
          isPending={isManageTagsPending}
          onAdd={(tagName) => {
            startManageTagsTransition(async () => {
              await addTagToSubscriber(manageTagsSubscriber.id, tagName)
              router.refresh()
            })
          }}
          onRemove={(tagId) => {
            startManageTagsTransition(async () => {
              await removeTagFromSubscriber(manageTagsSubscriber.id, tagId)
              router.refresh()
            })
          }}
          open={true}
          onOpenChange={(open) => {
            if (!open) setManageTagsForId(null)
          }}
        />
      )}

      {editMetadataSubscriber && websiteFields.length > 0 && (
        <SubscriberMetadataDialog
          subscriber={editMetadataSubscriber}
          websiteFields={websiteFields}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditMetadataForId(null)
          }}
        />
      )}
    </>
  )
}
