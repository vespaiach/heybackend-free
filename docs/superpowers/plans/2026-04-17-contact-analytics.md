# Contact Analytics Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Contact Analytics page showing stat cards, a GitHub-style submission heatmap, a MoM growth card with sparkline, and a company concentration pie chart.

**Architecture:** A single `getContactAnalytics(websiteId)` method is added to `ContactRequestService`, running four Prisma queries in `Promise.all`. An RSC page at `/dashboard/[websiteId]/contact-analytics` fetches once and passes typed slices to four `_components`. No client-side fetching.

**Tech Stack:** Next.js 16 App Router (RSC), TypeScript strict, Prisma 6 (MySQL), Recharts via shadcn `chart` component, Tailwind CSS v4, Vitest + React Testing Library.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/domain/types.ts` | Add `ContactAnalytics` type |
| Modify | `src/lib/domain/contact-request/contact-request-service.interface.ts` | Add `getContactAnalytics` signature |
| Modify | `src/lib/domain/contact-request/contact-request-service.ts` | Implement `getContactAnalytics` |
| Modify | `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts` | Tests for `getContactAnalytics` |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/page.tsx` | RSC page, fetches analytics, renders layout |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/stat-cards.tsx` | Total / Unread / Read stat cards |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/stat-cards.test.tsx` | Component tests |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/activity-heatmap.tsx` | GitHub-style CSS grid heatmap |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/activity-heatmap.test.tsx` | Component tests |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/growth-card.tsx` | MoM badge + sparkline |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/growth-card.test.tsx` | Component tests |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/company-chart.tsx` | Pie chart, top 8 + Unknown + Others |
| Create | `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/company-chart.test.tsx` | Component tests |
| Modify | `src/components/app-sidebar.tsx` | Add Analytics item to contacts nav group |

---

## Task 1: Add `ContactAnalytics` type and interface method

**Files:**
- Modify: `src/lib/domain/types.ts`
- Modify: `src/lib/domain/contact-request/contact-request-service.interface.ts`

- [ ] **Step 1: Add `ContactAnalytics` type to `types.ts`**

  Append after the `SubscriberAnalytics` interface at the bottom of `src/lib/domain/types.ts`:

  ```ts
  export type ContactAnalytics = {
    total: number;
    unread: number;
    read: number;
    momChange: number | null;
    monthlyTrend: { month: string; count: number }[];
    dailyActivity: { date: string; count: number }[];
    companyBreakdown: { company: string; count: number }[];
  };
  ```

- [ ] **Step 2: Add method signature to the interface**

  In `src/lib/domain/contact-request/contact-request-service.interface.ts`, add after `markContactAsRead`:

  ```ts
  /**
   * Returns all-time analytics for a website's contact requests:
   * stat totals, daily activity heatmap, monthly trend + MoM change, company breakdown.
   */
  getContactAnalytics(websiteId: string): Promise<ContactAnalytics>;
  ```

  Also add `ContactAnalytics` to the import at the top of that file:

  ```ts
  import type {
    ContactAnalytics,
    ContactRequest,
    ContactRequestEnrichment,
    CreateContactRequestInput,
    ListContactRequestsFilter,
    ListContactRequestsResult,
  } from "@/lib/domain/types";
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/domain/types.ts src/lib/domain/contact-request/contact-request-service.interface.ts
  git commit -m "feat: add ContactAnalytics type and interface method

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Task 2: Implement `getContactAnalytics` (TDD)

**Files:**
- Modify: `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts`
- Modify: `src/lib/domain/contact-request/contact-request-service.ts`

- [ ] **Step 1: Add `groupBy` to the Prisma mock**

  In `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts`, the existing `vi.mock` block mocks `prisma.contactRequest`. Add `groupBy` to it:

  ```ts
  vi.mock("@/lib/prisma", () => ({
    prisma: {
      contactRequest: {
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      website: {
        findUnique: vi.fn(),
      },
    },
  }));
  ```

- [ ] **Step 2: Write failing tests for `getContactAnalytics`**

  Add a new `describe("getContactAnalytics")` block at the end of `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts`:

  ```ts
  describe("getContactAnalytics", () => {
    it("returns correct total, read, and unread counts", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([] as any);
      vi.mocked(prisma.contactRequest.count)
        .mockResolvedValueOnce(10 as any) // total
        .mockResolvedValueOnce(3 as any); // readCount

      const result = await contactRequestService.getContactAnalytics(testWebsiteId);

      expect(result.total).toBe(10);
      expect(result.read).toBe(3);
      expect(result.unread).toBe(7);
    });

    it("returns momChange as null when previous month has zero contacts", async () => {
      const now = new Date();
      // Only current month has data
      const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 10);
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([
        { createdAt: currentMonthDate } as any,
        { createdAt: currentMonthDate } as any,
      ]);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([] as any);
      vi.mocked(prisma.contactRequest.count)
        .mockResolvedValueOnce(2 as any)
        .mockResolvedValueOnce(0 as any);

      const result = await contactRequestService.getContactAnalytics(testWebsiteId);

      expect(result.momChange).toBeNull();
    });

    it("calculates momChange correctly (10 → 12 = +20%)", async () => {
      const now = new Date();
      const currentMonthDates = Array.from({ length: 12 }, () => new Date(now.getFullYear(), now.getMonth(), 5));
      const prevMonthDates = Array.from({ length: 10 }, () => new Date(now.getFullYear(), now.getMonth() - 1, 5));
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue(
        [...currentMonthDates, ...prevMonthDates].map((d) => ({ createdAt: d }) as any),
      );
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([] as any);
      vi.mocked(prisma.contactRequest.count)
        .mockResolvedValueOnce(22 as any)
        .mockResolvedValueOnce(0 as any);

      const result = await contactRequestService.getContactAnalytics(testWebsiteId);

      expect(result.momChange).toBe(20);
    });

    it("buckets top 8 named companies, unknown nulls, and others beyond top 8", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([]);
      // 10 named companies + nulls
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([
        { company: "Acme", _count: { id: 50 } },
        { company: "Beta", _count: { id: 40 } },
        { company: "Gamma", _count: { id: 30 } },
        { company: "Delta", _count: { id: 25 } },
        { company: "Epsilon", _count: { id: 20 } },
        { company: "Zeta", _count: { id: 15 } },
        { company: "Eta", _count: { id: 12 } },
        { company: "Theta", _count: { id: 10 } },
        { company: "Iota", _count: { id: 8 } },  // 9th → Others
        { company: "Kappa", _count: { id: 5 } }, // 10th → Others
        { company: null, _count: { id: 7 } },    // → Unknown
      ] as any);
      vi.mocked(prisma.contactRequest.count)
        .mockResolvedValueOnce(222 as any)
        .mockResolvedValueOnce(0 as any);

      const result = await contactRequestService.getContactAnalytics(testWebsiteId);

      const named = result.companyBreakdown.filter(
        (c) => c.company !== "Unknown" && c.company !== "Others",
      );
      const unknown = result.companyBreakdown.find((c) => c.company === "Unknown");
      const others = result.companyBreakdown.find((c) => c.company === "Others");

      expect(named).toHaveLength(8);
      expect(named[0]).toEqual({ company: "Acme", count: 50 });
      expect(unknown).toEqual({ company: "Unknown", count: 7 });
      expect(others).toEqual({ company: "Others", count: 13 }); // 8 + 5
    });

    it("omits Unknown and Others slices when their counts are 0", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([
        { company: "Acme", _count: { id: 5 } },
      ] as any);
      vi.mocked(prisma.contactRequest.count)
        .mockResolvedValueOnce(5 as any)
        .mockResolvedValueOnce(0 as any);

      const result = await contactRequestService.getContactAnalytics(testWebsiteId);

      expect(result.companyBreakdown.find((c) => c.company === "Unknown")).toBeUndefined();
      expect(result.companyBreakdown.find((c) => c.company === "Others")).toBeUndefined();
    });

    it("dailyActivity only includes dates within the last 365 days", async () => {
      const now = new Date();
      const withinRange = new Date(now);
      withinRange.setDate(now.getDate() - 100);
      // findMany is called with a gte filter — mock returns only in-range dates
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([
        { createdAt: withinRange } as any,
      ]);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([] as any);
      vi.mocked(prisma.contactRequest.count)
        .mockResolvedValueOnce(1 as any)
        .mockResolvedValueOnce(0 as any);

      const result = await contactRequestService.getContactAnalytics(testWebsiteId);

      expect(result.dailyActivity).toHaveLength(1);
      const date = result.dailyActivity[0].date;
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("monthlyTrend always has exactly 12 entries", async () => {
      vi.mocked(prisma.contactRequest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.contactRequest.groupBy).mockResolvedValue([] as any);
      vi.mocked(prisma.contactRequest.count)
        .mockResolvedValueOnce(0 as any)
        .mockResolvedValueOnce(0 as any);

      const result = await contactRequestService.getContactAnalytics(testWebsiteId);

      expect(result.monthlyTrend).toHaveLength(12);
      for (const entry of result.monthlyTrend) {
        expect(entry.month).toMatch(/^\d{4}-\d{2}$/);
        expect(entry.count).toBeGreaterThanOrEqual(0);
      }
    });
  });
  ```

- [ ] **Step 3: Run tests to verify they fail**

  ```bash
  npm test -- contact-request-service
  ```

  Expected: 7 new tests FAIL with `TypeError: contactRequestService.getContactAnalytics is not a function`

- [ ] **Step 4: Implement `getContactAnalytics` in `contact-request-service.ts`**

  Add `ContactAnalytics` to the import at the top of `src/lib/domain/contact-request/contact-request-service.ts`:

  ```ts
  import type {
    ContactAnalytics,
    ContactRequest,
    ContactRequestEnrichment,
    CreateContactRequestInput,
    ListContactRequestsFilter,
    ListContactRequestsResult,
  } from "@/lib/domain/types";
  ```

  Then add this method to `PrismaContactRequestService` (before `mapToContactRequest`):

  ```ts
  async getContactAnalytics(websiteId: string): Promise<ContactAnalytics> {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    oneYearAgo.setHours(0, 0, 0, 0);

    const [createdAtRows, companyGroups, total, readCount] = await Promise.all([
      prisma.contactRequest.findMany({
        where: { websiteId, createdAt: { gte: oneYearAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.contactRequest.groupBy({
        by: ["company"],
        where: { websiteId },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.contactRequest.count({ where: { websiteId } }),
      prisma.contactRequest.count({ where: { websiteId, readAt: { not: null } } }),
    ]);

    // ── Daily activity ────────────────────────────────────────────────────────
    const dailyMap = new Map<string, number>();
    for (const row of createdAtRows) {
      const date = row.createdAt.toISOString().slice(0, 10);
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1);
    }
    const dailyActivity = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

    // ── Monthly trend (last 12 calendar months) ───────────────────────────────
    const monthlyMap = new Map<string, number>();
    for (const row of createdAtRows) {
      const d = row.createdAt;
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + 1);
    }

    const monthlyTrend: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrend.push({ month, count: monthlyMap.get(month) ?? 0 });
    }

    // ── MoM change ────────────────────────────────────────────────────────────
    const currentMonthCount = monthlyTrend[11]?.count ?? 0;
    const prevMonthCount = monthlyTrend[10]?.count ?? 0;
    const momChange =
      prevMonthCount === 0
        ? null
        : Math.round(((currentMonthCount - prevMonthCount) / prevMonthCount) * 1000) / 10;

    // ── Company breakdown ─────────────────────────────────────────────────────
    const namedCompanies: { company: string; count: number }[] = [];
    let unknownCount = 0;
    let othersCount = 0;

    for (const row of companyGroups) {
      const company = row.company?.trim() || null;
      if (!company) {
        unknownCount += row._count.id;
      } else if (namedCompanies.length < 8) {
        namedCompanies.push({ company, count: row._count.id });
      } else {
        othersCount += row._count.id;
      }
    }

    const companyBreakdown: { company: string; count: number }[] = [...namedCompanies];
    if (unknownCount > 0) companyBreakdown.push({ company: "Unknown", count: unknownCount });
    if (othersCount > 0) companyBreakdown.push({ company: "Others", count: othersCount });

    return {
      total,
      read: readCount,
      unread: total - readCount,
      momChange,
      monthlyTrend,
      dailyActivity,
      companyBreakdown,
    };
  }
  ```

- [ ] **Step 5: Run tests to verify they pass**

  ```bash
  npm test -- contact-request-service
  ```

  Expected: All tests PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add src/lib/domain/contact-request/contact-request-service.ts \
          src/lib/domain/contact-request/__tests__/contact-request-service.test.ts
  git commit -m "feat: implement getContactAnalytics on ContactRequestService

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Task 3: `StatCards` component

**Files:**
- Create: `src/app/dashboard/[websiteId]/contact-analytics/_components/stat-cards.tsx`
- Create: `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/stat-cards.test.tsx`

- [ ] **Step 1: Write the failing test**

  Create `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/stat-cards.test.tsx`:

  ```tsx
  import { render, screen } from "@testing-library/react";
  import { StatCards } from "../stat-cards";

  describe("StatCards", () => {
    it("renders total, read, and unread counts", () => {
      render(<StatCards total={42} read={30} unread={12} />);
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("30")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();
    });

    it("renders zero values without crashing", () => {
      render(<StatCards total={0} read={0} unread={0} />);
      expect(screen.getAllByText("0")).toHaveLength(3);
    });

    it("highlights unread card in amber when unread > 0", () => {
      const { container } = render(<StatCards total={5} read={2} unread={3} />);
      // The unread card should have an amber class
      expect(container.innerHTML).toContain("amber");
    });

    it("does not apply amber highlight when unread is 0", () => {
      const { container } = render(<StatCards total={5} read={5} unread={0} />);
      expect(container.innerHTML).not.toContain("amber");
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- stat-cards
  ```

  Expected: FAIL — `Cannot find module '../stat-cards'`

- [ ] **Step 3: Implement `stat-cards.tsx`**

  Create `src/app/dashboard/[websiteId]/contact-analytics/_components/stat-cards.tsx`:

  ```tsx
  import { InboxIcon, MailCheckIcon, MessageSquareIcon } from "lucide-react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { cn } from "@/lib/utils";

  interface StatCardsProps {
    total: number;
    read: number;
    unread: number;
  }

  export function StatCards({ total, read, unread }: StatCardsProps) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
            <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>

        <Card className={cn(unread > 0 && "border-amber-400 dark:border-amber-500")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle
              className={cn(
                "text-sm font-medium",
                unread > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
              )}
            >
              Unread
            </CardTitle>
            <InboxIcon
              className={cn("h-4 w-4", unread > 0 ? "text-amber-500" : "text-muted-foreground")}
            />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                unread > 0 ? "text-amber-600 dark:text-amber-400" : "",
              )}
            >
              {unread.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Read</CardTitle>
            <MailCheckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{read.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">reviewed</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm test -- stat-cards
  ```

  Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add 'src/app/dashboard/[websiteId]/contact-analytics/_components/stat-cards.tsx' \
          'src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/stat-cards.test.tsx'
  git commit -m "feat: add StatCards component for contact analytics

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Task 4: `ActivityHeatmap` component

**Files:**
- Create: `src/app/dashboard/[websiteId]/contact-analytics/_components/activity-heatmap.tsx`
- Create: `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/activity-heatmap.test.tsx`

- [ ] **Step 1: Write the failing test**

  Create `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/activity-heatmap.test.tsx`:

  ```tsx
  import { render, screen } from "@testing-library/react";
  import { ActivityHeatmap } from "../activity-heatmap";

  const today = new Date();
  function isoDate(daysAgo: number): string {
    const d = new Date(today);
    d.setDate(today.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  describe("ActivityHeatmap", () => {
    it("renders without crashing with empty data", () => {
      render(<ActivityHeatmap dailyActivity={[]} />);
      expect(screen.getByText("Submission Activity")).toBeInTheDocument();
    });

    it("renders with realistic daily activity data", () => {
      const data = [
        { date: isoDate(10), count: 5 },
        { date: isoDate(30), count: 1 },
        { date: isoDate(200), count: 8 },
      ];
      render(<ActivityHeatmap dailyActivity={data} />);
      expect(screen.getByText("Submission Activity")).toBeInTheDocument();
    });

    it("renders 371 day cells (53 weeks × 7 days)", () => {
      const { container } = render(<ActivityHeatmap dailyActivity={[]} />);
      // Each cell has data-date attribute
      const cells = container.querySelectorAll("[data-date]");
      expect(cells.length).toBe(371);
    });

    it("applies higher intensity class for a date with many contacts", () => {
      const busyDate = isoDate(5);
      const { container } = render(
        <ActivityHeatmap dailyActivity={[{ date: busyDate, count: 10 }]} />,
      );
      const cell = container.querySelector(`[data-date="${busyDate}"]`);
      expect(cell?.className).toContain("bg-primary");
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- activity-heatmap
  ```

  Expected: FAIL — `Cannot find module '../activity-heatmap'`

- [ ] **Step 3: Implement `activity-heatmap.tsx`**

  Create `src/app/dashboard/[websiteId]/contact-analytics/_components/activity-heatmap.tsx`:

  ```tsx
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { cn } from "@/lib/utils";

  interface ActivityHeatmapProps {
    dailyActivity: { date: string; count: number }[];
  }

  function getIntensityClass(count: number): string {
    if (count === 0) return "bg-muted opacity-40";
    if (count <= 2) return "bg-primary opacity-30";
    if (count <= 6) return "bg-primary opacity-60";
    return "bg-primary opacity-100";
  }

  /**
   * Builds a 53-week × 7-day grid anchored so that today lands in the last column.
   * Returns an array of 371 ISO date strings starting from the earliest date.
   */
  function buildGrid(): string[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Align to the Sunday of the week containing (today - 364 days)
    const start = new Date(today);
    start.setDate(today.getDate() - 370);
    const cells: string[] = [];
    for (let i = 0; i < 371; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d.toISOString().slice(0, 10));
    }
    return cells;
  }

  /**
   * Returns an array of { label, colIndex } for month label positions.
   * colIndex is the 0-based week column where the month first appears.
   */
  function buildMonthLabels(cells: string[]): { label: string; colIndex: number }[] {
    const labels: { label: string; colIndex: number }[] = [];
    let lastMonth = "";
    for (let i = 0; i < cells.length; i++) {
      const month = cells[i].slice(0, 7); // "YYYY-MM"
      if (month !== lastMonth) {
        lastMonth = month;
        const colIndex = Math.floor(i / 7);
        const label = new Date(cells[i] + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
        });
        labels.push({ label, colIndex });
      }
    }
    return labels;
  }

  export function ActivityHeatmap({ dailyActivity }: ActivityHeatmapProps) {
    const countMap = new Map(dailyActivity.map(({ date, count }) => [date, count]));
    const cells = buildGrid();
    const monthLabels = buildMonthLabels(cells);

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Submission Activity</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {/* Month labels */}
          <div className="relative mb-1" style={{ display: "grid", gridTemplateColumns: "repeat(53, 12px)", gap: "2px" }}>
            {monthLabels.map(({ label, colIndex }) => (
              <span
                key={label + colIndex}
                className="text-[10px] text-muted-foreground"
                style={{ gridColumn: colIndex + 1 }}
              >
                {label}
              </span>
            ))}
          </div>
          {/* Heatmap grid: 53 columns (weeks) × 7 rows (days) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(53, 12px)",
              gridTemplateRows: "repeat(7, 12px)",
              gridAutoFlow: "column",
              gap: "2px",
            }}
          >
            {cells.map((date) => {
              const count = countMap.get(date) ?? 0;
              return (
                <div
                  key={date}
                  data-date={date}
                  title={`${date}: ${count} submission${count !== 1 ? "s" : ""}`}
                  className={cn("rounded-sm", getIntensityClass(count))}
                  style={{ width: 12, height: 12 }}
                />
              );
            })}
          </div>
          {/* Legend */}
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>Less</span>
            {[0, 1, 3, 7].map((level) => (
              <div
                key={level}
                className={cn("rounded-sm", getIntensityClass(level))}
                style={{ width: 12, height: 12 }}
              />
            ))}
            <span>More</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm test -- activity-heatmap
  ```

  Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add 'src/app/dashboard/[websiteId]/contact-analytics/_components/activity-heatmap.tsx' \
          'src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/activity-heatmap.test.tsx'
  git commit -m "feat: add ActivityHeatmap component for contact analytics

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Task 5: `GrowthCard` component

**Files:**
- Create: `src/app/dashboard/[websiteId]/contact-analytics/_components/growth-card.tsx`
- Create: `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/growth-card.test.tsx`

- [ ] **Step 1: Write the failing test**

  Create `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/growth-card.test.tsx`:

  ```tsx
  import { render, screen } from "@testing-library/react";
  import { GrowthCard } from "../growth-card";

  const trend = Array.from({ length: 12 }, (_, i) => ({
    month: `2025-${String(i + 1).padStart(2, "0")}`,
    count: i * 3,
  }));

  describe("GrowthCard", () => {
    it("renders positive MoM change with ▲ and green color", () => {
      render(<GrowthCard momChange={15.5} monthlyTrend={trend} />);
      expect(screen.getByText(/15\.5%/)).toBeInTheDocument();
      expect(screen.getByText("▲")).toBeInTheDocument();
    });

    it("renders negative MoM change with ▼ and red color", () => {
      render(<GrowthCard momChange={-8.3} monthlyTrend={trend} />);
      expect(screen.getByText(/8\.3%/)).toBeInTheDocument();
      expect(screen.getByText("▼")).toBeInTheDocument();
    });

    it("renders null MoM change as — with neutral color", () => {
      render(<GrowthCard momChange={null} monthlyTrend={trend} />);
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("renders without crashing with empty trend data", () => {
      render(<GrowthCard momChange={null} monthlyTrend={[]} />);
      expect(screen.getByText("Month-over-Month")).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- growth-card
  ```

  Expected: FAIL — `Cannot find module '../growth-card'`

- [ ] **Step 3: Implement `growth-card.tsx`**

  Create `src/app/dashboard/[websiteId]/contact-analytics/_components/growth-card.tsx`:

  ```tsx
  "use client";

  import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
  import { ChartContainer } from "@/components/ui/chart";
  import { cn } from "@/lib/utils";

  interface GrowthCardProps {
    momChange: number | null;
    monthlyTrend: { month: string; count: number }[];
  }

  const chartConfig = {
    count: { label: "Contacts", color: "hsl(var(--primary))" },
  };

  function MoMBadge({ momChange }: { momChange: number | null }) {
    if (momChange === null) {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-3xl font-bold">—</span>
        </div>
      );
    }
    const isPositive = momChange >= 0;
    return (
      <div className={cn("flex items-center gap-1", isPositive ? "text-green-600" : "text-destructive")}>
        <span className="text-xl font-bold">{isPositive ? "▲" : "▼"}</span>
        <span className="text-3xl font-bold">{Math.abs(momChange)}%</span>
      </div>
    );
  }

  export function GrowthCard({ momChange, monthlyTrend }: GrowthCardProps) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Month-over-Month</CardTitle>
          <CardDescription>vs last month</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <MoMBadge momChange={momChange} />
          {monthlyTrend.length > 0 && (
            <ChartContainer config={chartConfig} className="h-[80px] w-full">
              <LineChart data={monthlyTrend} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 3 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded border bg-background px-2 py-1 text-xs shadow">
                        <span className="font-medium">{payload[0]?.payload?.month}</span>:{" "}
                        {payload[0]?.value} contacts
                      </div>
                    );
                  }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm test -- growth-card
  ```

  Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add 'src/app/dashboard/[websiteId]/contact-analytics/_components/growth-card.tsx' \
          'src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/growth-card.test.tsx'
  git commit -m "feat: add GrowthCard component for contact analytics

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Task 6: `CompanyChart` component

**Files:**
- Create: `src/app/dashboard/[websiteId]/contact-analytics/_components/company-chart.tsx`
- Create: `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/company-chart.test.tsx`

- [ ] **Step 1: Write the failing test**

  Create `src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/company-chart.test.tsx`:

  ```tsx
  import { render, screen } from "@testing-library/react";
  import { CompanyChart } from "../company-chart";

  const breakdown = [
    { company: "Acme Corp", count: 50 },
    { company: "Beta Inc", count: 30 },
    { company: "Unknown", count: 10 },
    { company: "Others", count: 5 },
  ];

  describe("CompanyChart", () => {
    it("renders the card title", () => {
      render(<CompanyChart companyBreakdown={breakdown} />);
      expect(screen.getByText("Company Concentration")).toBeInTheDocument();
    });

    it("renders all company names in the legend", () => {
      render(<CompanyChart companyBreakdown={breakdown} />);
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Beta Inc")).toBeInTheDocument();
      expect(screen.getByText("Unknown")).toBeInTheDocument();
      expect(screen.getByText("Others")).toBeInTheDocument();
    });

    it("renders an empty state when breakdown is empty", () => {
      render(<CompanyChart companyBreakdown={[]} />);
      expect(screen.getByText("No company data")).toBeInTheDocument();
    });

    it("renders without crashing with a single company", () => {
      render(<CompanyChart companyBreakdown={[{ company: "Solo Corp", count: 100 }]} />);
      expect(screen.getByText("Solo Corp")).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- company-chart
  ```

  Expected: FAIL — `Cannot find module '../company-chart'`

- [ ] **Step 3: Implement `company-chart.tsx`**

  Create `src/app/dashboard/[websiteId]/contact-analytics/_components/company-chart.tsx`:

  ```tsx
  "use client";

  import { Cell, Legend, Pie, PieChart } from "recharts";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

  interface CompanyChartProps {
    companyBreakdown: { company: string; count: number }[];
  }

  // Cycles through shadcn chart CSS variables
  const CHART_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  function getColor(index: number): string {
    return CHART_COLORS[index % CHART_COLORS.length];
  }

  export function CompanyChart({ companyBreakdown }: CompanyChartProps) {
    // Build chartConfig dynamically for shadcn ChartContainer
    const chartConfig = Object.fromEntries(
      companyBreakdown.map((item, i) => [
        item.company,
        { label: item.company, color: getColor(i) },
      ]),
    );

    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Company Concentration</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          {companyBreakdown.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              No company data
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <PieChart>
                <Pie
                  data={companyBreakdown}
                  dataKey="count"
                  nameKey="company"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  strokeWidth={2}
                >
                  {companyBreakdown.map((entry, index) => (
                    <Cell key={entry.company} fill={getColor(index)} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [`${value} contacts`, name]}
                    />
                  }
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm test -- company-chart
  ```

  Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add 'src/app/dashboard/[websiteId]/contact-analytics/_components/company-chart.tsx' \
          'src/app/dashboard/[websiteId]/contact-analytics/_components/__tests__/company-chart.test.tsx'
  git commit -m "feat: add CompanyChart component for contact analytics

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Task 7: RSC page + sidebar nav

**Files:**
- Create: `src/app/dashboard/[websiteId]/contact-analytics/page.tsx`
- Modify: `src/components/app-sidebar.tsx`

- [ ] **Step 1: Create the RSC page**

  Create `src/app/dashboard/[websiteId]/contact-analytics/page.tsx`:

  ```tsx
  import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
  } from "@/components/ui/breadcrumb";
  import { Separator } from "@/components/ui/separator";
  import { SidebarTrigger } from "@/components/ui/sidebar";
  import { contactRequestService } from "@/lib/domain";
  import { getWebsite } from "@/lib/route-helpers";
  import { ActivityHeatmap } from "./_components/activity-heatmap";
  import { CompanyChart } from "./_components/company-chart";
  import { GrowthCard } from "./_components/growth-card";
  import { StatCards } from "./_components/stat-cards";

  export default async function ContactAnalyticsPage({
    params,
  }: {
    params: Promise<{ websiteId: string }>;
  }) {
    const { websiteId } = await params;
    const website = await getWebsite(websiteId);
    const analytics = await contactRequestService.getContactAnalytics(websiteId);

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
                <BreadcrumbItem>Contacts</BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Analytics</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex-1 p-4">
          <div className="mb-5">
            <h2 className="text-2xl font-bold tracking-tight">Contact Analytics</h2>
            <p className="text-muted-foreground">Understand your contact request patterns and trends.</p>
          </div>

          <div className="flex flex-col gap-4">
            <StatCards total={analytics.total} read={analytics.read} unread={analytics.unread} />

            <ActivityHeatmap dailyActivity={analytics.dailyActivity} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <GrowthCard momChange={analytics.momChange} monthlyTrend={analytics.monthlyTrend} />
              <CompanyChart companyBreakdown={analytics.companyBreakdown} />
            </div>
          </div>
        </main>
      </>
    );
  }
  ```

- [ ] **Step 2: Add Analytics nav item to the sidebar**

  In `src/components/app-sidebar.tsx`, update the `contacts` array:

  ```ts
  contacts: [
    {
      title: "Contacts",
      url: `/dashboard/${websiteId}/contacts-list`,
      icon: <MessageSquareIcon />,
      isActive: false,
      items: [],
    },
    {
      title: "Analytics",
      url: `/dashboard/${websiteId}/contact-analytics`,
      icon: <BarChart3 />,
      isActive: false,
      items: [],
    },
  ],
  ```

- [ ] **Step 3: Run the full test suite**

  ```bash
  npm test
  ```

  Expected: All tests PASS.

- [ ] **Step 4: Run the linter**

  ```bash
  npm run lint
  ```

  Expected: No errors.

- [ ] **Step 5: Commit**

  ```bash
  git add 'src/app/dashboard/[websiteId]/contact-analytics/page.tsx' \
          src/components/app-sidebar.tsx
  git commit -m "feat: add contact analytics page and sidebar nav item

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Done

All tasks complete. The contact analytics page is accessible at `/dashboard/[websiteId]/contact-analytics` and linked from the sidebar under **Contacts > Analytics**.

To verify end-to-end:
1. Run `npm run dev`
2. Navigate to any website dashboard
3. Click **Contacts > Analytics** in the sidebar
4. Confirm all three widgets render with real (or empty-state) data
