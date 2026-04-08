import * as v from "valibot";
import { WebsiteSchema } from "@/lib/schemas";

export { WebsiteSchema };

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
