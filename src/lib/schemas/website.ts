import * as v from "valibot";

export const WebsiteSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Website name is required"),
    v.maxLength(255, "Name must be less than 255 characters"),
  ),
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

export type WebsiteInput = v.InferInput<typeof WebsiteSchema>;
export type WebsiteOutput = v.InferOutput<typeof WebsiteSchema>;
