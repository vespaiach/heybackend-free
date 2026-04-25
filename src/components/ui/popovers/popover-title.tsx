"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <div data-slot="popover-title" className={cn("font-heading font-medium", className)} {...props} />;
}

export default PopoverTitle;
