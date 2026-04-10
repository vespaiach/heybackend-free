import { readFileSync } from "node:fs";
import { join } from "node:path";
import JavaScriptObfuscator from "javascript-obfuscator";
import { websiteService } from "@/lib/domain";

const JS_STUB = 'console.warn("heybackend: invalid website");';
const JS_HEADERS: HeadersInit = {
  "Content-Type": "application/javascript",
  "Cache-Control": "public, max-age=3600",
};

const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,
  stringArray: true,
  stringArrayEncoding: ["base64"] as ["base64"],
  stringArrayThreshold: 0.75,
  rotateStringArray: true,
  shuffleStringArray: true,
  identifierNamesGenerator: "hexadecimal" as const,
  seed: 0,
} as const;

// In-memory cache: "websiteId:key" → obfuscated JS.
// Keyed by both so cache auto-invalidates on key rotation.
const cache = new Map<string, string>();

function readTemplate(): string {
  return readFileSync(join(process.cwd(), "sdk/dist/hb.min.js"), "utf8");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  const { websiteId } = await params;

  const website = await websiteService.getWebsiteForSigning(websiteId);
  if (!website || !website.isActive) {
    return new Response(JS_STUB, { status: 200, headers: JS_HEADERS });
  }

  const cacheKey = `${websiteId}:${website.key}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return new Response(cached, { status: 200, headers: JS_HEADERS });
  }

  const populated = readTemplate()
    .replace('"__HB_WEBSITE_ID__"', JSON.stringify(website.id))
    .replace('"__HB_KEY__"', JSON.stringify(website.key));

  const obfuscated = JavaScriptObfuscator.obfuscate(populated, OBFUSCATOR_OPTIONS).getObfuscatedCode();

  cache.set(cacheKey, obfuscated);
  return new Response(obfuscated, { status: 200, headers: JS_HEADERS });
}
