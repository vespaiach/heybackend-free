"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/charts";
import { cn } from "@/lib/utils";

interface TrendChartProps {
  dailyActivity: { date: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
}

type Range = "30d" | "6m" | "all";

const RANGES: { value: Range; label: string }[] = [
  { value: "30d", label: "30 Days" },
  { value: "6m", label: "6 Months" },
  { value: "all", label: "All" },
];

const chartConfig = {
  count: { label: "Contacts", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatDayLabel(date: string): string {
  const [, mon, day] = date.split("-");
  return `${Number(mon)}/${Number(day)}`;
}

function formatMonthLabel(month: string, showYear: boolean): string {
  const [year, mon] = month.split("-");
  const abbr = new Date(Number(year), Number(mon) - 1, 1).toLocaleString("en", { month: "short" });
  return showYear ? `${abbr} '${year.slice(2)}` : abbr;
}

export function TrendChart({ dailyActivity, monthlyTrend }: TrendChartProps) {
  const [range, setRange] = useState<Range>("6m");

  const data = (() => {
    if (range === "30d") {
      return dailyActivity.slice(-30).map((d) => ({ label: formatDayLabel(d.date), count: d.count }));
    }
    const months = range === "6m" ? monthlyTrend.slice(-6) : monthlyTrend;
    const years = new Set(months.map((m) => m.month.slice(0, 4)));
    const showYear = years.size > 1;
    return months.map((m) => ({ label: formatMonthLabel(m.month, showYear), count: m.count }));
  })();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Contact Trend</CardTitle>
        <div className="flex gap-1">
          {RANGES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value)}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                range === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}>
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <LineChart accessibilityLayer data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              interval="preserveStartEnd"
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Line
              dataKey="count"
              type="monotone"
              stroke="var(--color-count)"
              strokeWidth={2}
              dot={{ fill: "var(--color-count)", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
