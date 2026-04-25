# Subscriber Analytics Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/dashboard/[websiteId]/subscriber-analytics` page with a growth area chart, 4 stat cards, and a 3-column grid of country, device/OS, and subscriber-age cards.

**Architecture:** RSC page reads `?range=` from searchParams and fetches analytics server-side via `subscriberService.getAnalytics()`. A small `"use client"` range selector pushes URL params to trigger re-renders. All chart/card components are pure presentational — they receive data as props.

**Tech Stack:** Next.js 16 App Router (RSC), React 19, shadcn/ui (Card, Chart, Dialog, Separator), Recharts (AreaChart + Area), Tailwind CSS v4, Vitest + React Testing Library, Prisma 6, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-04-16-subscriber-analytics-page-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/domain/types.ts` | Add `topOS` + `subscriberAge` to `SubscriberAnalytics` |
| Modify | `src/lib/domain/subscriber/subscriber-service.ts` | Add OS + age queries, bump countries take to 20 |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/page.tsx` | RSC — auth guard, fetch analytics, render layout |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/range-selector.tsx` | `"use client"` — segmented [7d][30d][90d][All] buttons |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/growth-chart.tsx` | Recharts AreaChart with gradient fills |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/stat-cards.tsx` | 4 KPI cards (total, new, unsub, growth rate) |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/countries-card.tsx` | Top 5 countries + View All Dialog |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/country-flag.ts` | Country name → ISO alpha-2 → flag emoji lookup |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/devices-platforms-card.tsx` | Device bars + OS bars with Separator |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/subscriber-age-card.tsx` | 4 loyalty cohort progress bars |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/range-selector.test.tsx` | Unit tests |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/growth-chart.test.tsx` | Unit tests |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/stat-cards.test.tsx` | Unit tests |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/countries-card.test.tsx` | Unit tests |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/devices-platforms-card.test.tsx` | Unit tests |
| Create | `src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/subscriber-age-card.test.tsx` | Unit tests |

---

## Task 1: Extend domain types — `topOS` and `subscriberAge`

**Files:**
- Modify: `src/lib/domain/types.ts`

- [ ] **Step 1: Add `topOS` and `subscriberAge` to `SubscriberAnalytics` in `types.ts`**

Locate the `SubscriberAnalytics` interface (around line 214) and add two new fields:

```ts
export interface SubscriberAnalytics {
  // Stat cards
  totalActive: number;
  newThisPeriod: number;
  unsubscribedThisPeriod: number;
  growthRate: number | null;

  // Charts
  growth: GrowthDataPoint[];
  statusBreakdown: { active: number; unsubscribed: number };
  topCountries: { country: string; count: number }[];
  deviceBreakdown: { mobile: number; tablet: number; desktop: number; unknown: number };
  topTimezones: { timezone: string; count: number }[];

  // NEW
  topOS: { os: string; count: number }[];
  subscriberAge: {
    seedlings: number;   // active subscribers, createdAt within last 30 days
    sprouts: number;     // active subscribers, createdAt 30–90 days ago
    saplings: number;    // active subscribers, createdAt 90–180 days ago
    evergreens: number;  // active subscribers, createdAt more than 180 days ago
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles (no implementation yet)**

```bash
npx tsc --noEmit 2>&1 | grep "types.ts"
```

Expected: errors pointing to `subscriber-service.ts` (return type mismatch) — that's correct, we'll fix it in Task 2. No errors in `types.ts` itself.

---

## Task 2: Update `getAnalytics()` — OS query, age cohorts, bump countries

**Files:**
- Modify: `src/lib/domain/subscriber/subscriber-service.ts`

- [ ] **Step 1: Add OS groupBy query and age cohort counts inside `getAnalytics()`**

After the existing `timezoneRows` block (around line 496), add:

```ts
// OS breakdown
const osRows = await prisma.subscriber.groupBy({
  by: ["os"],
  where: { websiteId, os: { not: null } },
  _count: { os: true },
  orderBy: { _count: { os: "desc" } },
  take: 10,
});

// Subscriber age cohorts (always all-time, range-independent)
const ageNow = new Date();
const d30  = new Date(ageNow.getTime() - 30  * 86_400_000);
const d90  = new Date(ageNow.getTime() - 90  * 86_400_000);
const d180 = new Date(ageNow.getTime() - 180 * 86_400_000);
const [ageSeedlings, ageSprouts, ageSaplings, ageEvergreens] = await Promise.all([
  prisma.subscriber.count({ where: { websiteId, unsubscribedAt: null, createdAt: { gte: d30 } } }),
  prisma.subscriber.count({ where: { websiteId, unsubscribedAt: null, createdAt: { gte: d90,  lt: d30  } } }),
  prisma.subscriber.count({ where: { websiteId, unsubscribedAt: null, createdAt: { gte: d180, lt: d90  } } }),
  prisma.subscriber.count({ where: { websiteId, unsubscribedAt: null, createdAt: { lt: d180 } } }),
]);
```

- [ ] **Step 2: Bump `topCountries` take from 10 to 20**

In `getAnalytics()`, find the `countryRows` groupBy call and change `take: 10` → `take: 20`.

- [ ] **Step 3: Add new fields to the return object**

Update the `return` statement at the end of `getAnalytics()`:

```ts
return {
  totalActive,
  newThisPeriod: newThisPeriodCount,
  unsubscribedThisPeriod: unsubscribedThisPeriodCount,
  growthRate,
  growth: fillGrowthGaps(signupMap, unsubMap, rangeStart, now),
  statusBreakdown: { active: totalActive, unsubscribed: totalUnsubscribed },
  topCountries: countryRows.map((r) => ({ country: r.country as string, count: r._count.country })),
  deviceBreakdown,
  topTimezones: timezoneRows.map((r) => ({ timezone: r.timezone as string, count: r._count.timezone })),
  topOS: osRows.map((r) => ({ os: r.os as string, count: r._count.os })),
  subscriberAge: {
    seedlings: ageSeedlings,
    sprouts: ageSprouts,
    saplings: ageSaplings,
    evergreens: ageEvergreens,
  },
};
```

- [ ] **Step 4: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit 2>&1 | grep -E "error|warning" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/subscriber-analytics-page
git add src/lib/domain/types.ts src/lib/domain/subscriber/subscriber-service.ts
git commit -m "feat(analytics): extend SubscriberAnalytics with topOS and subscriberAge"
```

---

## Task 3: Country flag utility

**Files:**
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/country-flag.ts`

- [ ] **Step 1: Create the country name → flag emoji lookup**

```ts
// Maps a stored country name (as returned by geo-enrichment) to a Unicode flag emoji.
// Converts country name → ISO 3166-1 alpha-2 code → regional indicator emoji pair.
const NAME_TO_CODE: Record<string, string> = {
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Argentina": "AR",
  "Australia": "AU", "Austria": "AT", "Bangladesh": "BD", "Belgium": "BE",
  "Brazil": "BR", "Canada": "CA", "Chile": "CL", "China": "CN",
  "Colombia": "CO", "Croatia": "HR", "Czech Republic": "CZ", "Denmark": "DK",
  "Egypt": "EG", "Finland": "FI", "France": "FR", "Germany": "DE",
  "Ghana": "GH", "Greece": "GR", "Hong Kong": "HK", "Hungary": "HU",
  "India": "IN", "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ",
  "Ireland": "IE", "Israel": "IL", "Italy": "IT", "Japan": "JP",
  "Jordan": "JO", "Kenya": "KE", "Malaysia": "MY", "Mexico": "MX",
  "Morocco": "MA", "Netherlands": "NL", "New Zealand": "NZ", "Nigeria": "NG",
  "Norway": "NO", "Pakistan": "PK", "Peru": "PE", "Philippines": "PH",
  "Poland": "PL", "Portugal": "PT", "Romania": "RO", "Russia": "RU",
  "Saudi Arabia": "SA", "Singapore": "SG", "South Africa": "ZA",
  "South Korea": "KR", "Spain": "ES", "Sweden": "SE", "Switzerland": "CH",
  "Taiwan": "TW", "Thailand": "TH", "Turkey": "TR", "Ukraine": "UA",
  "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US",
  "Venezuela": "VE", "Vietnam": "VN",
};

function codeToFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65))
    .join("");
}

export function countryFlag(name: string): string {
  const code = NAME_TO_CODE[name];
  return code ? codeToFlag(code) : "🌐";
}
```

- [ ] **Step 2: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/subscriber-analytics/_components/country-flag.ts'
git commit -m "feat(analytics): add country name to flag emoji utility"
```

---

## Task 4: `stat-cards.tsx` — 4 KPI cards

**Files:**
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/stat-cards.tsx`
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/stat-cards.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/stat-cards.test.tsx
import { render, screen } from "@testing-library/react";
import { StatCards } from "../stat-cards";

const base = {
  totalActive: 1240,
  newThisPeriod: 84,
  unsubscribedThisPeriod: 12,
  growthRate: 6.7,
};

describe("StatCards", () => {
  it("renders all four stat values", () => {
    render(<StatCards {...base} />);
    expect(screen.getByText("1,240")).toBeInTheDocument();
    expect(screen.getByText("84")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("+6.7%")).toBeInTheDocument();
  });

  it("shows em-dash when growthRate is null", () => {
    render(<StatCards {...base} growthRate={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows negative growth rate with minus sign", () => {
    render(<StatCards {...base} growthRate={-3.2} />);
    expect(screen.getByText("-3.2%")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --reporter=verbose stat-cards 2>&1 | tail -20
```

Expected: `Cannot find module '../stat-cards'`

- [ ] **Step 3: Implement `stat-cards.tsx`**

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/_components/stat-cards.tsx
import { TrendingDownIcon, TrendingUpIcon, UserMinusIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardsProps {
  totalActive: number;
  newThisPeriod: number;
  unsubscribedThisPeriod: number;
  growthRate: number | null;
}

function formatGrowthRate(rate: number | null): string {
  if (rate === null) return "—";
  return rate >= 0 ? `+${rate}%` : `${rate}%`;
}

export function StatCards({ totalActive, newThisPeriod, unsubscribedThisPeriod, growthRate }: StatCardsProps) {
  const GrowthIcon = growthRate !== null && growthRate < 0 ? TrendingDownIcon : TrendingUpIcon;
  const growthColor = growthRate !== null && growthRate < 0 ? "text-destructive" : "text-green-600";

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Active</CardTitle>
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalActive.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">active subscribers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">New This Period</CardTitle>
          <UserPlusIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{newThisPeriod.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">joined in range</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Unsubscribed</CardTitle>
          <UserMinusIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unsubscribedThisPeriod.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">left in range</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Growth Rate</CardTitle>
          <GrowthIcon className={`h-4 w-4 ${growthColor}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${growthColor}`}>{formatGrowthRate(growthRate)}</div>
          <p className="text-xs text-muted-foreground">vs previous period</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --reporter=verbose stat-cards 2>&1 | tail -20
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/subscriber-analytics/_components/stat-cards.tsx' \
        'src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/stat-cards.test.tsx'
git commit -m "feat(analytics): add StatCards component"
```

---

## Task 5: `range-selector.tsx` — time range segmented control

**Files:**
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/range-selector.tsx`
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/range-selector.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/range-selector.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RangeSelector } from "../range-selector";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams("range=30d"),
  usePathname: () => "/dashboard/site1/subscriber-analytics",
}));

describe("RangeSelector", () => {
  beforeEach(() => mockPush.mockClear());

  it("renders all 4 range options", () => {
    render(<RangeSelector />);
    expect(screen.getByRole("button", { name: "7d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
  });

  it("highlights the active range from searchParams", () => {
    render(<RangeSelector />);
    const btn = screen.getByRole("button", { name: "30d" });
    expect(btn).toHaveAttribute("data-active", "true");
  });

  it("calls router.push with new range on click", async () => {
    render(<RangeSelector />);
    await userEvent.click(screen.getByRole("button", { name: "7d" }));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("range=7d"),
    );
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --reporter=verbose range-selector 2>&1 | tail -20
```

Expected: `Cannot find module '../range-selector'`

- [ ] **Step 3: Implement `range-selector.tsx`**

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/_components/range-selector.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AnalyticsRange } from "@/lib/domain/types";

const RANGES: { label: string; value: AnalyticsRange }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "All", value: "all" },
];

export function RangeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("range") ?? "30d") as AnalyticsRange;

  function select(value: AnalyticsRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center rounded-lg border bg-muted p-1 gap-1">
      {RANGES.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          data-active={current === value}
          onClick={() => select(value)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            current === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --reporter=verbose range-selector 2>&1 | tail -20
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/subscriber-analytics/_components/range-selector.tsx' \
        'src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/range-selector.test.tsx'
git commit -m "feat(analytics): add RangeSelector component"
```

---

## Task 6: `growth-chart.tsx` — area chart with gradient fills

**Files:**
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/growth-chart.tsx`
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/growth-chart.test.tsx`

- [ ] **Step 1: Write the failing test**

Recharts renders SVGs which jsdom doesn't fully support. We test that the component renders without throwing and that it renders the chart container.

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/growth-chart.test.tsx
import { render, screen } from "@testing-library/react";
import { GrowthChart } from "../growth-chart";
import type { GrowthDataPoint } from "@/lib/domain/types";

// Recharts uses ResizeObserver internally
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

const data: GrowthDataPoint[] = [
  { date: "2026-04-01", newSubscribers: 10, unsubscribes: 2 },
  { date: "2026-04-02", newSubscribers: 15, unsubscribes: 1 },
];

describe("GrowthChart", () => {
  it("renders without crashing with data", () => {
    const { container } = render(<GrowthChart data={data} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders empty state when data is empty", () => {
    render(<GrowthChart data={[]} />);
    expect(screen.getByText("No data for this period")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --reporter=verbose growth-chart 2>&1 | tail -20
```

Expected: `Cannot find module '../growth-chart'`

- [ ] **Step 3: Implement `growth-chart.tsx`**

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/_components/growth-chart.tsx
"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GrowthDataPoint } from "@/lib/domain/types";

interface GrowthChartProps {
  data: GrowthDataPoint[];
  rangeLabel?: string;
}

const chartConfig = {
  newSubscribers: { label: "New Subscribers", color: "hsl(var(--primary))" },
  unsubscribes: { label: "Unsubscribes", color: "hsl(var(--destructive))" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function GrowthChart({ data, rangeLabel = "Subscriber trend" }: GrowthChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscriber Growth</CardTitle>
          <CardDescription>{rangeLabel}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[280px] items-center justify-center text-muted-foreground">
          No data for this period
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriber Growth</CardTitle>
        <CardDescription>{rangeLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradUnsub" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="newSubscribers"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#gradNew)"
            />
            <Area
              type="monotone"
              dataKey="unsubscribes"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              fill="url(#gradUnsub)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --reporter=verbose growth-chart 2>&1 | tail -20
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/subscriber-analytics/_components/growth-chart.tsx' \
        'src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/growth-chart.test.tsx'
git commit -m "feat(analytics): add GrowthChart component with gradient fills"
```

---

## Task 7: `countries-card.tsx` — top 5 countries + View All dialog

**Files:**
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/countries-card.tsx`
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/countries-card.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/countries-card.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CountriesCard } from "../countries-card";

const countries = [
  { country: "United States", count: 512 },
  { country: "Brazil", count: 200 },
  { country: "India", count: 150 },
  { country: "Germany", count: 80 },
  { country: "France", count: 60 },
  { country: "Australia", count: 40 },
  { country: "Japan", count: 30 },
];

describe("CountriesCard", () => {
  it("renders only top 5 countries", () => {
    render(<CountriesCard countries={countries} />);
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
    expect(screen.queryByText("Australia")).not.toBeInTheDocument();
  });

  it("shows subscriber counts", () => {
    render(<CountriesCard countries={countries} />);
    expect(screen.getByText("512")).toBeInTheDocument();
  });

  it("opens View All dialog showing all countries", async () => {
    render(<CountriesCard countries={countries} />);
    await userEvent.click(screen.getByRole("button", { name: /view all/i }));
    expect(screen.getByText("Australia")).toBeInTheDocument();
    expect(screen.getByText("Japan")).toBeInTheDocument();
  });

  it("shows empty state when no country data", () => {
    render(<CountriesCard countries={[]} />);
    expect(screen.getByText("No location data yet")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --reporter=verbose countries-card 2>&1 | tail -20
```

Expected: `Cannot find module '../countries-card'`

- [ ] **Step 3: Implement `countries-card.tsx`**

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/_components/countries-card.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { countryFlag } from "./country-flag";

interface CountryRow {
  country: string;
  count: number;
}

interface CountriesCardProps {
  countries: CountryRow[];
}

function CountryList({ rows }: { rows: CountryRow[] }) {
  return (
    <ul className="space-y-3">
      {rows.map(({ country, count }) => (
        <li key={country} className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm">
            <span className="text-lg leading-none">{countryFlag(country)}</span>
            <span>{country}</span>
          </span>
          <span className="text-sm font-semibold tabular-nums">{count.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

export function CountriesCard({ countries }: CountriesCardProps) {
  const [open, setOpen] = useState(false);
  const top5 = countries.slice(0, 5);

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Subscribers by Country</CardTitle>
          </div>
          {countries.length > 5 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
            >
              View All <span aria-hidden>›</span>
            </button>
          )}
        </CardHeader>
        <CardContent className="flex-1">
          {countries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No location data yet</p>
          ) : (
            <CountryList rows={top5} />
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Countries</DialogTitle>
          </DialogHeader>
          <CountryList rows={countries} />
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --reporter=verbose countries-card 2>&1 | tail -20
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/subscriber-analytics/_components/countries-card.tsx' \
        'src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/countries-card.test.tsx'
git commit -m "feat(analytics): add CountriesCard component"
```

---

## Task 8: `devices-platforms-card.tsx` — device split + OS bars

**Files:**
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/devices-platforms-card.tsx`
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/devices-platforms-card.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/devices-platforms-card.test.tsx
import { render, screen } from "@testing-library/react";
import { DevicesPlatformsCard } from "../devices-platforms-card";

const deviceBreakdown = { mobile: 400, tablet: 100, desktop: 700, unknown: 50 };
const topOS = [
  { os: "macOS", count: 500 },
  { os: "Windows", count: 400 },
  { os: "iOS", count: 200 },
];

describe("DevicesPlatformsCard", () => {
  it("renders device rows", () => {
    render(<DevicesPlatformsCard deviceBreakdown={deviceBreakdown} topOS={topOS} />);
    expect(screen.getByText("Mobile")).toBeInTheDocument();
    expect(screen.getByText("Desktop")).toBeInTheDocument();
    expect(screen.getByText("Tablet")).toBeInTheDocument();
  });

  it("excludes unknown from device percentage total", () => {
    render(<DevicesPlatformsCard deviceBreakdown={deviceBreakdown} topOS={topOS} />);
    // Total known = 400+100+700 = 1200. Mobile = 400/1200 = 33%
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("renders OS platform rows", () => {
    render(<DevicesPlatformsCard deviceBreakdown={deviceBreakdown} topOS={topOS} />);
    expect(screen.getByText("macOS")).toBeInTheDocument();
    expect(screen.getByText("Windows")).toBeInTheDocument();
  });

  it("shows empty state for devices when all zero", () => {
    render(<DevicesPlatformsCard deviceBreakdown={{ mobile: 0, tablet: 0, desktop: 0, unknown: 0 }} topOS={[]} />);
    expect(screen.getByText("No device data yet")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --reporter=verbose devices-platforms 2>&1 | tail -20
```

Expected: `Cannot find module '../devices-platforms-card'`

- [ ] **Step 3: Implement `devices-platforms-card.tsx`**

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/_components/devices-platforms-card.tsx
import type { ReactNode } from "react";
import { MonitorIcon, SmartphoneIcon, TabletIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Separator from "@/components/ui/separator";

interface DeviceBreakdown {
  mobile: number;
  tablet: number;
  desktop: number;
  unknown: number;
}

interface DevicesPlatformsCardProps {
  deviceBreakdown: DeviceBreakdown;
  topOS: { os: string; count: number }[];
}

function BarRow({ label, count, total, icon }: { label: string; count: number; total: number; icon?: ReactNode }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DevicesPlatformsCard({ deviceBreakdown, topOS }: DevicesPlatformsCardProps) {
  const { mobile, tablet, desktop, unknown: _unknown } = deviceBreakdown;
  const deviceTotal = mobile + tablet + desktop;
  const osTotal = topOS.reduce((s, r) => s + r.count, 0);
  const noDeviceData = deviceTotal === 0;
  const noOSData = topOS.length === 0;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Devices &amp; Platforms</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-6">
        {/* Devices */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Devices</p>
          {noDeviceData ? (
            <p className="text-sm text-muted-foreground">No device data yet</p>
          ) : (
            <div className="space-y-3">
              <BarRow label="Mobile" count={mobile} total={deviceTotal} icon={<SmartphoneIcon className="h-3.5 w-3.5" />} />
              <BarRow label="Tablet" count={tablet} total={deviceTotal} icon={<TabletIcon className="h-3.5 w-3.5" />} />
              <BarRow label="Desktop" count={desktop} total={deviceTotal} icon={<MonitorIcon className="h-3.5 w-3.5" />} />
            </div>
          )}
        </div>

        <Separator />

        {/* Platforms */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Platforms</p>
          {noOSData ? (
            <p className="text-sm text-muted-foreground">No platform data yet</p>
          ) : (
            <div className="space-y-3">
              {topOS.slice(0, 5).map(({ os, count }) => (
                <BarRow key={os} label={os} count={count} total={osTotal} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --reporter=verbose devices-platforms 2>&1 | tail -20
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/subscriber-analytics/_components/devices-platforms-card.tsx' \
        'src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/devices-platforms-card.test.tsx'
git commit -m "feat(analytics): add DevicesPlatformsCard component"
```

---

## Task 9: `subscriber-age-card.tsx` — loyalty cohort bars

**Files:**
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/subscriber-age-card.tsx`
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/subscriber-age-card.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/subscriber-age-card.test.tsx
import { render, screen } from "@testing-library/react";
import { SubscriberAgeCard } from "../subscriber-age-card";

const age = { seedlings: 200, sprouts: 150, saplings: 100, evergreens: 300 };

describe("SubscriberAgeCard", () => {
  it("renders all 4 cohort labels", () => {
    render(<SubscriberAgeCard subscriberAge={age} totalActive={750} />);
    expect(screen.getByText("Seedlings")).toBeInTheDocument();
    expect(screen.getByText("Sprouts")).toBeInTheDocument();
    expect(screen.getByText("Saplings")).toBeInTheDocument();
    expect(screen.getByText("Evergreens")).toBeInTheDocument();
  });

  it("renders cohort counts", () => {
    render(<SubscriberAgeCard subscriberAge={age} totalActive={750} />);
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
  });

  it("calculates percentages relative to totalActive", () => {
    render(<SubscriberAgeCard subscriberAge={age} totalActive={750} />);
    // 300/750 = 40%
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("shows 0% bars when totalActive is 0", () => {
    render(<SubscriberAgeCard subscriberAge={{ seedlings: 0, sprouts: 0, saplings: 0, evergreens: 0 }} totalActive={0} />);
    const pcts = screen.getAllByText("0%");
    expect(pcts.length).toBe(4);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --reporter=verbose subscriber-age 2>&1 | tail -20
```

Expected: `Cannot find module '../subscriber-age-card'`

- [ ] **Step 3: Implement `subscriber-age-card.tsx`**

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/_components/subscriber-age-card.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SubscriberAge {
  seedlings: number;
  sprouts: number;
  saplings: number;
  evergreens: number;
}

interface SubscriberAgeCardProps {
  subscriberAge: SubscriberAge;
  totalActive: number;
}

const COHORTS = [
  { key: "seedlings" as const, emoji: "🌱", label: "Seedlings", description: "≤ 30 days" },
  { key: "sprouts"   as const, emoji: "🌿", label: "Sprouts",   description: "30d – 3 months" },
  { key: "saplings"  as const, emoji: "🌳", label: "Saplings",  description: "3 – 6 months" },
  { key: "evergreens"as const, emoji: "🌲", label: "Evergreens",description: "> 6 months" },
];

export function SubscriberAgeCard({ subscriberAge, totalActive }: SubscriberAgeCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Subscriber Age</CardTitle>
        <CardDescription>Loyalty cohorts</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {COHORTS.map(({ key, emoji, label, description }) => {
          const count = subscriberAge[key];
          const pct = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{emoji}</span>
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="text-muted-foreground">{count.toLocaleString()}</span>
                  <span className="font-semibold w-8 text-right">{pct}%</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --reporter=verbose subscriber-age 2>&1 | tail -20
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/subscriber-analytics/_components/subscriber-age-card.tsx' \
        'src/app/dashboard/[websiteId]/subscriber-analytics/_components/__tests__/subscriber-age-card.test.tsx'
git commit -m "feat(analytics): add SubscriberAgeCard component"
```

---

## Task 10: `page.tsx` — RSC analytics page

**Files:**
- Create: `src/app/dashboard/[websiteId]/subscriber-analytics/page.tsx`

- [ ] **Step 1: Create the RSC page**

```tsx
// src/app/dashboard/[websiteId]/subscriber-analytics/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Separator from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { subscriberService, tenantService } from "@/lib/domain";
import type { AnalyticsRange } from "@/lib/domain/types";
import { CountriesCard } from "./_components/countries-card";
import { DevicesPlatformsCard } from "./_components/devices-platforms-card";
import { GrowthChart } from "./_components/growth-chart";
import { RangeSelector } from "./_components/range-selector";
import { StatCards } from "./_components/stat-cards";
import { SubscriberAgeCard } from "./_components/subscriber-age-card";

const VALID_RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "all"];
const RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "all": "All time",
};

export default async function SubscriberAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);
  if (!tenant) redirect("/onboarding");

  const { websiteId } = await params;
  const website = tenant.websites.find((w) => w.id === websiteId);
  if (!website) redirect(`/dashboard/${tenant.websites[0]?.id ?? ""}/subscriber-analytics`);

  const { range: rawRange } = await searchParams;
  const range: AnalyticsRange = VALID_RANGES.includes(rawRange as AnalyticsRange)
    ? (rawRange as AnalyticsRange)
    : "30d";

  const analytics = await subscriberService.getAnalytics(websiteId, range);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>{website.name}</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Analytics</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-col gap-6 p-6">
        {/* Page title + range selector */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Analytics</h1>
          <RangeSelector />
        </div>

        {/* Growth chart */}
        <GrowthChart data={analytics.growth} rangeLabel={RANGE_LABELS[range]} />

        {/* Stat cards */}
        <StatCards
          totalActive={analytics.totalActive}
          newThisPeriod={analytics.newThisPeriod}
          unsubscribedThisPeriod={analytics.unsubscribedThisPeriod}
          growthRate={analytics.growthRate}
        />

        {/* 3-column grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CountriesCard countries={analytics.topCountries} />
          <DevicesPlatformsCard
            deviceBreakdown={analytics.deviceBreakdown}
            topOS={analytics.topOS}
          />
          <SubscriberAgeCard
            subscriberAge={analytics.subscriberAge}
            totalActive={analytics.totalActive}
          />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "subscriber-analytics" | head -20
```

Expected: no errors.

- [ ] **Step 3: Run all tests to confirm nothing is broken**

```bash
npm test 2>&1 | tail -30
```

Expected: all existing + new tests pass.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/dashboard/[websiteId]/subscriber-analytics/page.tsx'
git commit -m "feat(analytics): add subscriber analytics RSC page"
```

---

## Task 11: Lint, build, and open PR

- [ ] **Step 1: Run linter**

```bash
npm run lint 2>&1 | tail -20
```

Expected: no errors. If there are import order issues, run `npm run lint:fix`.

- [ ] **Step 2: Run full build**

```bash
npm run build 2>&1 | tail -30
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Run all tests one final time**

```bash
npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 4: Push branch and open PR**

```bash
git push -u origin feat/subscriber-analytics-page
gh pr create \
  --title "feat: subscriber analytics page" \
  --body "## What changed
Adds the subscriber analytics page at \`/dashboard/[websiteId]/subscriber-analytics\`.

## Why
Users had no way to visualize subscriber growth, geographic distribution, device/OS breakdown, or subscriber loyalty cohorts.

## What's included
- Full-width AreaChart with gradient fills (new subscribers + unsubscribes)
- 4 stat cards: Total Active, New This Period, Unsubscribed, Growth Rate
- By Country card: top 5 with flag emoji + View All dialog (up to 20)
- Devices & Platforms card: device split + OS bars with separator
- Subscriber Age card: 4 loyalty cohorts (Seedlings/Sprouts/Saplings/Evergreens)
- Range selector: 7d / 30d / 90d / All via URL searchParam
- Domain: added \`topOS\` and \`subscriberAge\` to \`SubscriberAnalytics\` type + service

## How to test
1. Run \`npm run dev\`, log in, open a website dashboard
2. Click Analytics in the sidebar
3. Switch time ranges — charts update
4. Click 'View All' on the countries card — dialog opens
5. Run \`npm test\` — all green"
```
