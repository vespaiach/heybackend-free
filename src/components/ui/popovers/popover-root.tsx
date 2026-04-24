"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import type * as React from "react";

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

export default Popover;
