"use client";

import { Cell, Legend, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface CompanyChartProps {
  companyBreakdown: { company: string; count: number }[];
}

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
  const chartConfig = Object.fromEntries(
    companyBreakdown.map((item, i) => [item.company, { label: item.company, color: getColor(i) }]),
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
                strokeWidth={2}>
                {companyBreakdown.map((entry, index) => (
                  <Cell key={entry.company} fill={getColor(index)} />
                ))}
              </Pie>
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value, name) => [`${value} contacts`, name]} />}
              />
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
