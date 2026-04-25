"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/buttons";

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  pending?: boolean;
};

export function SubmitButton({ pending: externalPending, disabled, children, ...props }: SubmitButtonProps) {
  const { pending: formPending } = useFormStatus();
  const isPending = externalPending ?? formPending;
  return (
    <Button type="submit" disabled={isPending || disabled} {...props}>
      {children}
    </Button>
  );
}
