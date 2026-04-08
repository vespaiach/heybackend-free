"use client";

import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  active: { label: "Active", color: "var(--chart-1)" },
  unsubscribed: { label: "Unsubscribed", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function StatusDonut({ active, unsubscribed }: { active: number; unsubscribed: number }) {
  const data = [
    { status: "active", count: active, fill: "var(--color-active)" },
    { status: "unsubscribed", count: unsubscribed, fill: "var(--color-unsubscribed)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active vs. Unsubscribed</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[280px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
            <Pie data={data} dataKey="count" nameKey="status" innerRadius={70} outerRadius={110} />
            <ChartLegend content={<ChartLegendContent nameKey="status" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
