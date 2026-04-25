"use client";

import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { fieldVariants } from "./field-variants";

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"fieldset"> & VariantProps<typeof fieldVariants>) {
  return (
    <fieldset
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

export default Field;
