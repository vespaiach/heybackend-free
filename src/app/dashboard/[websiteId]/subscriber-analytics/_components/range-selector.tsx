"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AnalyticsRange } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const RANGES: { label: string; value: AnalyticsRange }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "All", value: "all" },
];

export function RangeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("range") ?? "30d") as AnalyticsRange;

  function select(value: AnalyticsRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center rounded-lg border bg-muted p-1 gap-1">
      {RANGES.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          data-active={current === value}
          onClick={() => select(value)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            current === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}>
          {label}
        </button>
      ))}
    </div>
  );
}
