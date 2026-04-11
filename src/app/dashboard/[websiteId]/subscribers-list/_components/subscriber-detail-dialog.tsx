"use client";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Subscriber } from "@/lib/domain/types";

export type Tag = { id: string; name: string; color: string | null; description: string | null };

export type { Subscriber };

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex gap-1 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono">{value ?? "—"}</span>
    </div>
  );
}

export function SubscriberDetailPanel({ subscriber }: { subscriber: Subscriber }) {
  const hasCapture =
    subscriber.os || subscriber.deviceType || subscriber.browser || subscriber.timezone || subscriber.country;

  if (!hasCapture) {
    return (
      <p className="px-2 text-xs text-muted-foreground">No enrichment data captured for this subscriber.</p>
    );
  }

  const location = [subscriber.city, subscriber.region, subscriber.country].filter(Boolean).join(", ");

  return (
    <div className="space-y-4 px-2">
      <div className="space-y-1">
        <p className="pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Capture context
        </p>
        <DetailRow label="OS" value={subscriber.os} />
        <DetailRow label="Device" value={subscriber.deviceType} />
        <DetailRow label="Browser" value={subscriber.browser} />
        <DetailRow label="Timezone" value={subscriber.timezone} />
        <DetailRow label="Location" value={location || null} />
      </div>
    </div>
  );
}

export function SubscriberDetailDialog({
  subscriber,
  open,
  onOpenChange,
}: {
  subscriber: Subscriber;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-md break-all">{subscriber.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <DetailRow label="First name" value={subscriber.firstName} />
            <DetailRow label="Last name" value={subscriber.lastName} />
            <DetailRow label="Status" value={subscriber.unsubscribedAt ? "unsubscribed" : "active"} />
            <DetailRow label="Subscribed" value={subscriber.createdAt.toLocaleDateString()} />
            {subscriber.unsubscribedAt && (
              <DetailRow label="Unsubscribed" value={subscriber.unsubscribedAt.toLocaleDateString()} />
            )}
          </div>
          {subscriber.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {subscriber.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="gap-1 text-xs">
                  {tag.color && (
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                  )}
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
          <Separator />
          <SubscriberDetailPanel subscriber={subscriber} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
