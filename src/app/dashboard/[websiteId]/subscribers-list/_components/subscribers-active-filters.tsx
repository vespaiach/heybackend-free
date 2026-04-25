"use client";

import { TagIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badges";
import type { Tag } from "./subscriber-detail-dialog";
import type { StatusFilter } from "./subscribers-filter-popover";

interface SubscribersActiveFiltersProps {
  search: { q: string; status: StatusFilter };
  selectedTagIds: string[];
  availableTags: Tag[];
  onRemoveFilter: (type: "query" | "status" | "tag", tagId?: string) => void;
  onResetAll: () => void;
}

export function SubscribersActiveFilters({
  search,
  selectedTagIds,
  availableTags,
  onRemoveFilter,
  onResetAll,
}: SubscribersActiveFiltersProps) {
  const hasActiveFilters = search.q !== "" || search.status !== "all" || selectedTagIds.length > 0;
  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {search.q && (
        <Badge variant="secondary" className="gap-1 pr-1">
          Search: {search.q}
          <button
            type="button"
            onClick={() => onRemoveFilter("query")}
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
            onClick={() => onRemoveFilter("status")}
            className="ml-0.5 rounded-sm opacity-70 hover:opacity-100"
            aria-label="Remove status filter">
            <XIcon className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {selectedTagIds.map((tagId) => {
        const tag = availableTags.find((t) => t.id === tagId);
        if (!tag) return null;
        return (
          <Badge key={tagId} variant="secondary" className="gap-1 pr-1">
            <TagIcon className="h-3 w-3" />
            {tag.name}
            <button
              type="button"
              onClick={() => onRemoveFilter("tag", tagId)}
              className="ml-0.5 rounded-sm opacity-70 hover:opacity-100"
              aria-label={`Remove tag filter: ${tag.name}`}>
              <XIcon className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
      <button
        type="button"
        onClick={onResetAll}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline">
        Clear all ×
      </button>
    </div>
  );
}
