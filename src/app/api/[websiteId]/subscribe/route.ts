import geoip from "fast-geoip";
import { after } from "next/server";
import { UAParser } from "ua-parser-js";
import * as v from "valibot";

import {
  buildCorsHeaders,
  created,
  forbidden,
  getClientIp,
  ok,
  serverError,
  unauthorized,
  validateOrigin,
  validationError,
} from "@/lib/api/route-helpers";
import { subscriberService, websiteService } from "@/lib/domain";
import type { EnrichmentData, SubscriptionRejectionReason } from "@/lib/domain/types";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";
import { SubscribeRequestSchema } from "@/lib/schemas/subscribe-request";
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

// ─── POST /api/[websiteId]/subscribe ─────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  // Resolve website first so CORS headers are available on every response path.
  const { websiteId } = await params;
  const website = await websiteService.getWebsiteForSigning(websiteId);
  if (!website) return unauthorized();
  const activeWebsite = website; // narrowed const — TypeScript can see closures won't get null
  const corsHeaders = buildCorsHeaders(activeWebsite.url);
  if (!activeWebsite.isActive) return unauthorized(corsHeaders);

  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";

  /** Build enrichment data from geo/UA — runs post-response via after(). */
  async function buildEnrichmentData(): Promise<EnrichmentData> {
    const geo = ip !== "unknown" ? await geoip.lookup(ip) : null;
    const parser = new UAParser(ua);
    return {
      country: geo?.country ?? null,
      region: geo?.region ?? null,
      city: geo?.city ?? null,
      area: null,
      timezone: geo?.timezone ?? null,
      browser: parser.getBrowser().name ?? null,
      deviceType: parser.getDevice().type ?? null,
      platform: parser.getOS().name ?? null,
    };
  }

  /** Log the request and schedule async enrichment post-response. */
  async function logAndEnrich(
    email: string,
    status: "ACCEPTED" | "REJECTED",
    rejectionReason?: SubscriptionRejectionReason,
    skipEnrich = false,
  ): Promise<void> {
    const logged = await subscriberService.logRequest({
      email,
      websiteId: activeWebsite.id,
      type: "SUBSCRIBE",
      status,
      ...(rejectionReason !== undefined ? { rejectionReason } : {}),
    });
    if (!skipEnrich) {
      after(async () => {
        try {
          const enrichmentData = await buildEnrichmentData();
          await subscriberService.enrichRequest(logged.id, enrichmentData);
        } catch (err) {
          logger.error("enrichRequest after()", err);
        }
      });
    }
  }

  // Parse body — token + expiresAt are validated before HMAC verification.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    await logAndEnrich("", "REJECTED", "VALIDATION_ERROR", true);
    return validationError("Invalid JSON body", corsHeaders);
  }

  // Validate with Valibot (includes token + expiresAt fields).
  const result = v.safeParse(SubscribeRequestSchema, body);
  if (!result.success) {
    // Extract email best-effort for logging; may be absent/invalid.
    const rawEmail =
      typeof (body as Record<string, unknown>)?.email === "string"
        ? ((body as Record<string, unknown>).email as string)
        : "";
    await logAndEnrich(rawEmail, "REJECTED", "VALIDATION_ERROR", true);
    return validationError(
      result.issues.map((i) => i.message),
      corsHeaders,
    );
  }

  const { email, firstName, lastName, __hp, token, expiresAt } = result.output;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Token verification.
    if (!verifyToken(activeWebsite.key, websiteId, token, expiresAt)) {
      await logAndEnrich(normalizedEmail, "REJECTED", "INVALID_TOKEN");
      return unauthorized(corsHeaders);
    }

    // Origin check.
    const origin = request.headers.get("origin");
    if (!validateOrigin(origin, activeWebsite.url)) {
      return forbidden(corsHeaders);
    }

    // Rate limiting: per-IP and per-website buckets (checked independently to
    // distinguish which limit was exceeded for accurate rejection reason logging).
    const ipAllowed = await checkRateLimit(`ip:${ip}:sub`, 5, 60_000);
    if (!ipAllowed) {
      await logAndEnrich(normalizedEmail, "REJECTED", "RATE_LIMIT_IP");
      return new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60", ...corsHeaders },
      });
    }

    const siteAllowed = await checkRateLimit(`site:${activeWebsite.id}:sub`, 200, 60_000);
    if (!siteAllowed) {
      await logAndEnrich(normalizedEmail, "REJECTED", "RATE_LIMIT_WEBSITE");
      return new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60", ...corsHeaders },
      });
    }

    // Honeypot: real users leave this blank; bots fill it in.
    // Silently accept so bots don't learn they were detected.
    if (__hp) {
      await logAndEnrich(normalizedEmail, "REJECTED", "HONEYPOT");
      return created({ message: "Subscribed" }, corsHeaders);
    }

    // Upsert subscriber. Geo/UA are enriched post-response to avoid blocking.
    const { created: isNew } = await subscriberService.upsertSubscriber({
      email: normalizedEmail,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      websiteId: activeWebsite.id,
    });

    await logAndEnrich(normalizedEmail, "ACCEPTED");

    return isNew
      ? created({ message: "Subscribed" }, corsHeaders)
      : ok({ message: "Subscribed" }, corsHeaders);
  } catch (e) {
    logger.error("POST /api/[websiteId]/subscribe", e);
    return serverError(corsHeaders);
  }
}
