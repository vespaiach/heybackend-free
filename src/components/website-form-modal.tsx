"use client";

import { Field, Form, type SubmitHandler, useForm } from "@formisch/react";
import { RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { addWebsite, updateWebsite } from "@/app/dashboard/websites/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { type WebsiteOutput, WebsiteSchema } from "@/lib/schemas";

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
  const [regenerateKey, setRegenerateKey] = React.useState(false);
  const isEdit = !!website;

  const form = useForm({
    schema: WebsiteSchema,
    initialInput: {
      name: website?.name ?? "",
      url: website?.url ?? "",
    },
    validate: "submit",
    revalidate: "input",
  });

  React.useEffect(() => {
    if (open) {
      setError(null);
      setRegenerateKey(false);
    }
  }, [open]);

  function handleRegenerateKey() {
    setRegenerateKey(true);
  }

  const handleSubmit: SubmitHandler<typeof WebsiteSchema> = async (output: WebsiteOutput) => {
    setError(null);

    const formData = new FormData();
    formData.set("name", output.name);
    formData.set("url", output.url);
    if (regenerateKey) formData.set("regenerateKey", "1");

    const result = isEdit ? await updateWebsite(website.id, formData) : await addWebsite(formData);

    if (result.error) {
      setError(result.error);
      return;
    }

    onOpenChange(false);
    router.refresh();
  };

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
        <Form of={form} onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Field of={form} path={["name"]}>
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...field.props} value={field.input} placeholder="My Website" autoFocus />
                  {field.errors && <p className="text-sm text-destructive">{field.errors[0]}</p>}
                </div>
              )}
            </Field>
            <Field of={form} path={["url"]}>
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    {...field.props}
                    value={field.input}
                    type="url"
                    placeholder="https://example.com"
                  />
                  {field.errors && <p className="text-sm text-destructive">{field.errors[0]}</p>}
                </div>
              )}
            </Field>
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
            <SubmitButton pending={form.isSubmitting} className="relative">
              {(form.isDirty || regenerateKey) && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500" />
              )}
              {form.isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Website"}
            </SubmitButton>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
