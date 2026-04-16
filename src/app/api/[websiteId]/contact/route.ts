import geoip from "fast-geoip";
import { after } from "next/server";
import { UAParser } from "ua-parser-js";
import * as v from "valibot";

import {
  buildCorsHeaders,
  created,
  forbidden,
  getClientIp,
  serverError,
  unauthorized,
  validateOrigin,
  validationError,
} from "@/lib/api/route-helpers";
import { contactRequestService, websiteService } from "@/lib/domain";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";
import { ContactRequestSchema } from "@/lib/schemas/contact-request";
import { verifyToken } from "@/lib/signing";

// ─── OPTIONS (preflight) ──────────────────────────────────────────────────────
// No body is sent in preflights — verify website exists and origin matches only.

export async function OPTIONS(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  try {
    const { websiteId } = await params;
    const website = await websiteService.getWebsiteById(websiteId);
    if (!website || !website.isActive) return new Response(null, { status: 401 });

    const origin = request.headers.get("origin");
    if (!validateOrigin(origin, website.url)) return new Response(null, { status: 403 });

    return new Response(null, { status: 204, headers: buildCorsHeaders(website.url) });
  } catch {
    return new Response(null, { status: 500 });
  }
}

// ─── POST /api/[websiteId]/contact ────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  // Resolve website first so CORS headers are available on every response path.
  const { websiteId } = await params;
  const website = await websiteService.getWebsiteForSigning(websiteId);
  if (!website) return unauthorized();
  const corsHeaders = buildCorsHeaders(website.url);
  if (!website.isActive) return unauthorized(corsHeaders);

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("Invalid JSON body", corsHeaders);
  }

  // Validate with Valibot
  const result = v.safeParse(ContactRequestSchema, body);
  if (!result.success) {
    return validationError(
      result.issues.map((i) => i.message),
      corsHeaders,
    );
  }

  const { name, email, company, phone, message, __hp, token, expiresAt } = result.output;

  try {
    // Token verification
    if (!verifyToken(website.key, websiteId, token, expiresAt)) {
      return unauthorized(corsHeaders);
    }

    // Origin check
    const origin = request.headers.get("origin");
    if (!validateOrigin(origin, website.url)) {
      return forbidden(corsHeaders);
    }

    // Rate limiting: per-IP and per-website buckets (separate from subscribe)
    const ip = getClientIp(request);
    const withinLimit =
      (await checkRateLimit(`ip:${ip}:contact`, 10, 60_000)) &&
      (await checkRateLimit(`site:${website.id}:contact`, 500, 60_000));

    if (!withinLimit) {
      return new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60", ...corsHeaders },
      });
    }

    // Honeypot: real users leave this blank; bots fill it in.
    // Silently accept so bots don't learn they were detected.
    if (__hp) return created({ message: "Contact received" }, corsHeaders);

    const normalizedEmail = email.toLowerCase();
    const ua = request.headers.get("user-agent") ?? "";

    // Create contact request
    const contactRequest = await contactRequestService.createContactRequest({
      websiteId: website.id,
      email: normalizedEmail,
      name,
      company: company ?? null,
      phone: phone ?? null,
      message,
    });

    // Geo + UA enrichment runs after the response is sent — zero latency impact.
    after(async () => {
      try {
        const geo = ip !== "unknown" ? await geoip.lookup(ip) : null;
        const parser = new UAParser(ua);

        await contactRequestService.enrichContactRequest(contactRequest.id, {
          country: geo?.country ?? null,
          region: geo?.region || null,
          city: geo?.city || null,
          timezone: geo?.timezone || null,
          browser: parser.getBrowser().name ?? null,
          deviceType: parser.getDevice().type ?? null,
          os: parser.getOS().name ?? null,
        });

        // TODO: Send email notification to tenant here (future feature)
      } catch (err) {
        logger.error("enrichContactRequest after()", err);
      }
    });

    return created({ message: "Contact received" }, corsHeaders);
  } catch (e) {
    logger.error("POST /api/[websiteId]/contact", e);
    return serverError(corsHeaders);
  }
}
