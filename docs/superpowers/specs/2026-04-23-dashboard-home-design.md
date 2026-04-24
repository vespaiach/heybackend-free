# Dashboard Home Page — Mission Control

**Date:** 2026-04-23  
**Status:** Approved

---

## Overview

Replace the placeholder `/dashboard/[websiteId]/home` page with a "Mission Control" dashboard that gives users an immediate pulse on their application's health and activity. The page uses React 19 RSC streaming via `<Suspense>` — each section loads independently without blocking the page shell.

---

## Architecture

**Approach:** Sectioned RSC with `<Suspense>` streaming (Option B).

The page shell renders instantly. Each data-fetching section is an async RSC wrapped in `<Suspense>` with a skeleton fallback. Sections load in parallel as their queries resolve. This aligns with existing patterns in `subscriber-analytics/page.tsx` and requires no new API routes or client-side fetching.

**Data sources (no new infrastructure required):**
- `subscriberService.getAnalytics(websiteId, "30d")` — subscriber KPIs + growth chart
- `contactRequestService.getContactAnalytics(websiteId)` — contact KPIs
- `subscriberService.listSubscribers({ websiteId, sortField: "createdAt", sortDir: "desc", pageSize: 5 })` — recent subscriber events
- `contactRequestService.listContactRequests({ websiteId, sortField: "createdAt", sortDir: "desc", pageSize: 5 })` — recent contact events

**Out of scope:** API Success Rate, Monthly Request counters, AI Model Latency, Database storage usage — these have no existing data source and would require new infrastructure.

---

## Page Layout

```
HomePage (async RSC)
├── Header (breadcrumb + "Mission Control" title)
├── <Suspense fallback=<KpiSkeleton>>    → <KpiCards websiteId>
├── <Suspense fallback=<ChartSkeleton>>  → <GrowthSection websiteId>
└── grid-cols-1 lg:grid-cols-3 row
    ├── col-span-2: <Suspense fallback=<FeedSkeleton>> → <ActivityFeed websiteId>
    └── col-span-1: <QuickActions websiteId>  (static, no Suspense)
```

---

## Section 1: KPI Cards

**File:** `_components/kpi-cards.tsx` (async RSC)

Fetches both analytics services in parallel via `Promise.all`. Renders four cards in `grid-cols-2 sm:grid-cols-4` — same pattern as existing `stat-cards.tsx`.

| Card | Value | Badge |
|------|-------|-------|
| Total Subscribers | `totalActive` | 30-day growth % (green/red) |
| New This Period | `newThisPeriod` | "last 30 days" label |
| Total Contacts | `ContactAnalytics.total` | — |
| Unread Contacts | `ContactAnalytics.unread` | red badge if > 0 |

Growth % badge uses `growthRate` from `SubscriberAnalytics`. Positive = green (`text-green-600`), negative = red (`text-destructive`), null = hidden.

**Skeleton:** Four `<Card>` shells with animated pulse placeholder content.

---

## Section 2: Growth Chart

**File:** `_components/growth-section.tsx` (async RSC)

Fetches `subscriberService.getAnalytics(websiteId, "30d")` and passes the `growth: GrowthDataPoint[]` array to the existing `<GrowthChart>` component from `subscriber-analytics/_components/growth-chart.tsx`. No range selector — fixed to 30 days. Renders full-width.

**Skeleton:** A `<Card>` with animated pulse at `h-[280px]`.

---

## Section 3: Activity Feed

**File:** `_components/activity-feed.tsx` (async RSC)

Fetches subscriber list and contact list in parallel. Merges into a single array of typed events, sorts descending by `createdAt`, takes the top 10.

**Event shape:**
```ts
type FeedEvent =
  | { type: "subscriber"; email: string; createdAt: Date }
  | { type: "contact"; name: string; company: string | null; createdAt: Date };
```

Each row:
- Colored icon dot: `UserPlusIcon` (blue) for subscribers, `MessageSquareIcon` (violet) for contacts
- Description: `"New subscriber: email@example.com"` or `"New contact: Name (Company)"`
- Relative timestamp via existing `<RelativeDate>` component

Renders inside a `<Card>` with title "Recent Activity" and a scrollable list (`max-h-[400px] overflow-y-auto`).

Empty state: "No recent activity" centered message.

**Skeleton:** Ten placeholder rows with animated pulse.

---

## Section 4: Quick Actions

**File:** `_components/quick-actions.tsx` (`"use client"`)

Static card — no data fetching. Three actions:

1. **Export Subscriber List (CSV)** — `<Button variant="outline">` with `DownloadIcon`. Calls the existing export server action from `subscribers-list/actions.ts`. Shows loading state while downloading.
2. **Add New Website** — `<Button variant="outline">` with `PlusIcon`. Opens `<WebsiteFormModal>` via local `useState`. Needs `"use client"` for modal state.
3. **Go to Integration** — `<Link href="/dashboard/${websiteId}/subscriber-integration">` styled as `<Button variant="outline">` with `Code2Icon`.

Renders in a `<Card>` with title "Quick Actions". Buttons stacked vertically (`flex flex-col gap-2`).

---

## File Layout

```
src/app/dashboard/[websiteId]/home/
├── page.tsx
└── _components/
    ├── kpi-cards.tsx
    ├── growth-section.tsx
    ├── activity-feed.tsx
    ├── quick-actions.tsx
    └── __tests__/
        ├── kpi-cards.test.tsx
        ├── growth-section.test.tsx
        ├── activity-feed.test.tsx
        └── quick-actions.test.tsx
```

---

## Testing

Each component gets a `.test.tsx` in `_components/__tests__/`. Services are mocked (no real DB calls). Test cases per component:

- **kpi-cards:** renders correct values; shows growth badge green/red/hidden; handles null growthRate
- **growth-section:** passes growth data to `<GrowthChart>`; renders empty state when data is empty
- **activity-feed:** merges and sorts events correctly; renders subscriber and contact rows; shows empty state
- **quick-actions:** renders all three actions; export button triggers server action; modal opens on "Add New Website"

All tests use `vi.fn()` for mocks and `userEvent` for interactions. Run `npm test` before marking done.

---

## Constraints

- No new API routes, database tables, or Redis counters
- No `useMemo`/`useCallback` (React Compiler is enabled)
- Tailwind v4 + CSS variables — no hardcoded colors outside the theme
- Biome lint must pass (`npm run lint`)
- `"use client"` only on `quick-actions.tsx` (needs modal state)
