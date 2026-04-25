"use client";

import { Select as SelectPrimitive } from "radix-ui";
import type * as React from "react";

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

export default SelectValue;
