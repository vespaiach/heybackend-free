import * as v from "valibot";

export const WebsiteSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty("Website name is required")),
  url: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Website URL is required"),
    v.url("Must be a valid URL (e.g. https://example.com)"),
    v.check((u) => {
      try {
        const { protocol } = new URL(u);
        return protocol === "https:" || protocol === "http:";
      } catch {
        return false;
      }
    }, "URL must use http or https"),
  ),
});

export const OnboardingSchema = v.object({
  fullName: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Full name is required"),
    v.minLength(2, "Full name must be at least 2 characters"),
  ),
  websites: v.array(WebsiteSchema),
});

export type OnboardingInput = v.InferInput<typeof OnboardingSchema>;
export type OnboardingOutput = v.InferOutput<typeof OnboardingSchema>;
