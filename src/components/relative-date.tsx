"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";

function getRelativeTime(date: Date, now: number): string {
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 5) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
}

export function RelativeDate({ date }: { date: Date }) {
  const [now] = React.useState(() => Date.now());

  const formatted = formatDate(date);

  const fullFormatted = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const diffDays = Math.floor((now - date.getTime()) / 86_400_000);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {diffDays > 30 ? (
            <span className="text-sm">{formatted}</span>
          ) : (
            <div className="flex flex-col">
              <span className="text-sm">{getRelativeTime(date, now)}</span>
              <span className="text-xs text-muted-foreground">{formatted}</span>
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent>{fullFormatted}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
