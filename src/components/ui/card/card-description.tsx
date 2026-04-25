import type * as React from "react";

import { cn } from "@/lib/utils";

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export default CardDescription;
