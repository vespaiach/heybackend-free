"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type DayData = { date: string; count: number };
type Props = { data: DayData[] };

const DAYS_IN_YEAR = 365;

function getDayColor(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-green-200 dark:bg-green-900";
  if (count <= 5) return "bg-green-400 dark:bg-green-700";
  if (count <= 10) return "bg-green-600 dark:bg-green-500";
  return "bg-green-800 dark:bg-green-300";
}

export function ActivityHeatmap({ data }: Props) {
  const grid = useMemo(() => {
    const map = new Map(data.map((d) => [d.date, d.count]));
    const today = new Date();
    const days: { date: string; count: number }[] = [];
    for (let i = DAYS_IN_YEAR - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ date, count: map.get(date) ?? 0 });
    }
    return days;
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Submission Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <table aria-label="Submission activity heatmap" className="border-separate border-spacing-[3px]">
            <tbody>
              {Array.from({ length: 7 }, (_, row) => (
                <tr key={row}>
                  {Array.from({ length: Math.ceil(DAYS_IN_YEAR / 7) }, (_, col) => {
                    const idx = col * 7 + row;
                    if (idx >= grid.length) return <td key={col} className="h-3 w-3" />;
                    const { date, count } = grid[idx];
                    return (
                      <Tooltip key={col}>
                        <TooltipTrigger asChild>
                          <td
                            aria-label={`${date}: ${count} submission${count !== 1 ? "s" : ""}`}
                            className={`h-3 w-3 rounded-sm ${getDayColor(count)}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {date}: {count} submission{count !== 1 ? "s" : ""}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
