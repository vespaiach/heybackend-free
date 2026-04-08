import geoip from "fast-geoip";
import { UAParser } from "ua-parser-js";
import {
  buildCorsHeaders,
  created,
  getClientIp,
  guard,
  isValidEmail,
  RouteError,
  serverError,
  validationError,
} from "@/lib/api/route-helpers";
import { subscriberService } from "@/lib/domain";
import { logger } from "@/lib/logger";

type ValidBody = {
  email: string;
  firstName: string | undefined;
  lastName: string | undefined;
};

type BodyResult = { ok: true; data: ValidBody } | { ok: false; error: string };

const ALLOWED_BODY_KEYS = new Set(["email", "first_name", "last_name"]);

function validateBody(body: unknown): BodyResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const raw = body as Record<string, unknown>;

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_BODY_KEYS.has(key)) {
      return { ok: false, error: "Only email, first_name, and last_name are allowed" };
    }
  }

  // email — required
  const email = raw.email;
  if (typeof email !== "string" || email.trim().length === 0) {
    return { ok: false, error: "email is required" };
  }
  if (!isValidEmail(email.trim())) {
    return { ok: false, error: "email is invalid" };
  }

  const firstName = typeof raw.first_name === "string" ? raw.first_name : undefined;
  if (firstName && firstName.length > 256) {
    return { ok: false, error: "first_name must be at most 256 characters" };
  }

  const lastName = typeof raw.last_name === "string" ? raw.last_name : undefined;
  if (lastName !== undefined && lastName.trim().length === 0) {
    return { ok: false, error: "last_name cannot be empty" };
  }
  if (lastName !== undefined && lastName.length > 256) {
    return { ok: false, error: "last_name must be at most 256 characters" };
  }

  return {
    ok: true,
    data: {
      email: email.trim().toLowerCase(),
      firstName,
      lastName,
    },
  };
}

// ─── Route handlers ────────────────────────────────────────────────────────────

export async function OPTIONS(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  try {
    const { website } = await guard(request, params);
    return new Response(null, { status: 204, headers: buildCorsHeaders(website.url) });
  } catch (e) {
    if (e instanceof RouteError) return e.response;
    return new Response(null, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  try {
    const { website } = await guard(request, params);
    const corsHeaders = buildCorsHeaders(website.url);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON body", corsHeaders);
    }

    const validation = validateBody(body);
    if (!validation.ok) {
      return validationError(validation.error, corsHeaders);
    }

    const { email, firstName, lastName } = validation.data;

    // Resolve geo from IP — store only derived location, never the raw IP
    const ip = getClientIp(request);
    const geo = ip !== "unknown" ? await geoip.lookup(ip) : null;

    const ua = request.headers.get("user-agent") ?? "";
    const parser = new UAParser(ua);
    const browser = parser.getBrowser().name ?? null;
    const deviceType = parser.getDevice().type ?? null;
    const os = parser.getOS().name ?? null;

    await subscriberService.upsertSubscriber({
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      websiteId: website.id,
      country: geo?.country ?? null,
      region: geo?.region || null,
      city: geo?.city || null,
      timezone: geo?.timezone || null,
      browser,
      deviceType,
      os,
    });

    return created({ message: "Subscribed" }, corsHeaders);
  } catch (e) {
    if (e instanceof RouteError) return e.response;
    logger.error("POST /api/[websiteId]/subscribe", e);
    return serverError();
  }
}
