"use client"

import { Pie, PieChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
  tablet: { label: "Tablet", color: "var(--chart-3)" },
  unknown: { label: "Unknown", color: "var(--chart-4)" },
} satisfies ChartConfig

interface DeviceBreakdown {
  mobile: number
  tablet: number
  desktop: number
  unknown: number
}

export function DeviceChart({ data }: { data: DeviceBreakdown }) {
  const chartData = [
    { device: "desktop", count: data.desktop, fill: "var(--color-desktop)" },
    { device: "mobile", count: data.mobile, fill: "var(--color-mobile)" },
    { device: "tablet", count: data.tablet, fill: "var(--color-tablet)" },
    { device: "unknown", count: data.unknown, fill: "var(--color-unknown)" },
  ].filter((d) => d.count > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[280px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="device" />} />
            <Pie data={chartData} dataKey="count" nameKey="device" innerRadius={70} outerRadius={110} />
            <ChartLegend content={<ChartLegendContent nameKey="device" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
