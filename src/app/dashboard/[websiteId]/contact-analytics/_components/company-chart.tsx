"use client";

import { Legend, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface CompanyChartProps {
  companyBreakdown: { company: string; count: number }[];
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.72 0.15 160)",
  "oklch(0.65 0.18 30)",
  "oklch(0.60 0.14 220)",
  "oklch(0.75 0.12 80)",
  "oklch(0.55 0.16 320)",
];

export function CompanyChart({ companyBreakdown }: CompanyChartProps) {
  const chartData = companyBreakdown.map((item, i) => ({
    ...item,
    fill: `var(--color-c${i})`,
  }));

  const chartConfig: ChartConfig = {
    count: { label: "Contacts" },
    ...Object.fromEntries(
      companyBreakdown.map((item, i) => [
        `c${i}`,
        { label: item.company, color: CHART_COLORS[i % CHART_COLORS.length] },
      ]),
    ),
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Company Concentration</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex-col">
        {companyBreakdown.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            No company data
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[300px] pb-0 [&_.recharts-pie-label-text]:fill-foreground">
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value, name) => [`${value} contacts`, name]} />}
              />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="company"
                label={({ value }: { value: number }) => value}
                outerRadius={80}
                strokeWidth={2}
              />
              <ChartLegendContent />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
