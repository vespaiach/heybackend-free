import { readFileSync } from "node:fs";
import { join } from "node:path";
import { websiteService } from "@/lib/domain";

const JS_STUB = 'console.warn("heybackend: invalid website");';
const JS_HEADERS: HeadersInit = {
  "Content-Type": "application/javascript",
  "Cache-Control": "public, max-age=3600",
};

const SDK_TEMPLATE = readFileSync(join(process.cwd(), "sdk/dist/hb.min.js"), "utf8");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  const { websiteId } = await params;

  const website = await websiteService.getWebsiteForSigning(websiteId);
  if (!website || !website.isActive) {
    return new Response(JS_STUB, { status: 200, headers: JS_HEADERS });
  }

  const js = SDK_TEMPLATE.replace('"__HB_WEBSITE_ID__"', JSON.stringify(website.id));

  return new Response(js, { status: 200, headers: JS_HEADERS });
}
