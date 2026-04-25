"use client";

import { PlusIcon, TagIcon, XIcon } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badges";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialogs";
import Input from "@/components/ui/input";

type Tag = { id: string; name: string; color: string | null; description: string | null };

interface ManageTagsDialogProps {
  title?: string;
  description: string;
  tags: Tag[];
  availableTags: Tag[];
  isPending: boolean;
  onAdd: (tagName: string) => void;
  onRemove: (tagId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageTagsDialog({
  title,
  description,
  tags,
  availableTags,
  isPending,
  onAdd,
  onRemove,
  open,
  onOpenChange,
}: ManageTagsDialogProps) {
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const tagIds = new Set(tags.map((t) => t.id));
  const filtered = availableTags.filter(
    (t) => !tagIds.has(t.id) && t.name.toLowerCase().includes(query.toLowerCase()),
  );
  const canCreate =
    query.trim().length > 0 &&
    !availableTags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title ?? "Manage tags"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag.id} variant="outline" className="gap-1 pr-1 text-xs">
                {tag.color && (
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                )}
                {tag.name}
                <button
                  type="button"
                  onClick={() => onRemove(tag.id)}
                  disabled={isPending}
                  className="ml-0.5 rounded-sm opacity-70 hover:opacity-100 disabled:opacity-30"
                  aria-label={`Remove tag ${tag.name}`}>
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div>
          <Input
            placeholder="Find or create tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2 h-8 text-sm"
            disabled={isPending}
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((tag) => (
              <button
                type="button"
                key={tag.id}
                onClick={() => onAdd(tag.name)}
                disabled={isPending}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-50">
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
                onClick={() => onAdd(query.trim())}
                disabled={isPending}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50">
                <PlusIcon className="h-3 w-3" />
                Create &quot;{query.trim()}&quot;
              </button>
            )}
            {filtered.length === 0 && !canCreate && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">No tags found.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
