"use client";

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

function buildGrid(): string[] {
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayUTC = new Date(`${todayISO}T00:00:00Z`);
  const startUTC = new Date(todayUTC);
  startUTC.setUTCDate(todayUTC.getUTCDate() - 370);
  const cells: string[] = [];
  for (let i = 0; i < 371; i++) {
    const d = new Date(startUTC);
    d.setUTCDate(startUTC.getUTCDate() + i);
    cells.push(d.toISOString().slice(0, 10));
  }
  return cells;
}

function buildMonthLabels(cells: string[]): { label: string; colIndex: number }[] {
  const labels: { label: string; colIndex: number }[] = [];
  let lastMonth = "";
  for (let i = 0; i < cells.length; i++) {
    const month = cells[i].slice(0, 7);
    if (month !== lastMonth) {
      lastMonth = month;
      const colIndex = Math.floor(i / 7);
      const label = new Date(`${cells[i]}T00:00:00`).toLocaleDateString("en-US", { month: "short" });
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
        <div
          className="relative mb-1"
          style={{ display: "grid", gridTemplateColumns: "repeat(53, 12px)", gap: "2px" }}>
          {monthLabels.map(({ label, colIndex }) => (
            <span
              key={label + colIndex}
              className="text-[10px] text-muted-foreground"
              style={{ gridColumn: colIndex + 1 }}>
              {label}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(53, 12px)",
            gridTemplateRows: "repeat(7, 12px)",
            gridAutoFlow: "column",
            gap: "2px",
          }}>
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
