# Contact Analytics Page — Design Spec

**Date:** 2026-04-17  
**Status:** Approved

---

## Problem

The dashboard has no analytics for contact request data. Users cannot identify submission patterns, track growth trends, or understand which companies generate the most contacts. This page fills that gap.

---

## Scope

A new standalone analytics page for contact requests, accessible via a "Contacts > Analytics" sidebar nav item on the per-website dashboard. Shows all-time data only — no date range filter. Read-only; no mutations.

---

## Architecture

### Approach

Follows the existing subscriber analytics pattern exactly:

1. A single `getContactAnalytics(websiteId)` method added to `ContactRequestService`
2. Four Prisma queries run in `Promise.all` — no sequential dependencies
3. RSC page fetches once, passes typed slices to `_components`
4. No client-side data fetching, no API routes, no server actions

### Data Flow

```
RSC page.tsx
  └── contactRequestService.getContactAnalytics(websiteId)
        ├── Query 1: groupBy day → dailyActivity
        ├── Query 2: groupBy month → monthlyTrend + momChange
        ├── Query 3: groupBy company → companyBreakdown
        └── Query 4: count total + count where readAt != null → stat totals
  └── passes slices to:
        ├── <StatCards total unread read />
        ├── <ActivityHeatmap dailyActivity />
        ├── <GrowthCard momChange monthlyTrend />
        └── <CompanyChart companyBreakdown />
```

---

## Domain Layer

### New type: `ContactAnalytics`

```ts
// src/lib/domain/types.ts (addition)
export type ContactAnalytics = {
  // Stat cards
  total: number;
  unread: number;
  read: number;

  // Growth
  momChange: number | null; // null when no prior-month data exists
  monthlyTrend: { month: string; count: number }[]; // last 12 months, "YYYY-MM" format

  // Heatmap
  dailyActivity: { date: string; count: number }[]; // last 365 days, ISO date "YYYY-MM-DD"

  // Company breakdown
  companyBreakdown: { company: string; count: number }[]; // top 8 + "Unknown" + "Others"
};
```

### New interface method

```ts
// ContactRequestService interface addition
getContactAnalytics(websiteId: string): Promise<ContactAnalytics>;
```

### Implementation details (`PrismaContactRequestService`)

**Query 1 — Daily activity (heatmap):**
Fetch all contacts for the website created in the last 365 days, group by date using `createdAt`. Return as `{ date: "YYYY-MM-DD", count: number }[]`.

**Query 2 — Monthly trend + MoM:**
Group contacts by month for the last 12 months. Derive `momChange` as `((currentMonth - prevMonth) / prevMonth) * 100`, rounded to one decimal. Return `null` if `prevMonth` is 0 or missing.

**Query 3 — Company breakdown:**
`groupBy company`, order by `_count desc`. Take top 8 named companies. Contacts where `company` is `null` or empty string are counted as `"Unknown"`. Any companies beyond the top 8 are summed into `"Others"`. Only include `"Unknown"` and `"Others"` slices if their counts are > 0.

**Query 4 — Stat totals:**
- `total`: `prisma.contactRequest.count({ where: { websiteId } })`
- `read`: `count where readAt != null`
- `unread`: `total - read`

---

## Page & Route

**Route:** `src/app/dashboard/[websiteId]/contact-analytics/page.tsx`

**Layout** (top to bottom):
1. Header with breadcrumb: `{website.name} > Contacts > Analytics`
2. Stat cards row — 3 cards: Total Contacts, Unread, Read
3. Activity Heatmap — full-width card, GitHub-style daily squares for the past year
4. Two-column row (on md+): Growth card (left) | Company pie chart (right)

---

## Components

All components live in `src/app/dashboard/[websiteId]/contact-analytics/_components/`.

### `stat-cards.tsx`
Props: `{ total: number; unread: number; read: number }`  
Three shadcn `<Card>` components in a responsive grid (3 columns on md+). Each shows label + count. "Unread" card highlights in amber when `unread > 0`.

### `activity-heatmap.tsx`
Props: `{ dailyActivity: { date: string; count: number }[] }`  
Pure CSS grid — 53 columns × 7 rows (weeks × days). Each cell is a colored square using Tailwind background opacity classes driven by count. Four intensity levels: 0 submissions (muted), 1–2 (light), 3–6 (medium), 7+ (strong). Uses the theme's primary color via CSS variable. Tooltip on hover showing date + count (title attribute for simplicity — no JS tooltip needed).  
Renders month labels above the grid.

### `growth-card.tsx`
Props: `{ momChange: number | null; monthlyTrend: { month: string; count: number }[] }`  
shadcn `<Card>` with:
- Large MoM badge: green ▲ for positive, red ▼ for negative, gray `–` for null
- Subtitle: "vs last month"
- Compact sparkline below using shadcn `ChartContainer` + Recharts `LineChart` (no axes, no grid, just the line + dots)

### `company-chart.tsx`
Props: `{ companyBreakdown: { company: string; count: number }[] }`  
shadcn `<Card>` with shadcn `ChartContainer` + Recharts `PieChart`. Shows top 8 companies + "Unknown" + "Others" slices. Includes `ChartLegend` below the pie. Uses shadcn chart color tokens (`chart-1` through `chart-5` cycling). Tooltip via `ChartTooltip` showing company name + count.

---

## Sidebar Navigation

File: `src/components/app-sidebar.tsx` (or equivalent sidebar nav config).

Add a "Contacts" category group with two items:
- **Contacts** → `/dashboard/[websiteId]/contacts-list` (existing, moved under group)
- **Analytics** → `/dashboard/[websiteId]/contact-analytics` (new)

---

## Testing

### Domain service tests
**File:** `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts` (additions)

- `getContactAnalytics` returns correct `total`, `read`, `unread` counts
- `momChange` is `null` when prior month has 0 contacts
- `momChange` calculates correctly for normal cases (e.g. 10 → 12 = +20%)
- Company bucketing: top 8 named, rest → "Others", nulls → "Unknown"
- "Unknown" and "Others" omitted when count is 0
- `dailyActivity` only includes dates within the last 365 days

### Component tests
Each component has a `__tests__/` file verifying:
- Renders without error given realistic fixture data
- Handles empty/zero state gracefully (e.g. empty `dailyActivity`, `momChange: null`, empty `companyBreakdown`)

Files:
- `_components/__tests__/stat-cards.test.tsx`
- `_components/__tests__/activity-heatmap.test.tsx`
- `_components/__tests__/growth-card.test.tsx`
- `_components/__tests__/company-chart.test.tsx`

---

## Files to Create / Modify

| Action | Path |
|--------|------|
| Modify | `src/lib/domain/types.ts` — add `ContactAnalytics` type |
| Modify | `src/lib/domain/contact-request/contact-request-service.interface.ts` — add method |
| Modify | `src/lib/domain/contact-request/contact-request-service.ts` — implement method |
| Modify | `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts` — add tests |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/page.tsx` |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/stat-cards.tsx` |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/activity-heatmap.tsx` |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/growth-card.tsx` |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/company-chart.tsx` |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/stat-cards.test.tsx` |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/activity-heatmap.test.tsx` |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/growth-card.test.tsx` |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/company-chart.test.tsx` |
| Modify | `src/components/app-sidebar.tsx` (or nav config) — add Contacts group + Analytics item |
