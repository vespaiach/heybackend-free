"use client";

import { SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/buttons";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popovers";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-groups";
import type { Tag } from "./subscriber-detail-dialog";

export type StatusFilter = "all" | "active" | "unsubscribed";

interface SubscribersFilterPopoverProps {
  search: { q: string; status: StatusFilter };
  selectedTagIds: string[];
  availableTags: Tag[];
  total: number;
  hasActiveFilters: boolean;
  onApply: (filters: { query: string; status: StatusFilter; tagIds: string[] }) => void;
  onReset: () => void;
}

export function SubscribersFilterPopover({
  search,
  selectedTagIds,
  availableTags,
  total,
  hasActiveFilters,
  onApply,
  onReset,
}: SubscribersFilterPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] = React.useState<{
    query: string;
    status: StatusFilter;
    tagIds: string[];
  }>({ query: search.q, status: search.status, tagIds: selectedTagIds });

  function handleOpenChange(open: boolean) {
    if (open) {
      setDraftFilters({ query: search.q, status: search.status, tagIds: selectedTagIds });
    }
    setIsOpen(open);
  }

  function handleApply() {
    setIsOpen(false);
    onApply(draftFilters);
  }

  function handleReset() {
    setIsOpen(false);
    onReset();
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-2">
          <SlidersHorizontalIcon className="h-4 w-4" />
          {hasActiveFilters ? `Filters (${total})` : "Filters"}
          {hasActiveFilters && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b p-3">
          <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Search</p>
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
          <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</p>
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
            <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Tags</p>
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
            <Button variant="secondary" onClick={handleReset}>
              Clear all ×
            </Button>
          )}
          <Button className="flex-1" size="sm" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
