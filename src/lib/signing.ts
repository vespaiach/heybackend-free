import { createHmac, timingSafeEqual } from "node:crypto";

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Verifies an HMAC-signed subscribe request.
 *
 * Signing scheme (SDK side):
 *   dynamicKey = HMAC-SHA256(timestamp, staticKey)
 *   signature  = HMAC-SHA256(websiteId + ":" + timestamp, dynamicKey) → base64url
 *
 * The static key never travels on the wire. Replay attacks are blocked by the
 * 5-minute timestamp window. Constant-time comparison prevents timing attacks.
 */
export function verifySubscribeSignature(
  websiteKey: string,
  websiteId: string,
  timestamp: number,
  signature: string,
): boolean {
  if (Math.abs(Date.now() - timestamp) > TIMESTAMP_TOLERANCE_MS) return false;

  const ts = String(timestamp);

  const dynamicKey = createHmac("sha256", websiteKey).update(ts).digest();

  const expected = createHmac("sha256", dynamicKey).update(`${websiteId}:${ts}`).digest("base64url");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    // Buffer lengths differ — signature is definitely invalid
    return false;
  }
}
