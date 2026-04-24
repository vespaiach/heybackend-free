"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export default DialogClose;
