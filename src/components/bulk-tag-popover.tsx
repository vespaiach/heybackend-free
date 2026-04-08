"use client";

import { PlusIcon, TagIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Tag = { id: string; name: string; color: string | null; description: string | null };

interface BulkTagPopoverProps {
  availableTags: Tag[];
  isPending: boolean;
  onAdd: (tagName: string) => void;
  onDone: () => void;
}

export function BulkTagPopover({ availableTags, isPending, onAdd, onDone }: BulkTagPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = availableTags.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
  const canCreate =
    query.trim().length > 0 &&
    !availableTags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  function handleAdd(tagName: string) {
    onAdd(tagName);
    setQuery("");
    setOpen(false);
    onDone();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          <TagIcon className="mr-1 h-3 w-3" />
          Add tag
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-2">
        <Input
          placeholder="Find or create tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2 h-8 text-sm"
          autoFocus
        />
        <div className="max-h-40 overflow-y-auto">
          {filtered.map((tag) => (
            <button
              type="button"
              key={tag.id}
              onClick={() => handleAdd(tag.name)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
              {tag.color ? (
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
              ) : (
                <TagIcon className="h-3 w-3 text-muted-foreground" />
              )}
              {tag.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onClick={() => handleAdd(query.trim())}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              <PlusIcon className="h-3 w-3" />
              Create &quot;{query.trim()}&quot;
            </button>
          )}
          {filtered.length === 0 && !canCreate && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No tags found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
