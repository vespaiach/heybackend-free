"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import type * as React from "react";

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export default PopoverAnchor;
