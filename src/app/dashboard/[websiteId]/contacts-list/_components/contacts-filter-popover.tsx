"use client";

import { FilterIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ContactsFilterPopoverProps {
  availableCountries: string[];
  onFilterChange: () => void;
}

export function ContactsFilterPopover({ availableCountries, onFilterChange }: ContactsFilterPopoverProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("__all__");
  const [readStatus, setReadStatus] = useState("all");

  const handleApply = () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (country && country !== "__all__") params.set("country", country);
    if (readStatus !== "all") params.set("readStatus", readStatus);
    params.set("page", "1"); // Reset to page 1

    router.push(`?${params.toString()}`);
    onFilterChange();
  };

  const handleClear = () => {
    setSearch("");
    setCountry("__all__");
    setReadStatus("all");
    router.push("?page=1");
    onFilterChange();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <FilterIcon className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Country</label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="mt-1">
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
            <label className="text-sm font-medium">Read Status</label>
            <Select value={readStatus} onValueChange={setReadStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
