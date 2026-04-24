"use client";

import type { SubmitHandler } from "@formisch/react";
import { FieldArray, Form, Field as FormischField, insert, remove, useForm } from "@formisch/react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { createTenant } from "@/app/onboarding/actions";
import { OnboardingSchema } from "@/app/onboarding/schema";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/fields";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export function OnboardingForm() {
  const form = useForm({
    schema: OnboardingSchema,
    initialInput: { fullName: "", websites: [] },
    validate: "submit",
    revalidate: "input",
  });

  const handleSubmit: SubmitHandler<typeof OnboardingSchema> = async (output) => {
    await createTenant(output);
  };

  return (
    <Form of={form} onSubmit={handleSubmit}>
      <FieldGroup>
        <FormischField of={form} path={["fullName"]}>
          {(field) => (
            <Field>
              <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
              <Input
                {...field.props}
                id="fullName"
                value={field.input}
                placeholder="Jane Smith"
                aria-invalid={!!field.errors}
              />
              {field.errors && <p className="text-xs text-destructive">{field.errors[0]}</p>}
            </Field>
          )}
        </FormischField>

        <FieldArray of={form} path={["websites"]}>
          {(fieldArray) => (
            <>
              {fieldArray.items.length > 0 && (
                <div className="flex flex-col gap-4">
                  {fieldArray.items.map((_, index) => (
                    <div key={_} className="flex flex-col gap-2 rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Website {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => remove(form, { path: ["websites"], at: index })}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remove website ${index + 1}`}>
                          <Trash2Icon className="size-4" />
                        </button>
                      </div>

                      <FormischField of={form} path={["websites", index, "name"]}>
                        {(field) => (
                          <div className="flex flex-col gap-1">
                            <Input
                              {...field.props}
                              value={field.input}
                              placeholder="My Blog"
                              aria-label={`Website ${index + 1} name`}
                              aria-invalid={!!field.errors}
                            />
                            {field.errors && <p className="text-xs text-destructive">{field.errors[0]}</p>}
                          </div>
                        )}
                      </FormischField>

                      <FormischField of={form} path={["websites", index, "url"]}>
                        {(field) => (
                          <div className="flex flex-col gap-1">
                            <Input
                              {...field.props}
                              value={field.input}
                              placeholder="https://example.com"
                              type="url"
                              aria-label={`Website ${index + 1} URL`}
                              aria-invalid={!!field.errors}
                            />
                            {field.errors ? (
                              <p className="text-xs text-destructive">{field.errors[0]}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Enter the origin URL (e.g. https://example.com) — no paths or query strings
                              </p>
                            )}
                          </div>
                        )}
                      </FormischField>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </FieldArray>

        <button
          type="button"
          onClick={() => insert(form, { path: ["websites"], initialInput: { name: "", url: "" } })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <PlusIcon className="size-4" />
          Add a website
        </button>

        <Field>
          <SubmitButton disabled={form.isSubmitting}>
            {form.isSubmitting ? "Setting up…" : "Complete setup"}
          </SubmitButton>
        </Field>
      </FieldGroup>
    </Form>
  );
}
