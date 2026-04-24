"use client";

import type * as React from "react";

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={className} {...props} />;
}

export default DialogHeader;
