import type { ContactSubmitData } from "./contact";
import { bindContactForm as _bindContactForm, bindForm as _bindForm, type BindFormCallbacks } from "./form";
import { coreSubscribe, type HbConfig, type SubscribeData } from "./subscribe";

// ─── Embedded config ──────────────────────────────────────────────────────────
// The placeholder strings below are replaced server-side by the sdk.js route
// before the script is returned to the browser. They must remain exact string
// literals so esbuild preserves them in the minified output.
//
// baseUrl is derived from the script's own src so that fetch() targets the
// heybackend origin even when this script is embedded on a third-party site.
// document.currentScript is only available during synchronous script evaluation,
// so we capture it here at module init time.

function deriveBaseUrl(): string {
  if (typeof document === "undefined") return "";
  try {
    const src = (document.currentScript as HTMLScriptElement | null)?.src;
    if (src) return new URL(src).origin;
  } catch {
    // ignore malformed URLs
  }
  return "";
}

const config: HbConfig = {
  websiteId: "__HB_WEBSITE_ID__",
  baseUrl: deriveBaseUrl(),
};

// ─── Public API ───────────────────────────────────────────────────────────────

function subscribe(data: SubscribeData): Promise<{ status: number }> {
  return coreSubscribe(config, data);
}

function bindForm(selector: string | HTMLFormElement, callbacks: BindFormCallbacks): () => void {
  return _bindForm(selector, config, callbacks);
}

function bindContactForm(selector: string | HTMLFormElement, callbacks: BindFormCallbacks): () => void {
  return _bindContactForm(selector, config, callbacks);
}

// ─── Global export ────────────────────────────────────────────────────────────

const __HB = { subscribe, bindForm, bindContactForm };

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__HB = __HB;
}

export { subscribe, bindForm, bindContactForm };
