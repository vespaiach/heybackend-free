"use client";

import { Button } from "./buttons";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "./dialogs";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  onConfirm: () => Promise<void> | void;
  cancelButtonText?: string;
  confirmButtonText?: string;
}

export function ConfirmationModal({
  open,
  children,
  onOpenChange,
  onConfirm,
  cancelButtonText = "Cancel",
  confirmButtonText = "Confirm",
}: ConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {children}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {cancelButtonText}
            </Button>
          </DialogClose>
          <Button type="button" onClick={onConfirm}>
            {confirmButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
