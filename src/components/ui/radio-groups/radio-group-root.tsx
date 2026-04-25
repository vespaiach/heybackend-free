"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-2", className)} {...props} />
  );
}

export default RadioGroup;
