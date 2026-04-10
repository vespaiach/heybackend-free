import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Mints a short-lived token by computing HMAC-SHA256(websiteKey, `${websiteId}:${expiresAt}`).
 * The raw key never leaves the server; only the opaque token and expiry are sent to the client.
 *
 * @param now Injectable timestamp for deterministic testing (defaults to Date.now()).
 */
export function mintToken(
  websiteKey: string,
  websiteId: string,
  now?: number,
): { token: string; expiresAt: number } {
  const expiresAt = (now ?? Date.now()) + TOKEN_TTL_MS;
  const token = createHmac("sha256", websiteKey).update(`${websiteId}:${expiresAt}`).digest("base64url");
  return { token, expiresAt };
}

/**
 * Verifies a server-minted token.
 * Returns false if the token is expired or if the constant-time comparison fails.
 *
 * @param now Injectable timestamp for deterministic testing (defaults to Date.now()).
 */
export function verifyToken(
  websiteKey: string,
  websiteId: string,
  token: string,
  expiresAt: number,
  now?: number,
): boolean {
  if ((now ?? Date.now()) > expiresAt) return false;

  const expected = createHmac("sha256", websiteKey).update(`${websiteId}:${expiresAt}`).digest("base64url");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    // Buffer lengths differ — token is definitely invalid
    return false;
  }
}
