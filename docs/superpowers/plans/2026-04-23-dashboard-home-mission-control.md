# Dashboard Home — Mission Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `/dashboard/[websiteId]/home` page with a live "Mission Control" dashboard showing KPI cards, subscriber growth chart, combined activity feed, and quick action buttons — all streamed independently via React Suspense.

**Architecture:** Five async RSC leaf components (`kpi-cards`, `growth-section`, `activity-feed`) each fetch their own data and suspend in parallel. One client component (`quick-actions`) handles export + modal state. The page shell renders the header instantly; each island shows a skeleton until its data resolves.

**Tech Stack:** Next.js 16 App Router RSC + React 19 `<Suspense>`, shadcn/ui Cards + Skeleton, Recharts (via existing `GrowthChart`), Vitest + React Testing Library, Lucide icons, existing domain services (`subscriberService`, `contactRequestService`).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/app/dashboard/[websiteId]/home/page.tsx` | Shell, breadcrumb, Suspense islands, skeletons |
| Create | `src/app/dashboard/[websiteId]/home/_components/kpi-cards.tsx` | Async RSC + `KpiCardsView` presentational export |
| Create | `src/app/dashboard/[websiteId]/home/_components/growth-section.tsx` | Async RSC + `GrowthSectionView` presentational export |
| Create | `src/app/dashboard/[websiteId]/home/_components/activity-feed.tsx` | Async RSC + `mergeFeedEvents` pure fn + `ActivityFeedView` |
| Create | `src/app/dashboard/[websiteId]/home/_components/quick-actions.tsx` | `"use client"` — export CSV, add website modal, integration link |
| Create | `src/app/dashboard/[websiteId]/home/_components/__tests__/kpi-cards.test.tsx` | |
| Create | `src/app/dashboard/[websiteId]/home/_components/__tests__/growth-section.test.tsx` | |
| Create | `src/app/dashboard/[websiteId]/home/_components/__tests__/activity-feed.test.tsx` | |
| Create | `src/app/dashboard/[websiteId]/home/_components/__tests__/quick-actions.test.tsx` | |

---

## Task 1: Feature branch

- [ ] **Step 1: Create and switch to feature branch**

```bash
git checkout -b feat/dashboard-home-mission-control
```

---

## Task 2: KPI Cards

**Files:**
- Create: `src/app/dashboard/[websiteId]/home/_components/kpi-cards.tsx`
- Create: `src/app/dashboard/[websiteId]/home/_components/__tests__/kpi-cards.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/dashboard/[websiteId]/home/_components/__tests__/kpi-cards.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { KpiCardsView } from "../kpi-cards";

const base = {
  totalActive: 1240,
  newThisPeriod: 84,
  growthRate: 6.7,
  totalContacts: 45,
  unreadContacts: 3,
};

describe("KpiCardsView", () => {
  it("renders all four KPI values", () => {
    render(<KpiCardsView {...base} />);
    expect(screen.getByText("1,240")).toBeInTheDocument();
    expect(screen.getByText("84")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows positive growth rate in green", () => {
    const { container } = render(<KpiCardsView {...base} growthRate={6.7} />);
    expect(screen.getByText("+6.7% last 30 days")).toBeInTheDocument();
    expect(container.innerHTML).toContain("green");
  });

  it("shows negative growth rate with destructive color", () => {
    const { container } = render(<KpiCardsView {...base} growthRate={-3.2} />);
    expect(screen.getByText("-3.2% last 30 days")).toBeInTheDocument();
    expect(container.innerHTML).toContain("destructive");
  });

  it("hides growth badge and shows fallback label when growthRate is null", () => {
    render(<KpiCardsView {...base} growthRate={null} />);
    expect(screen.queryByText(/last 30 days/)).not.toBeInTheDocument();
    expect(screen.getByText("active subscribers")).toBeInTheDocument();
  });

  it("highlights unread contacts in amber when unread > 0", () => {
    const { container } = render(<KpiCardsView {...base} unreadContacts={3} />);
    expect(container.innerHTML).toContain("amber");
  });

  it("does not highlight unread contacts when count is 0", () => {
    const { container } = render(<KpiCardsView {...base} unreadContacts={0} />);
    expect(container.innerHTML).not.toContain("amber");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
rtk npm test -- src/app/dashboard/\\[websiteId\\]/home/_components/__tests__/kpi-cards.test.tsx
```

Expected: FAIL with "Cannot find module '../kpi-cards'"

- [ ] **Step 3: Implement `kpi-cards.tsx`**

Create `src/app/dashboard/[websiteId]/home/_components/kpi-cards.tsx`:

```tsx
import { MailOpenIcon, MessageSquareIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contactRequestService, subscriberService } from "@/lib/domain";

interface KpiCardsViewProps {
  totalActive: number;
  newThisPeriod: number;
  growthRate: number | null;
  totalContacts: number;
  unreadContacts: number;
}

export function KpiCardsView({
  totalActive,
  newThisPeriod,
  growthRate,
  totalContacts,
  unreadContacts,
}: KpiCardsViewProps) {
  const isPositive = growthRate !== null && growthRate >= 0;
  const isNegative = growthRate !== null && growthRate < 0;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscribers</CardTitle>
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalActive.toLocaleString()}</div>
          {growthRate !== null ? (
            <p className={`text-xs ${isPositive ? "text-green-600" : "text-destructive"}`}>
              {isPositive ? `+${growthRate}%` : `${growthRate}%`} last 30 days
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">active subscribers</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">New This Period</CardTitle>
          <UserPlusIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{newThisPeriod.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">joined last 30 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
          <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalContacts.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">all time</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Unread Contacts</CardTitle>
          <MailOpenIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${unreadContacts > 0 ? "text-amber-600" : ""}`}>
            {unreadContacts.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">awaiting review</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function KpiCards({ websiteId }: { websiteId: string }) {
  const [subAnalytics, contactAnalytics] = await Promise.all([
    subscriberService.getAnalytics(websiteId, "30d"),
    contactRequestService.getContactAnalytics(websiteId),
  ]);

  return (
    <KpiCardsView
      totalActive={subAnalytics.totalActive}
      newThisPeriod={subAnalytics.newThisPeriod}
      growthRate={subAnalytics.growthRate}
      totalContacts={contactAnalytics.total}
      unreadContacts={contactAnalytics.unread}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
rtk npm test -- src/app/dashboard/\\[websiteId\\]/home/_components/__tests__/kpi-cards.test.tsx
```

Expected: 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/home/_components/kpi-cards.tsx' \
        'src/app/dashboard/[websiteId]/home/_components/__tests__/kpi-cards.test.tsx'
git commit -m "feat: add KPI cards for dashboard home"
```

---

## Task 3: Growth Section

**Files:**
- Create: `src/app/dashboard/[websiteId]/home/_components/growth-section.tsx`
- Create: `src/app/dashboard/[websiteId]/home/_components/__tests__/growth-section.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/dashboard/[websiteId]/home/_components/__tests__/growth-section.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import type { GrowthDataPoint } from "@/lib/domain/types";
import { GrowthSectionView } from "../growth-section";

// Recharts uses ResizeObserver internally
global.ResizeObserver = vi.fn(function ResizeObserverMock(this: ResizeObserver) {
  (this as unknown as { observe: () => void }).observe = vi.fn();
  (this as unknown as { unobserve: () => void }).unobserve = vi.fn();
  (this as unknown as { disconnect: () => void }).disconnect = vi.fn();
});

describe("GrowthSectionView", () => {
  it("renders 'Last 30 days' as the range label", () => {
    render(<GrowthSectionView data={[]} />);
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
  });

  it("renders without crashing when data is provided", () => {
    const data: GrowthDataPoint[] = [
      { date: "2026-04-01", newSubscribers: 10, unsubscribes: 2 },
    ];
    const { container } = render(<GrowthSectionView data={data} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows empty state message when data is empty", () => {
    render(<GrowthSectionView data={[]} />);
    expect(screen.getByText("No data for this period")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
rtk npm test -- src/app/dashboard/\\[websiteId\\]/home/_components/__tests__/growth-section.test.tsx
```

Expected: FAIL with "Cannot find module '../growth-section'"

- [ ] **Step 3: Implement `growth-section.tsx`**

Create `src/app/dashboard/[websiteId]/home/_components/growth-section.tsx`:

```tsx
import { GrowthChart } from "@/app/dashboard/[websiteId]/subscriber-analytics/_components/growth-chart";
import { subscriberService } from "@/lib/domain";
import type { GrowthDataPoint } from "@/lib/domain/types";

export function GrowthSectionView({ data }: { data: GrowthDataPoint[] }) {
  return <GrowthChart data={data} rangeLabel="Last 30 days" />;
}

export default async function GrowthSection({ websiteId }: { websiteId: string }) {
  const analytics = await subscriberService.getAnalytics(websiteId, "30d");
  return <GrowthSectionView data={analytics.growth} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
rtk npm test -- src/app/dashboard/\\[websiteId\\]/home/_components/__tests__/growth-section.test.tsx
```

Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/home/_components/growth-section.tsx' \
        'src/app/dashboard/[websiteId]/home/_components/__tests__/growth-section.test.tsx'
git commit -m "feat: add growth section for dashboard home"
```

---

## Task 4: Activity Feed

**Files:**
- Create: `src/app/dashboard/[websiteId]/home/_components/activity-feed.tsx`
- Create: `src/app/dashboard/[websiteId]/home/_components/__tests__/activity-feed.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/dashboard/[websiteId]/home/_components/__tests__/activity-feed.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { ActivityFeedView, mergeFeedEvents } from "../activity-feed";
import type { FeedEvent } from "../activity-feed";

vi.mock("@/components/relative-date", () => ({
  RelativeDate: ({ date }: { date: Date }) => <span data-testid="relative-date">{date.toISOString()}</span>,
}));

const minsAgo = (n: number) => new Date(Date.now() - n * 60 * 1000);

describe("mergeFeedEvents", () => {
  it("merges subscriber and contact events", () => {
    const subs = [{ email: "a@test.com", createdAt: minsAgo(1) }];
    const contacts = [{ name: "Bob", company: "Acme", createdAt: minsAgo(2) }];
    const events = mergeFeedEvents(subs, contacts);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("subscriber");
    expect(events[1].type).toBe("contact");
  });

  it("sorts events newest first", () => {
    const subs = [{ email: "a@test.com", createdAt: minsAgo(10) }];
    const contacts = [{ name: "Bob", company: null, createdAt: minsAgo(1) }];
    const events = mergeFeedEvents(subs, contacts);
    expect(events[0].type).toBe("contact");
    expect(events[1].type).toBe("subscriber");
  });

  it("limits output to 10 events", () => {
    const subs = Array.from({ length: 8 }, (_, i) => ({ email: `s${i}@test.com`, createdAt: minsAgo(i) }));
    const contacts = Array.from({ length: 6 }, (_, i) => ({
      name: `Bob ${i}`,
      company: null,
      createdAt: minsAgo(i + 8),
    }));
    expect(mergeFeedEvents(subs, contacts)).toHaveLength(10);
  });

  it("returns empty array when both inputs are empty", () => {
    expect(mergeFeedEvents([], [])).toEqual([]);
  });
});

describe("ActivityFeedView", () => {
  it("renders 'No recent activity' when events list is empty", () => {
    render(<ActivityFeedView events={[]} />);
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  it("renders subscriber event with email", () => {
    const events: FeedEvent[] = [{ type: "subscriber", email: "user@test.com", createdAt: new Date() }];
    render(<ActivityFeedView events={events} />);
    expect(screen.getByText("New subscriber: user@test.com")).toBeInTheDocument();
  });

  it("renders contact event with name and company", () => {
    const events: FeedEvent[] = [
      { type: "contact", name: "Alice Smith", company: "Acme Corp", createdAt: new Date() },
    ];
    render(<ActivityFeedView events={events} />);
    expect(screen.getByText("New contact: Alice Smith (Acme Corp)")).toBeInTheDocument();
  });

  it("renders contact event without company", () => {
    const events: FeedEvent[] = [{ type: "contact", name: "Alice Smith", company: null, createdAt: new Date() }];
    render(<ActivityFeedView events={events} />);
    expect(screen.getByText("New contact: Alice Smith")).toBeInTheDocument();
  });

  it("renders a relative date for each event", () => {
    const events: FeedEvent[] = [{ type: "subscriber", email: "x@test.com", createdAt: new Date() }];
    render(<ActivityFeedView events={events} />);
    expect(screen.getAllByTestId("relative-date")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
rtk npm test -- src/app/dashboard/\\[websiteId\\]/home/_components/__tests__/activity-feed.test.tsx
```

Expected: FAIL with "Cannot find module '../activity-feed'"

- [ ] **Step 3: Implement `activity-feed.tsx`**

Create `src/app/dashboard/[websiteId]/home/_components/activity-feed.tsx`:

```tsx
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
    contactRequestService.listContactRequests({ websiteId, sortField: "createdAt", sortDir: "desc", pageSize: 5 }),
  ]);

  const events = mergeFeedEvents(subscribers, contactRequests);
  return <ActivityFeedView events={events} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
rtk npm test -- src/app/dashboard/\\[websiteId\\]/home/_components/__tests__/activity-feed.test.tsx
```

Expected: 9 tests pass

- [ ] **Step 5: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/home/_components/activity-feed.tsx' \
        'src/app/dashboard/[websiteId]/home/_components/__tests__/activity-feed.test.tsx'
git commit -m "feat: add activity feed for dashboard home"
```

---

## Task 5: Quick Actions

**Files:**
- Create: `src/app/dashboard/[websiteId]/home/_components/quick-actions.tsx`
- Create: `src/app/dashboard/[websiteId]/home/_components/__tests__/quick-actions.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/dashboard/[websiteId]/home/_components/__tests__/quick-actions.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickActions } from "../quick-actions";

vi.mock("@/app/dashboard/[websiteId]/subscribers-list/actions", () => ({
  exportSubscribers: vi.fn().mockResolvedValue({ subscribers: [] }),
}));

vi.mock("@/lib/export-csv", () => ({
  downloadCsv: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/website-form-modal", () => ({
  WebsiteFormModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="Add Website" /> : null,
}));

describe("QuickActions", () => {
  it("renders all three action buttons", () => {
    render(<QuickActions websiteId="site_1" />);
    expect(screen.getByText(/Export Subscriber List/)).toBeInTheDocument();
    expect(screen.getByText("Add New Website")).toBeInTheDocument();
    expect(screen.getByText("Go to Integration")).toBeInTheDocument();
  });

  it("opens add website modal when button is clicked", async () => {
    const user = userEvent.setup();
    render(<QuickActions websiteId="site_1" />);
    await user.click(screen.getByText("Add New Website"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("integration link points to the correct URL", () => {
    render(<QuickActions websiteId="site_abc123" />);
    const link = screen.getByRole("link", { name: /Go to Integration/ });
    expect(link).toHaveAttribute("href", "/dashboard/site_abc123/subscriber-integration");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
rtk npm test -- src/app/dashboard/\\[websiteId\\]/home/_components/__tests__/quick-actions.test.tsx
```

Expected: FAIL with "Cannot find module '../quick-actions'"

- [ ] **Step 3: Implement `quick-actions.tsx`**

Create `src/app/dashboard/[websiteId]/home/_components/quick-actions.tsx`:

```tsx
"use client";

import { Code2Icon, DownloadIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { exportSubscribers } from "@/app/dashboard/[websiteId]/subscribers-list/actions";
import { WebsiteFormModal } from "@/components/website-form-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadCsv } from "@/lib/export-csv";

export function QuickActions({ websiteId }: { websiteId: string }) {
  const [addWebsiteOpen, setAddWebsiteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result = await exportSubscribers({ websiteId, status: "active" });
      if ("subscribers" in result) {
        downloadCsv(
          result.subscribers.map((s) => ({
            email: s.email,
            firstName: s.firstName ?? "",
            lastName: s.lastName ?? "",
            createdAt: s.createdAt,
            status: s.unsubscribedAt ? "unsubscribed" : "active",
          })),
          "subscribers.csv",
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="justify-start"
          onClick={handleExport}
          disabled={isPending}>
          <DownloadIcon className="mr-2 h-4 w-4" />
          {isPending ? "Exporting..." : "Export Subscriber List (CSV)"}
        </Button>

        <Button
          variant="outline"
          className="justify-start"
          onClick={() => setAddWebsiteOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add New Website
        </Button>

        <Button variant="outline" className="justify-start" asChild>
          <Link href={`/dashboard/${websiteId}/subscriber-integration`}>
            <Code2Icon className="mr-2 h-4 w-4" />
            Go to Integration
          </Link>
        </Button>
      </CardContent>

      <WebsiteFormModal open={addWebsiteOpen} onOpenChange={setAddWebsiteOpen} />
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
rtk npm test -- src/app/dashboard/\\[websiteId\\]/home/_components/__tests__/quick-actions.test.tsx
```

Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/home/_components/quick-actions.tsx' \
        'src/app/dashboard/[websiteId]/home/_components/__tests__/quick-actions.test.tsx'
git commit -m "feat: add quick actions panel for dashboard home"
```

---

## Task 6: Wire up the page

**Files:**
- Modify: `src/app/dashboard/[websiteId]/home/page.tsx`

- [ ] **Step 1: Replace the page with the full implementation**

Overwrite `src/app/dashboard/[websiteId]/home/page.tsx`:

```tsx
import { Suspense } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Separator from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getWebsite } from "@/lib/route-helpers";
import ActivityFeed from "./_components/activity-feed";
import GrowthSection from "./_components/growth-section";
import KpiCards from "./_components/kpi-cards";
import { QuickActions } from "./_components/quick-actions";

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[280px] w-full" />
      </CardContent>
    </Card>
  );
}

function FeedSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function HomePage({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;
  const website = await getWebsite(websiteId);

  return (
    <>
      <header className="border-b flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>{website.name}</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Home</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight">Mission Control</h2>
          <p className="text-muted-foreground">Your application's health and activity at a glance.</p>
        </div>

        <div className="flex flex-col gap-4">
          <Suspense fallback={<KpiSkeleton />}>
            <KpiCards websiteId={websiteId} />
          </Suspense>

          <Suspense fallback={<ChartSkeleton />}>
            <GrowthSection websiteId={websiteId} />
          </Suspense>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Suspense fallback={<FeedSkeleton />}>
                <ActivityFeed websiteId={websiteId} />
              </Suspense>
            </div>
            <QuickActions websiteId={websiteId} />
          </div>
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Run the full test suite**

```bash
rtk npm test
```

Expected: all tests pass (no regressions)

- [ ] **Step 3: Run the linter**

```bash
rtk npm run lint
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/home/page.tsx'
git commit -m "feat: wire up mission control dashboard home page"
```

---

## Task 7: Open PR

- [ ] **Step 1: Push branch and open pull request**

```bash
git push -u origin feat/dashboard-home-mission-control
```

PR title: `feat: mission control dashboard home page`

PR body:
```
## Summary
- Replaces placeholder home page with a "Mission Control" dashboard
- Adds KPI cards (total subscribers, new this period, total contacts, unread contacts)
- Adds 30-day subscriber growth chart (reuses existing GrowthChart component)
- Adds combined activity feed (recent subscribers + contacts merged by time)
- Adds Quick Actions panel (export CSV, add website, go to integration)

## How to test
1. Log in and navigate to `/dashboard/[any-site-id]/home`
2. Verify KPI cards load with real data and growth badge is green/red/absent
3. Verify growth chart renders with Last 30 days label
4. Verify activity feed shows recent events in chronological order
5. Click "Export Subscriber List (CSV)" — verify download triggers
6. Click "Add New Website" — verify modal opens
7. Click "Go to Integration" — verify navigation to integration page
```
