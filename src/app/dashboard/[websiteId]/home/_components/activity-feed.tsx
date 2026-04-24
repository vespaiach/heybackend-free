import { MessageSquareIcon, UserPlusIcon } from "lucide-react";
import { RelativeDate } from "@/components/relative-date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contactRequestService, subscriberService } from "@/lib/domain";
import type { ContactRequest, Subscriber } from "@/lib/domain/types";

export type FeedEvent =
  | { type: "subscriber"; email: string; createdAt: Date }
  | { type: "contact"; name: string; company: string | null; createdAt: Date };

export function mergeFeedEvents(
  subscribers: Pick<Subscriber, "email" | "createdAt">[],
  contacts: Pick<ContactRequest, "name" | "company" | "createdAt">[],
): FeedEvent[] {
  const subEvents: FeedEvent[] = subscribers.map((s) => ({
    type: "subscriber",
    email: s.email,
    createdAt: s.createdAt,
  }));
  const contactEvents: FeedEvent[] = contacts.map((c) => ({
    type: "contact",
    name: c.name,
    company: c.company,
    createdAt: c.createdAt,
  }));
  return [...subEvents, ...contactEvents]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);
}

export function ActivityFeedView({ events }: { events: FeedEvent[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <ul className="flex max-h-[400px] flex-col gap-3 overflow-y-auto">
            {events.map((event, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable static list from server
              <li key={i} className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    event.type === "subscriber"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-violet-100 text-violet-600"
                  }`}>
                  {event.type === "subscriber" ? (
                    <UserPlusIcon className="h-3 w-3" />
                  ) : (
                    <MessageSquareIcon className="h-3 w-3" />
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between gap-2 text-sm">
                  <span>
                    {event.type === "subscriber"
                      ? `New subscriber: ${event.email}`
                      : `New contact: ${event.name}${event.company ? ` (${event.company})` : ""}`}
                  </span>
                  <RelativeDate date={event.createdAt} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ActivityFeed({ websiteId }: { websiteId: string }) {
  const [{ subscribers }, { contactRequests }] = await Promise.all([
    subscriberService.listSubscribers({ websiteId, sortField: "createdAt", sortDir: "desc", pageSize: 5 }),
    contactRequestService.listContactRequests({
      websiteId,
      sortField: "createdAt",
      sortDir: "desc",
      pageSize: 5,
    }),
  ]);

  const events = mergeFeedEvents(subscribers, contactRequests);
  return <ActivityFeedView events={events} />;
}
