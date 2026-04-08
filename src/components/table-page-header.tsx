"use client";

import type * as React from "react";
import { CheckIcon, Columns2Icon, DownloadIcon, SlidersHorizontalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface TablePageHeaderProps {
  title: string;
  description: string;
  // Column visibility — omit all three to hide the Columns button
  columns?: readonly { key: string; label: string }[];
  visibleColumns?: Set<string>;
  onToggleColumn?: (key: string) => void;
  // Filters
  hasActiveFilters?: boolean;
  total?: number;
  isFilterOpen?: boolean;
  onFilterOpenChange?: (open: boolean) => void;
  filtersContent: React.ReactNode;
  activeFiltersContent?: React.ReactNode;
  // Export
  onExport: () => void;
  isExportPending?: boolean;
}

export function TablePageHeader({
  title,
  description,
  columns,
  visibleColumns,
  onToggleColumn,
  hasActiveFilters = false,
  total,
  isFilterOpen,
  onFilterOpenChange,
  filtersContent,
  activeFiltersContent,
  onExport,
  isExportPending = false,
}: TablePageHeaderProps) {
  const showColumns = columns !== undefined && visibleColumns !== undefined && onToggleColumn !== undefined;
  const hiddenCount = showColumns ? columns.filter((c) => !visibleColumns.has(c.key)).length : 0;

  return (
    <>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button
          variant="outline"
          className="md:hidden"
          size="sm"
          onClick={onExport}
          disabled={isExportPending}>
          <DownloadIcon className="mr-1 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="mb-3 flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-5">
        {showColumns && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Columns2Icon className="h-4 w-4" />
                Columns
                {hiddenCount > 0 && (
                  <Badge variant="secondary" className="ml-0.5 rounded-full px-1.5 text-xs font-normal">
                    {hiddenCount} hidden
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 gap-0 p-2">
              <p className="mb-1.5 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Column Visibility
              </p>
              <Separator className="mb-1" />
              {columns.map((col) => (
                <button
                  key={col.key}
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => onToggleColumn(col.key)}>
                  <span className="w-4 shrink-0">
                    {visibleColumns.has(col.key) ? <CheckIcon className="h-3.5 w-3.5" /> : null}
                  </span>
                  {col.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}

        <Popover open={isFilterOpen} onOpenChange={onFilterOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative gap-2">
              <SlidersHorizontalIcon className="h-4 w-4" />
              {hasActiveFilters ? `Filters (${total})` : "Filters"}
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            {filtersContent}
          </PopoverContent>
        </Popover>

        {activeFiltersContent}

        <Button
          variant="outline"
          className="ml-auto hidden md:flex"
          size="sm"
          onClick={onExport}
          disabled={isExportPending}>
          <DownloadIcon className="mr-1 h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </>
  );
}
