"use client";

import { PanelLeftIcon } from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/buttons";
import { cn } from "@/lib/utils";
import useSidebar from "./use-sidebar";

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}>
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export default SidebarTrigger;
