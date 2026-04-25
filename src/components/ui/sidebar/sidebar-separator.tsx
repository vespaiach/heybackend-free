import type * as React from "react";

import Separator from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  );
}

export default SidebarSeparator;
