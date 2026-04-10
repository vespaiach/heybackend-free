/**
 * Signs a subscribe request using the same two-layer HMAC-SHA256 scheme
 * as the server's verifySubscribeSignature (src/lib/signing.ts).
 *
 * Step 1: dynamicKey = HMAC-SHA256(timestamp, staticKey)
 * Step 2: signature  = HMAC-SHA256(websiteId + ":" + timestamp, dynamicKey)
 *
 * Uses native Web Crypto API — no polyfills, modern browsers only.
 */
export async function sign(websiteId: string, key: string, timestamp: number): Promise<string> {
  const enc = new TextEncoder();
  const ts = String(timestamp);

  const rawKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const dynKeyBytes = await crypto.subtle.sign("HMAC", rawKey, enc.encode(ts));

  const dynKey = await crypto.subtle.importKey("raw", dynKeyBytes, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sigBytes = await crypto.subtle.sign("HMAC", dynKey, enc.encode(`${websiteId}:${ts}`));

  return btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
