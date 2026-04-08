"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addWebsite, updateWebsite } from "@/app/dashboard/websites/actions";

type Website = {
  id: string;
  name: string;
  url: string;
  key: string;
  isActive: boolean;
  createdAt: Date;
};

interface WebsiteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  website?: Website | null;
  isRequired?: boolean;
}

export function WebsiteFormModal({ open, onOpenChange, website, isRequired }: WebsiteFormModalProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [regenerateKey, setRegenerateKey] = React.useState(false);
  const isEdit = !!website;

  React.useEffect(() => {
    if (open) {
      setError(null);
      setIsDirty(false);
      setRegenerateKey(false);
    }
  }, [open]);

  function markDirty() {
    setIsDirty(true);
  }

  function handleRegenerateKey() {
    setRegenerateKey(true);
    setIsDirty(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    if (regenerateKey) formData.set("regenerateKey", "1");
    const result = isEdit ? await updateWebsite(website.id, formData) : await addWebsite(formData);

    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        {...(isRequired && {
          onEscapeKeyDown: (e) => e.preventDefault(),
          onInteractOutside: (e) => e.preventDefault(),
        })}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Website" : "Add Website"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="My Website"
                defaultValue={website?.name ?? ""}
                required
                autoFocus
                onChange={markDirty}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                name="url"
                type="url"
                placeholder="https://example.com"
                defaultValue={website?.url ?? ""}
                required
                onChange={markDirty}
              />
            </div>
            {isEdit && (
              <div className="grid gap-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={regenerateKey ? "New key will be generated on save" : "•••••••••••••••••••••••••"}
                    readOnly
                    className="font-mono text-muted-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRegenerateKey}
                    disabled={regenerateKey}
                    title="Generate new API key">
                    <RefreshCwIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            {!isRequired && (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            <SubmitButton pending={pending} className="relative">
              {isDirty && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
              {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Website"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
