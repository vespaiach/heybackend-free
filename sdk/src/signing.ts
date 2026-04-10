/**
 * Fetches a short-lived token from the server.
 * The server computes HMAC-SHA256(key, websiteId:expiresAt) — the raw key
 * never reaches the browser. The SDK simply forwards the opaque token when
 * submitting a subscribe request.
 *
 * Throws on non-2xx responses or malformed response shape (caller handles
 * retry / fallback).
 */
export async function fetchToken(
  baseUrl: string,
  websiteId: string,
): Promise<{ token: string; expiresAt: number }> {
  const res = await fetch(`${baseUrl}/api/${websiteId}/token`);
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);

  const body = (await res.json()) as { token?: unknown; expiresAt?: unknown };
  if (typeof body.token !== "string" || typeof body.expiresAt !== "number") {
    throw new Error("Invalid token response");
  }

  return { token: body.token, expiresAt: body.expiresAt };
}
