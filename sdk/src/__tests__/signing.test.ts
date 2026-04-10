// @vitest-environment node
// Cross-verify the browser sign() against the server-side algorithm.
// Both must produce identical output for the same inputs.
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sign } from "../signing";

/** Server-side reference implementation (mirrors buildSignature in route.test.ts) */
function serverSign(websiteId: string, key: string, timestamp: number): string {
  const ts = String(timestamp);
  const dynamicKey = createHmac("sha256", key).update(ts).digest();
  return createHmac("sha256", dynamicKey).update(`${websiteId}:${ts}`).digest("base64url");
}

describe("sign()", () => {
  const WEBSITE_ID = "site_abc123";
  const KEY = "test-signing-secret-32chars!!!!!";

  it("produces the same signature as the server-side algorithm", async () => {
    const ts = Date.now();
    const browser = await sign(WEBSITE_ID, KEY, ts);
    const server = serverSign(WEBSITE_ID, KEY, ts);
    expect(browser).toBe(server);
  });

  it("produces different signatures for different timestamps", async () => {
    const ts1 = 1_700_000_000_000;
    const ts2 = 1_700_000_001_000;
    const sig1 = await sign(WEBSITE_ID, KEY, ts1);
    const sig2 = await sign(WEBSITE_ID, KEY, ts2);
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different keys", async () => {
    const ts = 1_700_000_000_000;
    const sig1 = await sign(WEBSITE_ID, KEY, ts);
    const sig2 = await sign(WEBSITE_ID, "different-key-32chars!!!!!!!!!", ts);
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different websiteIds", async () => {
    const ts = 1_700_000_000_000;
    const sig1 = await sign("site_aaa", KEY, ts);
    const sig2 = await sign("site_bbb", KEY, ts);
    expect(sig1).not.toBe(sig2);
  });

  it("output is base64url (no +, /, or = chars)", async () => {
    const sig = await sign(WEBSITE_ID, KEY, Date.now());
    expect(sig).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
