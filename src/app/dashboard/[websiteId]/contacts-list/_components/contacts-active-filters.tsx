"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RemoveFilterType = "query" | "readStatus" | "country";

interface ContactsActiveFiltersProps {
  search: { q: string; readStatus: string };
  country: string;
  onRemoveFilter: (type: RemoveFilterType) => void;
  onResetAll: () => void;
}

export function ContactsActiveFilters({
  search,
  country,
  onRemoveFilter,
  onResetAll,
}: ContactsActiveFiltersProps) {
  const filters = [
    ...(search.q ? [{ key: "query", label: `Search: ${search.q}` }] : []),
    ...(search.readStatus && search.readStatus !== "all"
      ? [{ key: "readStatus", label: `Status: ${search.readStatus}` }]
      : []),
    ...(country ? [{ key: "country", label: `Country: ${country}` }] : []),
  ];

  if (filters.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <Badge key={filter.key} variant="outline" className="gap-1">
          {filter.label}
          <button
            type="button"
            onClick={() => onRemoveFilter(filter.key as RemoveFilterType)}
            className="ml-1 hover:opacity-70"
            aria-label={`Remove ${filter.key} filter`}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onResetAll} className="ml-auto text-xs">
        Clear all ×
      </Button>
    </div>
  );
}
