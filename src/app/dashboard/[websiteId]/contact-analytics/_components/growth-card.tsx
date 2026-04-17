"use client";

import { Line, LineChart, Tooltip } from "recharts";
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
                      <span className="font-medium">{payload[0]?.payload?.month}</span>: {payload[0]?.value}{" "}
                      contacts
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
