import * as v from "valibot";

/**
 * Validation schema for the public contact request API.
 *
 * Fields:
 * - name       Required. Trimmed, non-empty, max 256 chars.
 * - email      Required. Trimmed, valid email, max 320 chars.
 * - message    Required. Trimmed, non-empty, max 5000 chars.
 * - company    Optional. Trimmed, max 256 chars.
 * - phone      Optional. Trimmed, max 50 chars.
 * - __hp       Honeypot — if filled the request is silently dropped (bot).
 * - token      Server-minted short-lived HMAC token. Verified server-side.
 * - expiresAt  Unix millisecond expiry embedded in the token.
 *
 * Uses v.object() (not v.strictObject()) so unknown keys are stripped.
 */
export const ContactRequestSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(256)),
  email: v.pipe(v.string(), v.trim(), v.email(), v.maxLength(320)),
  message: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(5000)),
  company: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(256))),
  phone: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(50))),
  __hp: v.optional(v.string()),
  token: v.pipe(v.string(), v.minLength(1)),
  expiresAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

export type ContactRequest = v.InferOutput<typeof ContactRequestSchema>;
