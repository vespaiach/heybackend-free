"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import type { WebsiteField } from "@/lib/domain/types"

export type Tag = { id: string; name: string; color: string | null; description: string | null }

export type Subscriber = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  createdAt: Date
  unsubscribedAt: Date | null
  tags: Tag[]
  os: string | null
  deviceType: string | null
  browser: string | null
  timezone: string | null
  country: string | null
  region: string | null
  city: string | null
  metadata: Record<string, string | number | boolean | null> | null
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex gap-1 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono">{value ?? "—"}</span>
    </div>
  )
}

export function SubscriberDetailPanel({
  subscriber,
  websiteFields,
  onEditMetadata,
}: {
  subscriber: Subscriber
  websiteFields: WebsiteField[]
  onEditMetadata: () => void
}) {
  const hasCapture =
    subscriber.os ||
    subscriber.deviceType ||
    subscriber.browser ||
    subscriber.timezone ||
    subscriber.country

  const hasCustomFields = websiteFields.length > 0

  if (!hasCapture && !hasCustomFields) {
    return (
      <p className="px-2 text-xs text-muted-foreground">No enrichment data captured for this subscriber.</p>
    )
  }

  const location = [subscriber.city, subscriber.region, subscriber.country].filter(Boolean).join(", ")

  return (
    <div className="space-y-4 px-2">
      {hasCapture && (
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
      )}

      {hasCustomFields && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Custom fields</p>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onEditMetadata}>
              Edit
            </Button>
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {websiteFields.map((field) => (
              <DetailRow
                key={field.id}
                label={field.label}
                value={
                  subscriber.metadata?.[field.slug] !== undefined
                    ? String(subscriber.metadata[field.slug])
                    : null
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function SubscriberDetailDialog({
  subscriber,
  websiteFields,
  open,
  onOpenChange,
  onEditMetadata,
}: {
  subscriber: Subscriber
  websiteFields: WebsiteField[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditMetadata: () => void
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
                      className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                  )}
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
          <Separator />
          <SubscriberDetailPanel
            subscriber={subscriber}
            websiteFields={websiteFields}
            onEditMetadata={onEditMetadata}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
