"use client";

import { Select as SelectPrimitive } from "radix-ui";
import type * as React from "react";

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

export default Select;
