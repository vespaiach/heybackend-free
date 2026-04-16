# Subscriber Analytics Page — Design Spec

**Date:** 2026-04-16  
**Status:** Approved  
**Route:** `/dashboard/[websiteId]/subscriber-analytics`

---

## Problem

Users have no way to visualize subscriber trends, understand where their audience is located, or see how their audience breaks down by device, OS, or loyalty. The sidebar already links to `/dashboard/[websiteId]/subscriber-analytics` but the route does not exist.

---

## Goals

1. Show subscriber growth trend over time (new subscribers + unsubscribes)
2. Show geographic breakdown (which countries have the most subscribers)
3. Show Mobile vs Desktop split and OS platform breakdown
4. Show subscriber loyalty cohorts (how long subscribers have been around)

---

## Reference Design

Mimics the analytics dashboard style from the reference screenshot:
- Full-width area chart at the top
- Stat cards in a row below the chart
- Multi-column card grid at the bottom

---

## Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Analytics"               [7d] [30d] [90d] [All]  │
├─────────────────────────────────────────────────────────────┤
│  Subscriber Growth (full-width AreaChart with gradient)     │
├──────────┬──────────┬──────────┬──────────────────────────┤
│ Total    │ New This │ Unsub-   │ Growth Rate               │
│ Active   │ Period   │ scribed  │ (% vs prev period)        │
├──────────┴──────────┴──────────┴──────────────────────────┤
│ By Country        │ Devices & Platforms │ Subscriber Age   │
│ (top 5 + View All)│ (device + OS bars)  │ (4 cohort bars)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Sections

### 1. Range Selector

- Client component (`"use client"`)
- Segmented control: **7d · 30d · 90d · All**
- Updates `?range=` search param via `useRouter` — triggers RSC re-fetch
- Default: `30d`

### 2. Subscriber Growth Chart

- **Component**: `growth-chart.tsx`
- **shadcn chart**: `AreaChart` with gradient fills
  - Area 1: **New Subscribers** — primary color with gradient opacity 0.4 → 0
  - Area 2: **Unsubscribes** — destructive/muted color with gradient opacity 0.3 → 0
- X axis: dates (formatted as `MMM d`)
- Y axis: subscriber count
- Tooltip: shows both values for the hovered date
- Data source: `analytics.growth` — array of `{ date, newSubscribers, unsubscribes }`

### 3. Stat Cards

Four cards in a responsive 4-column grid (collapses to 2×2 on mobile):

| Card | Value | Icon | Sub-label |
|------|-------|------|-----------|
| Total Active | `totalActive` | `Users` | "active subscribers" |
| New This Period | `newThisPeriod` | `UserPlus` | "joined in range" |
| Unsubscribed | `unsubscribedThisPeriod` | `UserMinus` | "left in range" |
| Growth Rate | `growthRate` + "%" | `TrendingUp`/`TrendingDown` | "vs previous period" — null shown as "—" for "All" range |

### 4. By Country Card

- **Component**: `countries-card.tsx`
- Title: "Subscribers by Country" · Sub: time range label
- "View All >" button (top-right) — opens a shadcn `Dialog`
- List shows top 5 countries from `analytics.topCountries`
- Each row: `[flag emoji] [country name]` · `[count]` right-aligned
- Flag emoji derived from country name via a two-step local lookup: country name → ISO 3166-1 alpha-2 code → Unicode regional indicator emoji (e.g. "United States" → "US" → 🇺🇸). No external library needed.
- "View All" `Dialog` shows the full list (up to 20 countries) in the same row format
- If no country data: empty state — "No location data yet"

### 5. Devices & Platforms Card

- **Component**: `devices-platforms-card.tsx`
- **Top section** — "Devices":
  - 3 rows: Mobile · Tablet · Desktop
  - Each row: label + horizontal progress bar + percentage
  - Data: `analytics.deviceBreakdown` — percentages computed over `mobile + tablet + desktop` total only; `unknown` count excluded from the percentage calculation and not shown as a row
- `<Separator />` divider
- **Bottom section** — "Platforms":
  - Top 5 OS entries from `analytics.topOS`
  - Each row: OS name + horizontal progress bar + count
  - Unknown/null OS excluded
- If no device/OS data: empty state per section

### 6. Subscriber Age Card

- **Component**: `subscriber-age-card.tsx`
- Title: "Subscriber Age" · Sub: "Loyalty cohorts"
- 4 rows, each with emoji + label + count + percentage of total active:

| Emoji | Label | Cohort definition |
|-------|-------|-------------------|
| 🌱 | Seedlings | `createdAt` ≤ 30 days ago |
| 🌿 | Sprouts | `createdAt` > 30 days and ≤ 3 months ago |
| 🌳 | Saplings | `createdAt` > 3 months and ≤ 6 months ago |
| 🌲 | Evergreens | `createdAt` > 6 months ago |

- Displayed as horizontal progress bars (percentage of `totalActive`)
- Note: cohort counts are computed against **all-time active subscribers** regardless of selected range (loyalty is not range-dependent)

---

## Data Layer Changes

### `src/lib/domain/types.ts`

Add to `SubscriberAnalytics`:

```ts
topOS: { os: string; count: number }[];
subscriberAge: {
  seedlings: number;   // active, createdAt <= now - 30d
  sprouts: number;     // active, createdAt in (now-90d, now-30d]
  saplings: number;    // active, createdAt in (now-180d, now-90d]
  evergreens: number;  // active, createdAt <= now - 180d
};
```

### `src/lib/domain/subscriber/subscriber-service.ts`

In `getAnalytics()`:

1. **OS breakdown** — add `groupBy os` query (top 10, nulls excluded):
   ```ts
   const osRows = await prisma.subscriber.groupBy({
     by: ["os"],
     where: { websiteId, os: { not: null } },
     _count: { os: true },
     orderBy: { _count: { os: "desc" } },
     take: 10,
   });
   ```

2. **Subscriber age** — 4 count queries (always all-time, not range-filtered). Date offsets computed with plain `Date` math:
   ```ts
   const now = new Date();
   const d30  = new Date(now.getTime() - 30  * 86_400_000);
   const d90  = new Date(now.getTime() - 90  * 86_400_000);
   const d180 = new Date(now.getTime() - 180 * 86_400_000);
   const [seedlings, sprouts, saplings, evergreens] = await Promise.all([
     prisma.subscriber.count({ where: { websiteId, unsubscribedAt: null, createdAt: { gte: d30 } } }),
     prisma.subscriber.count({ where: { websiteId, unsubscribedAt: null, createdAt: { gte: d90,  lt: d30  } } }),
     prisma.subscriber.count({ where: { websiteId, unsubscribedAt: null, createdAt: { gte: d180, lt: d90  } } }),
     prisma.subscriber.count({ where: { websiteId, unsubscribedAt: null, createdAt: { lt: d180 } } }),
   ]);
   ```

3. **Countries** — bump `take: 10 → 20`

4. Return the new fields in the `SubscriberAnalytics` result object.

---

## Component Architecture

```
src/app/dashboard/[websiteId]/subscriber-analytics/
├── page.tsx                         # RSC — reads searchParams.range, fetches analytics
└── _components/
    ├── range-selector.tsx            # "use client" — segmented [7d][30d][90d][All]
    ├── growth-chart.tsx              # shadcn AreaChart with gradient
    ├── stat-cards.tsx                # 4 KPI cards
    ├── countries-card.tsx            # Top 5 + View All Dialog
    └── devices-platforms-card.tsx    # Device bars + divider + OS bars
    └── subscriber-age-card.tsx       # 4 cohort progress bars
```

### `page.tsx` (RSC)

```ts
export default async function SubscriberAnalyticsPage({ params, searchParams }) {
  // auth + tenant guard (same pattern as other [websiteId] pages)
  const range: AnalyticsRange = searchParams.range ?? "30d";
  const analytics = await subscriberService.getAnalytics(websiteId, range);
  // render layout with components
}
```

---

## shadcn Components Used

All already available in the project or added via `npx shadcn@latest add`:

- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `AreaChart` (from `@/components/ui/chart` — shadcn chart wrapper over Recharts)
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`
- `Progress` (or inline `<div>` bars with Tailwind for full control)
- `Separator`
- `Tabs` / `ToggleGroup` for range selector (or simple button group)

---

## Routing & Navigation

- The sidebar already links to `/dashboard/[websiteId]/subscriber-analytics` — no sidebar changes needed.
- The page reads `searchParams.range`; the range selector pushes `?range=X` to the URL.
- No new API route handler required — all data fetching is server-side in the RSC.

---

## Testing

Each new component gets a corresponding `__tests__/*.test.tsx` file:

- `growth-chart.test.tsx` — renders with empty data, renders with data points
- `stat-cards.test.tsx` — renders all four cards, handles null growthRate
- `countries-card.test.tsx` — renders top 5, "View All" opens dialog, handles empty state
- `devices-platforms-card.test.tsx` — renders device bars, OS bars, handles unknown devices
- `subscriber-age-card.test.tsx` — renders all 4 cohorts, computes percentages correctly
- `range-selector.test.tsx` — clicking a range updates the URL param

Domain service changes covered by existing service test patterns.

---

## Out of Scope

- Real-time / live data updates (no WebSocket/polling)
- Exporting analytics as CSV
- Per-tag analytics breakdown
- Email open/click rate tracking (no email sending feature yet)
