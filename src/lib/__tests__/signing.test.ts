// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mintToken, verifyToken } from "../signing";

const KEY = "test-signing-secret-32chars!!!!!";
const WEBSITE_ID = "site_abc123";
const NOW = 1_700_000_000_000;
const TOKEN_TTL_MS = 15 * 60 * 1000;

describe("mintToken()", () => {
  it("returns a non-empty base64url token string", () => {
    const { token } = mintToken(KEY, WEBSITE_ID, NOW);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThan(0);
  });

  it("sets expiresAt to now + 15 minutes", () => {
    const { expiresAt } = mintToken(KEY, WEBSITE_ID, NOW);
    expect(expiresAt).toBe(NOW + TOKEN_TTL_MS);
  });

  it("is deterministic — same inputs produce the same token", () => {
    const { token: t1 } = mintToken(KEY, WEBSITE_ID, NOW);
    const { token: t2 } = mintToken(KEY, WEBSITE_ID, NOW);
    expect(t1).toBe(t2);
  });

  it("produces different tokens for different websiteIds", () => {
    const { token: t1 } = mintToken(KEY, "site_aaa", NOW);
    const { token: t2 } = mintToken(KEY, "site_bbb", NOW);
    expect(t1).not.toBe(t2);
  });

  it("produces different tokens for different keys", () => {
    const { token: t1 } = mintToken(KEY, WEBSITE_ID, NOW);
    const { token: t2 } = mintToken("different-key-32chars!!!!!!!!!", WEBSITE_ID, NOW);
    expect(t1).not.toBe(t2);
  });

  it("produces different tokens for different now values (hence different expiresAt)", () => {
    const { token: t1 } = mintToken(KEY, WEBSITE_ID, NOW);
    const { token: t2 } = mintToken(KEY, WEBSITE_ID, NOW + 1);
    expect(t1).not.toBe(t2);
  });
});

describe("verifyToken()", () => {
  it("returns true for a freshly minted token", () => {
    const { token, expiresAt } = mintToken(KEY, WEBSITE_ID, NOW);
    // Verify at NOW (well before expiry)
    expect(verifyToken(KEY, WEBSITE_ID, token, expiresAt, NOW)).toBe(true);
  });

  it("returns false when the token is expired (now > expiresAt)", () => {
    const { token, expiresAt } = mintToken(KEY, WEBSITE_ID, NOW);
    // Verify 1 ms after expiry
    expect(verifyToken(KEY, WEBSITE_ID, token, expiresAt, expiresAt + 1)).toBe(false);
  });

  it("returns false for a tampered token string", () => {
    const { expiresAt } = mintToken(KEY, WEBSITE_ID, NOW);
    expect(verifyToken(KEY, WEBSITE_ID, "tampered-value", expiresAt, NOW)).toBe(false);
  });

  it("returns false when websiteId does not match", () => {
    const { token, expiresAt } = mintToken(KEY, WEBSITE_ID, NOW);
    expect(verifyToken(KEY, "site_other", token, expiresAt, NOW)).toBe(false);
  });

  it("returns false when key does not match", () => {
    const { token, expiresAt } = mintToken(KEY, WEBSITE_ID, NOW);
    expect(verifyToken("wrong-key", WEBSITE_ID, token, expiresAt, NOW)).toBe(false);
  });

  it("returns false for a token with mismatched length (no throw)", () => {
    const { expiresAt } = mintToken(KEY, WEBSITE_ID, NOW);
    expect(verifyToken(KEY, WEBSITE_ID, "short", expiresAt, NOW)).toBe(false);
  });

  it("returns false when expiresAt is tampered (token no longer matches)", () => {
    const { token, expiresAt } = mintToken(KEY, WEBSITE_ID, NOW);
    // Extend the expiry by 1 ms — the HMAC will no longer match
    expect(verifyToken(KEY, WEBSITE_ID, token, expiresAt + 1, NOW)).toBe(false);
  });
});
