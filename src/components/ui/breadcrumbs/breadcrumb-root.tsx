import type * as React from "react";
import { cn } from "@/lib/utils";

function BreadcrumbRoot({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" className={cn(className)} {...props} />;
}

export default BreadcrumbRoot;
