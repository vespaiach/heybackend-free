"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import type * as React from "react";

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

export default TooltipTrigger;
