import { websiteService } from "@/lib/domain";
import { verifySubscribeSignature } from "@/lib/signing";

// ─── JSON response helper ──────────────────────────────────────────────────────

export function json(body: object, status: number, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(extraHeaders ?? {}) },
  });
}

// ─── Named response helpers ───────────────────────────────────────────────────

export function ok(data: Record<string, unknown>, extraHeaders?: HeadersInit): Response {
  return json(data, 200, extraHeaders);
}

export function created(data: Record<string, unknown>, extraHeaders?: HeadersInit): Response {
  return json(data, 201, extraHeaders);
}

export function validationError(messages: string | string[], extraHeaders?: HeadersInit): Response {
  const message = Array.isArray(messages) ? messages : [messages];
  return json({ message }, 400, extraHeaders);
}

export function unauthorized(extraHeaders?: HeadersInit): Response {
  return json({ message: "Unauthorized" }, 401, extraHeaders);
}

export function forbidden(extraHeaders?: HeadersInit): Response {
  return json({ message: "Forbidden" }, 403, extraHeaders);
}

export function serverError(extraHeaders?: HeadersInit): Response {
  return json({ message: "Internal server error" }, 500, extraHeaders);
}

// ─── IP extraction ────────────────────────────────────────────────────────────

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ─── CORS helpers ──────────────────────────────────────────────────────────────

export function validateOrigin(origin: string | null, websiteUrl: string): boolean {
  return origin === websiteUrl;
}

export function buildCorsHeaders(websiteUrl: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": websiteUrl,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// ─── Route error ──────────────────────────────────────────────────────────────

export class RouteError extends Error {
  constructor(public readonly response: Response) {
    super();
  }
}

// ─── Website resolver ─────────────────────────────────────────────────────────
// Extracts websiteId from route params, looks up the website, and asserts it
// exists and is active. Throws RouteError(401) if the check fails.

export async function resolveWebsite(
  params: Promise<{ websiteId: string }>,
): Promise<{ websiteId: string; website: { id: string; url: string } }> {
  const { websiteId } = await params;
  const website = await websiteService.getWebsiteById(websiteId);
  if (!website || !website.isActive) throw new RouteError(unauthorized());
  return { websiteId, website };
}

// ─── Auth + CORS guard (authenticated dashboard routes) ───────────────────────

export async function guard(
  request: Request,
  params: Promise<{ websiteId: string }>,
): Promise<{ websiteId: string; website: { id: string; url: string } }> {
  const result = await resolveWebsite(params);
  const origin = request.headers.get("origin");
  if (!validateOrigin(origin, result.website.url)) throw new RouteError(forbidden());
  return result;
}

// ─── Signed-request guard (public browser SDK routes) ────────────────────────
// Validates HMAC signature + timestamp window. The signing key never travels
// on the wire — only the derived signature and timestamp are sent by the SDK.
// Call AFTER parsing and validating the request body (needs timestamp + signature).

export async function guardSigned(
  request: Request,
  params: Promise<{ websiteId: string }>,
  timestamp: number,
  signature: string,
): Promise<{ websiteId: string; website: { id: string; url: string } }> {
  const { websiteId } = await params;

  const website = await websiteService.getWebsiteForSigning(websiteId);
  if (!website || !website.isActive) throw new RouteError(unauthorized());

  if (!verifySubscribeSignature(website.key, websiteId, timestamp, signature)) {
    throw new RouteError(unauthorized());
  }

  const origin = request.headers.get("origin");
  if (!validateOrigin(origin, website.url)) throw new RouteError(forbidden());

  return { websiteId, website };
}

// ─── Email validation ──────────────────────────────────────────────────────────
// RFC 5321 local-part max = 64 chars, domain max = 255 chars.
// This regex enforces structure without full RFC 5322 complexity.
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export function isValidEmail(value: string): boolean {
  if (value.length > 320) return false; // RFC 5321 max total
  const [local] = value.split("@");
  if (!local || local.length > 64) return false;
  return EMAIL_RE.test(value);
}

// ─── Field validators ──────────────────────────────────────────────────────────

export function isNonNegativeInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

export type FlatMetadata = Record<string, string | number | boolean | null>;

export function isShallowMetadata(v: unknown): v is FlatMetadata {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  for (const val of Object.values(v)) {
    if (val !== null && typeof val !== "string" && typeof val !== "number" && typeof val !== "boolean") {
      return false;
    }
  }
  return true;
}

// Validates an optional string field from a raw body object.
// Returns an error string if invalid, undefined if valid.
export function validateOptionalString(
  raw: Record<string, unknown>,
  key: string,
  maxLen: number,
): string | undefined {
  const val = raw[key];
  if (val === undefined || val === null) return undefined;
  if (typeof val !== "string") return `${key} must be a string`;
  if (val.length > maxLen) return `${key} must be ${maxLen} characters or fewer`;
  return undefined;
}

// ─── Enrichment field validators (shared by subscribe and contact) ─────────────

const UTM_FIELDS = ["utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent"] as const;

export function validateUtmFields(raw: Record<string, unknown>): string | undefined {
  for (const field of UTM_FIELDS) {
    const val = raw[field];
    if (val !== undefined && val !== null) {
      if (typeof val !== "string") return `${field} must be a string`;
      if (val.length > 256) return `${field} must be 256 characters or fewer`;
    }
  }
  return undefined;
}

const DIMENSION_FIELDS = ["screenWidth", "screenHeight", "viewportWidth", "viewportHeight"] as const;

export function validateDimensions(raw: Record<string, unknown>): string | undefined {
  for (const field of DIMENSION_FIELDS) {
    const val = raw[field];
    if (val !== undefined && val !== null && !isNonNegativeInt(val)) {
      return `${field} must be a non-negative integer`;
    }
  }
  return undefined;
}
