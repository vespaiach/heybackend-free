"use client";

import { Select as SelectPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

function SelectGroup({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group data-slot="select-group" className={cn("scroll-my-1 p-1", className)} {...props} />
  );
}

export default SelectGroup;
