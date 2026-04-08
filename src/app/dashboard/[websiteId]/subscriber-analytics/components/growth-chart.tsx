"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { GrowthDataPoint } from "@/lib/domain/types"

const SERIES = ["newSubscribers", "unsubscribes"] as const
type SeriesKey = (typeof SERIES)[number]

const chartConfig = {
  newSubscribers: { label: "New Subscribers", color: "var(--chart-1)" },
  unsubscribes: { label: "Unsubscribes", color: "var(--chart-4)" },
} satisfies ChartConfig

export function GrowthChart({ data }: { data: GrowthDataPoint[] }) {
  const [active, setActive] = React.useState<Set<SeriesKey>>(new Set(["newSubscribers"]))

  const totals = React.useMemo(
    () => ({
      newSubscribers: data.reduce((sum, d) => sum + d.newSubscribers, 0),
      unsubscribes: data.reduce((sum, d) => sum + d.unsubscribes, 0),
    }),
    [data]
  )

  function toggle(key: SeriesKey) {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        // keep at least one active
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4">
          <CardTitle>Subscriber Growth</CardTitle>
          <CardDescription>New sign-ups vs unsubscribes over time</CardDescription>
        </div>
        <div className="flex">
          {SERIES.map((key) => (
            <button
              key={key}
              data-active={active.has(key)}
              className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              onClick={() => toggle(key)}>
              <span
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
                style={{ color: active.has(key) ? chartConfig[key].color : undefined }}>
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ background: chartConfig[key].color }}
                />
                {chartConfig[key].label}
              </span>
              <span className="text-lg leading-none font-bold sm:text-3xl">
                {totals[key].toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(v: string) =>
                new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[180px]"
                  labelFormatter={(v) =>
                    typeof v === "string"
                      ? new Date(v).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : String(v)
                  }
                />
              }
            />
            {SERIES.map((key) =>
              active.has(key) ? (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null
            )}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
