"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ContactReadStatus = "all" | "read" | "unread";

export interface ContactFilterValues {
  query: string;
  country: string; // "__all__" means no filter
  readStatus: ContactReadStatus;
}

interface ContactsFilterPopoverProps {
  availableCountries: string[];
  currentFilters: ContactFilterValues;
  total: number;
  hasActiveFilters: boolean;
  onApply: (filters: ContactFilterValues) => void;
  onReset: () => void;
}

export function ContactsFilterPopover({
  availableCountries,
  currentFilters,
  total,
  hasActiveFilters,
  onApply,
  onReset,
}: ContactsFilterPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<ContactFilterValues>(currentFilters);

  // Re-sync draft when popover opens or currentFilters changes
  React.useEffect(() => {
    if (isOpen) {
      setDraft(currentFilters);
    }
  }, [isOpen, currentFilters]);

  const handleApply = () => {
    onApply(draft);
    setIsOpen(false);
  };

  const handleReset = () => {
    onReset();
    setIsOpen(false);
  };

  const searchInputId = "contacts-search-input";
  const countrySelectId = "contacts-country-select";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontalIcon className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-0.5 rounded-full px-1.5 text-xs font-normal">
              {total}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-4">
          <div>
            <label htmlFor={searchInputId} className="text-sm font-medium">
              Search
            </label>
            <Input
              id={searchInputId}
              placeholder="Name or email..."
              value={draft.query}
              onChange={(e) => setDraft((prev) => ({ ...prev, query: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor={countrySelectId} className="text-sm font-medium">
              Country
            </label>
            <Select
              value={draft.country}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, country: value }))}>
              <SelectTrigger id={countrySelectId} className="mt-1">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Countries</SelectItem>
                {availableCountries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Read Status</Label>
            <RadioGroup
              value={draft.readStatus}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, readStatus: value as ContactReadStatus }))
              }
              className="mt-2 space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="status-all" />
                <Label htmlFor="status-all" className="font-normal">
                  All
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="read" id="status-read" />
                <Label htmlFor="status-read" className="font-normal">
                  Read
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unread" id="status-unread" />
                <Label htmlFor="status-unread" className="font-normal">
                  Unread
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
            {hasActiveFilters && (
              <Button size="sm" variant="outline" onClick={handleReset}>
                Clear all ×
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
