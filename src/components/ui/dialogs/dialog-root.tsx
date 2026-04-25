"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

export default Dialog;
