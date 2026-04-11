import {
  buildCorsHeaders,
  forbidden,
  getClientIp,
  ok,
  RouteError,
  serverError,
  unauthorized,
  validateOrigin,
} from "@/lib/api/route-helpers";
import { websiteService } from "@/lib/domain";
import { checkRateLimit } from "@/lib/rate-limiter";
import { mintToken } from "@/lib/signing";

// ─── OPTIONS (preflight) ──────────────────────────────────────────────────────

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

    return new Response(null, { status: 204, headers: buildCorsHeaders(website.url, "GET, OPTIONS") });
  } catch {
    return new Response(null, { status: 500 });
  }
}

// ─── GET /api/[websiteId]/token ───────────────────────────────────────────────
// Mints a short-lived token bound to websiteId. The raw signing key never
// leaves the server — only the opaque token and its expiry are returned.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  try {
    const { websiteId } = await params;
    const website = await websiteService.getWebsiteForSigning(websiteId);
    if (!website) return unauthorized();
    const corsHeaders = buildCorsHeaders(website.url, "GET, OPTIONS");
    if (!website.isActive) return unauthorized(corsHeaders);

    const origin = request.headers.get("origin");
    if (!validateOrigin(origin, website.url)) return forbidden(corsHeaders);

    // Rate limit: 10 requests per 60 s per IP (tokens last 15 min, so legitimate
    // use is at most 1/15 min; this headroom accommodates page refreshes + tabs).
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`ip:${ip}:token`, 10, 60_000))) {
      return new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60", ...corsHeaders },
      });
    }

    const { token, expiresAt } = mintToken(website.key, websiteId);
    return ok({ token, expiresAt }, { ...corsHeaders, "Cache-Control": "no-store" });
  } catch (e) {
    if (e instanceof RouteError) return e.response;
    return serverError();
  }
}
