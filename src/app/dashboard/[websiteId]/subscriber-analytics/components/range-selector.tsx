"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { AnalyticsRange } from "@/lib/domain/types"

const RANGES = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "All", value: "all" },
] as const

export function RangeSelector({ current }: { current: AnalyticsRange }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function select(range: AnalyticsRange) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", range)
    router.replace(`?${params.toString()}`)
  }

  return (
    <div className="flex gap-1">
      {RANGES.map(({ label, value }) => (
        <Button
          key={value}
          size="sm"
          variant={current === value ? "default" : "outline"}
          onClick={() => select(value)}>
          {label}
        </Button>
      ))}
    </div>
  )
}
