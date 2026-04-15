import geoip from "fast-geoip";
import { after } from "next/server";
import { UAParser } from "ua-parser-js";
import * as v from "valibot";

import {
  buildCorsHeaders,
  forbidden,
  getClientIp,
  json,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/route-helpers";
import { subscriberService, websiteService } from "@/lib/domain";
import type { EnrichmentData, SubscriptionRejectionReason } from "@/lib/domain/types";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";
import { verifyToken } from "@/lib/signing";

// ─── Schema ───────────────────────────────────────────────────────────────────

const UnsubscribeQuerySchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email(), v.maxLength(320)),
  token: v.pipe(v.string(), v.minLength(1)),
  expiresAt: v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(0)),
});

// ─── GET /api/[websiteId]/unsubscribe ─────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  const { websiteId } = await params;

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
  ): Promise<{ id: string }> {
    const logged = await subscriberService.logRequest({
      email,
      websiteId,
      type: "UNSUBSCRIBE",
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
    return logged;
  }

  // Parse query params
  const url = new URL(request.url);
  const rawParams = Object.fromEntries(url.searchParams.entries());

  // Validate with Valibot
  const result = v.safeParse(UnsubscribeQuerySchema, rawParams);
  if (!result.success) {
    await logAndEnrich("", "REJECTED", "VALIDATION_ERROR", true);
    return json({ message: result.issues.map((i) => i.message) }, 422);
  }

  const { email, token, expiresAt } = result.output;
  const normalizedEmail = email.toLowerCase().trim();

  // Look up the website (needed for key + isActive check)
  const website = await websiteService.getWebsiteForSigning(websiteId);
  if (!website) {
    await logAndEnrich(normalizedEmail, "REJECTED", "INVALID_TOKEN", true);
    return unauthorized();
  }

  const corsHeaders = buildCorsHeaders(website.url, "GET, OPTIONS");

  if (!website.isActive) {
    await logAndEnrich(normalizedEmail, "REJECTED", "INVALID_TOKEN", true);
    return forbidden(corsHeaders);
  }

  // Token verification
  if (!verifyToken(website.key, websiteId, token, expiresAt)) {
    await logAndEnrich(normalizedEmail, "REJECTED", "INVALID_TOKEN", true);
    return unauthorized(corsHeaders);
  }

  // Rate limiting: per-IP and per-website buckets
  const ipAllowed = await checkRateLimit(`ip:${ip}:unsub`, 5, 60_000);
  if (!ipAllowed) {
    await logAndEnrich(normalizedEmail, "REJECTED", "RATE_LIMIT_IP", true);
    return new Response(JSON.stringify({ message: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "60", ...corsHeaders },
    });
  }

  const siteAllowed = await checkRateLimit(`site:${website.id}:unsub`, 200, 60_000);
  if (!siteAllowed) {
    await logAndEnrich(normalizedEmail, "REJECTED", "RATE_LIMIT_WEBSITE", true);
    return new Response(JSON.stringify({ message: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "60", ...corsHeaders },
    });
  }

  try {
    const found = await subscriberService.unsubscribeByEmail(normalizedEmail, websiteId);
    if (!found) {
      await logAndEnrich(normalizedEmail, "REJECTED", "VALIDATION_ERROR", true);
      return json({ message: "Subscriber not found" }, 404, corsHeaders);
    }

    await logAndEnrich(normalizedEmail, "ACCEPTED");

    return ok({ message: "Unsubscribed" }, corsHeaders);
  } catch (e) {
    logger.error("GET /api/[websiteId]/unsubscribe", e);
    return serverError();
  }
}
