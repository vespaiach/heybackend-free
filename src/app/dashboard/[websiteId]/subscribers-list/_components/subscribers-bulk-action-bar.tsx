"use client";

import { TagIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SubscribersBulkActionBarProps {
  selectedCount: number;
  isBulkPending: boolean;
  onClear: () => void;
  onUnsubscribe: () => void;
  onResubscribe: () => void;
  onManageTags: () => void;
}

export function SubscribersBulkActionBar({
  selectedCount,
  isBulkPending,
  onClear,
  onUnsubscribe,
  onResubscribe,
  onManageTags,
}: SubscribersBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border bg-background px-3 py-2 shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={onClear}
          aria-label="Clear selection">
          <XIcon className="h-4 w-4" />
        </Button>
        <span className="min-w-16 text-center text-sm font-medium">{selectedCount} selected</span>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <Button variant="ghost" size="sm" disabled={isBulkPending} onClick={onUnsubscribe}>
          Unsubscribe
        </Button>
        <Button variant="ghost" size="sm" disabled={isBulkPending} onClick={onResubscribe}>
          Re-subscribe
        </Button>
        <Button variant="outline" size="sm" disabled={isBulkPending} onClick={onManageTags}>
          <TagIcon className="mr-1 h-3 w-3" />
          Manage tag
        </Button>
      </div>
    </div>
  );
}
