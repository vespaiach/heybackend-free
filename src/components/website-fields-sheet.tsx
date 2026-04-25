"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";
import {
  createWebsiteField,
  deleteWebsiteField,
  getWebsiteFields,
  updateWebsiteField,
} from "@/app/dashboard/websites/actions";
import { Button } from "@/components/ui/buttons";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/selects";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";
import type { WebsiteField, WebsiteFieldType } from "@/lib/domain/types";

const FIELD_TYPES: { value: WebsiteFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
];

function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

interface AddFieldFormProps {
  websiteId: string;
  nextPosition: number;
  onCreated: (field: WebsiteField) => void;
}

function AddFieldForm({ websiteId, nextPosition, onCreated }: AddFieldFormProps) {
  const [label, setLabel] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugManual, setSlugManual] = React.useState(false);
  const [type, setType] = React.useState<WebsiteFieldType>("text");
  const [required, setRequired] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleLabelChange(val: string) {
    setLabel(val);
    if (!slugManual) setSlug(slugify(val));
  }

  function handleSlugChange(val: string) {
    setSlug(val);
    setSlugManual(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalSlug = slug.trim() || slugify(label);
    if (!label.trim()) {
      setError("Label is required");
      return;
    }
    if (!finalSlug) {
      setError("Slug is required");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createWebsiteField(websiteId, {
        slug: finalSlug,
        label: label.trim(),
        type,
        required,
        position: nextPosition,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setLabel("");
        setSlug("");
        setSlugManual(false);
        setType("text");
        setRequired(false);
        onCreated(result.field);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Add field</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Company name"
            className="h-8 text-sm"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Slug (key)</Label>
          <Input
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="company_name"
            className="h-8 font-mono text-sm"
            disabled={isPending}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={type}
            onValueChange={(v: string) => setType(v as WebsiteFieldType)}
            disabled={isPending}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((ft) => (
                <SelectItem key={ft.value} value={ft.value}>
                  {ft.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <Checkbox
            id="add-required"
            checked={required}
            onCheckedChange={(c) => setRequired(!!c)}
            disabled={isPending}
          />
          <Label htmlFor="add-required" className="cursor-pointer text-sm font-normal">
            Required
          </Label>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <SubmitButton pending={isPending} size="sm" className="w-full">
        <PlusIcon className="mr-1 h-3 w-3" />
        Add field
      </SubmitButton>
    </form>
  );
}

interface FieldRowProps {
  field: WebsiteField;
  onUpdated: (field: WebsiteField) => void;
  onDeleted: (id: string) => void;
}

function FieldRow({ field, onUpdated, onDeleted }: FieldRowProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [label, setLabel] = React.useState(field.label);
  const [type, setType] = React.useState<WebsiteFieldType>(field.type);
  const [required, setRequired] = React.useState(field.required);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleSave() {
    if (!label.trim()) {
      setError("Label is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateWebsiteField(field.id, { label: label.trim(), type, required });
      if ("error" in result) {
        setError(result.error);
      } else {
        setIsEditing(false);
        onUpdated(result.field);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWebsiteField(field.id);
      if (result.error) {
        setError(result.error);
      } else {
        onDeleted(field.id);
      }
    });
  }

  if (isEditing) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 text-sm"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select
              value={type}
              onValueChange={(v: string) => setType(v as WebsiteFieldType)}
              disabled={isPending}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`edit-required-${field.id}`}
            checked={required}
            onCheckedChange={(c) => setRequired(!!c)}
            disabled={isPending}
          />
          <Label htmlFor={`edit-required-${field.id}`} className="cursor-pointer text-sm font-normal">
            Required
          </Label>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              setError(null);
            }}
            disabled={isPending}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{field.label}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {field.slug} · {field.type}
          {field.required && " · required"}
        </p>
      </div>
      <div className="ml-2 flex shrink-0 gap-1">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Delete field ${field.label}`}>
          <Trash2Icon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface WebsiteFieldsSheetProps {
  websiteId: string;
  websiteName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebsiteFieldsSheet({ websiteId, websiteName, open, onOpenChange }: WebsiteFieldsSheetProps) {
  const [fields, setFields] = React.useState<WebsiteField[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    getWebsiteFields(websiteId).then((result) => {
      if ("fields" in result) setFields(result.fields);
      setLoading(false);
    });
  }, [open, websiteId]);

  function handleCreated(field: WebsiteField) {
    setFields((prev) => [...prev, field]);
  }

  function handleUpdated(updated: WebsiteField) {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }

  function handleDeleted(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Custom fields — {websiteName}</SheetTitle>
        </SheetHeader>
        <p className="text-sm text-muted-foreground">
          Define the fields you want to collect from subscribers. Values can be set at subscribe time or
          edited manually per subscriber.
        </p>
        <div className="flex-1 space-y-2 overflow-y-auto py-2">
          {loading && <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>}
          {!loading && fields.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No custom fields yet.</p>
          )}
          {fields.map((field) => (
            <FieldRow key={field.id} field={field} onUpdated={handleUpdated} onDeleted={handleDeleted} />
          ))}
        </div>
        <div className="border-t pt-4">
          <AddFieldForm websiteId={websiteId} nextPosition={fields.length} onCreated={handleCreated} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
