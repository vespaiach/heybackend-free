"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import type * as React from "react";

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

export default Tooltip;
