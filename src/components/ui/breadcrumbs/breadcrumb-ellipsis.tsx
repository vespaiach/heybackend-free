import { MoreHorizontalIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("flex size-5 items-center justify-center [&>svg]:size-4", className)}
      {...props}>
      <MoreHorizontalIcon />
      <span className="sr-only">More</span>
    </span>
  );
}

export default BreadcrumbEllipsis;
