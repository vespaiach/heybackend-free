import geoip from "fast-geoip";
import { after } from "next/server";
import { UAParser } from "ua-parser-js";
import * as v from "valibot";

import {
  buildCorsHeaders,
  created,
  getClientIp,
  guardToken,
  ok,
  RouteError,
  serverError,
  validateOrigin,
  validationError,
} from "@/lib/api/route-helpers";
import { subscriberService, websiteService } from "@/lib/domain";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";
import { SubscribeRequestSchema } from "@/lib/schemas/subscribe-request";

// ─── OPTIONS (preflight) ──────────────────────────────────────────────────────
// No body is sent in preflights — verify website exists and origin matches only.

export async function OPTIONS(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  try {
    const { websiteId } = await params;
    const website = await websiteService.getWebsiteForSigning(websiteId);
    if (!website || !website.isActive) return new Response(null, { status: 401 });

    const origin = request.headers.get("origin");
    if (!validateOrigin(origin, website.url)) return new Response(null, { status: 403 });

    return new Response(null, { status: 204, headers: buildCorsHeaders(website.url) });
  } catch {
    return new Response(null, { status: 500 });
  }
}

// ─── POST /api/[websiteId]/subscribe ─────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  // Parse body first — timestamp + signature are needed before we can guard.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("Invalid JSON body");
  }

  // Validate with Valibot (includes token + expiresAt fields).
  const result = v.safeParse(SubscribeRequestSchema, body);
  if (!result.success) {
    return validationError(result.issues.map((i) => i.message));
  }

  const { email, firstName, lastName, __hp, token, expiresAt } = result.output;

  try {
    // Token + origin guard.
    const { website } = await guardToken(request, params, token, expiresAt);
    const corsHeaders = buildCorsHeaders(website.url);

    // Rate limiting: per-IP and per-website buckets.
    const ip = getClientIp(request);
    const withinLimit =
      checkRateLimit(`ip:${ip}:sub`, 5, 60_000) && checkRateLimit(`site:${website.id}:sub`, 200, 60_000);

    if (!withinLimit) {
      return new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60", ...corsHeaders },
      });
    }

    // Honeypot: real users leave this blank; bots fill it in.
    // Silently accept so bots don't learn they were detected.
    if (__hp) return created({ message: "Subscribed" }, corsHeaders);

    const normalizedEmail = email.toLowerCase();
    const ua = request.headers.get("user-agent") ?? "";

    // Upsert subscriber. Geo/UA are enriched post-response to avoid blocking.
    const { created: isNew } = await subscriberService.upsertSubscriber({
      email: normalizedEmail,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      websiteId: website.id,
    });

    // Geo + UA enrichment runs after the response is sent — zero latency impact.
    after(async () => {
      try {
        const geo = ip !== "unknown" ? await geoip.lookup(ip) : null;
        const parser = new UAParser(ua);

        await subscriberService.enrichSubscriber(normalizedEmail, website.id, {
          country: geo?.country ?? null,
          region: geo?.region || null,
          city: geo?.city || null,
          timezone: geo?.timezone || null,
          browser: parser.getBrowser().name ?? null,
          deviceType: parser.getDevice().type ?? null,
          os: parser.getOS().name ?? null,
        });
      } catch (err) {
        logger.error("enrichSubscriber after()", err);
      }
    });

    return isNew
      ? created({ message: "Subscribed" }, corsHeaders)
      : ok({ message: "Subscribed" }, corsHeaders);
  } catch (e) {
    if (e instanceof RouteError) return e.response;
    logger.error("POST /api/[websiteId]/subscribe", e);
    return serverError();
  }
}
