"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

export default DialogPortal;
