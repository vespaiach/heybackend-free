"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface ContactsActiveFiltersProps {
  search: { q: string; readStatus: string };
  country?: string;
  onRemoveFilter: () => void;
}

export function ContactsActiveFilters({ search, country, onRemoveFilter }: ContactsActiveFiltersProps) {
  const router = useRouter();

  const filters = [
    ...(search.q ? [{ key: "q", label: `Search: ${search.q}` }] : []),
    ...(search.readStatus && search.readStatus !== "all"
      ? [{ key: "readStatus", label: `Status: ${search.readStatus}` }]
      : []),
    ...(country ? [{ key: "country", label: `Country: ${country}` }] : []),
  ];

  if (filters.length === 0) return null;

  const handleRemove = (key: string) => {
    const params = new URLSearchParams(window.location.search);
    params.delete(key);
    if (key === "readStatus") params.set("readStatus", "all");
    router.push(`?${params.toString()}`);
    onRemoveFilter();
  };

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Badge key={filter.key} variant="outline" className="gap-1">
          {filter.label}
          <button type="button" onClick={() => handleRemove(filter.key)} className="ml-1 hover:opacity-70">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
