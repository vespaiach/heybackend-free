"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />;
}

export default TableHeader;
