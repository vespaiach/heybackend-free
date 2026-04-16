"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
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
