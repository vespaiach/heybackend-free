import * as v from "valibot";

/**
 * Validation schema for the public subscribe API request body.
 *
 * Fields:
 * - email      Required. Trimmed, validated as email, max 320 chars (RFC 5321).
 * - firstName  Optional. Trimmed, non-empty if present, max 256 chars.
 * - lastName   Optional. Trimmed, non-empty if present, max 256 chars.
 * - __hp       Honeypot — if non-empty the request is silently dropped (bot).
 * - timestamp  Unix milliseconds. Validated server-side against a 5-min window.
 * - signature  HMAC-SHA256 base64url signature. Verified server-side.
 *
 * Uses v.object() (not v.strictObject()) so unknown keys are stripped rather
 * than rejected — prevents breakage when the SDK adds new optional fields.
 */
export const SubscribeRequestSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email(), v.maxLength(320)),
  firstName: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(256))),
  lastName: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(256))),
  __hp: v.optional(v.string()),
  timestamp: v.pipe(v.number(), v.integer(), v.minValue(0)),
  signature: v.pipe(v.string(), v.minLength(1)),
});

export type SubscribeRequest = v.InferOutput<typeof SubscribeRequestSchema>;
