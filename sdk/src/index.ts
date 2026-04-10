import { bindForm as _bindForm, type BindFormCallbacks } from "./form";
import { coreSubscribe, type HbConfig, type SubscribeData } from "./subscribe";

// ─── Embedded config ──────────────────────────────────────────────────────────
// The placeholder string below is replaced server-side by the sdk.js route
// before the script is returned to the browser. It must remain an exact string
// literal so esbuild preserves it in the minified output.

const config: HbConfig = {
  websiteId: "__HB_WEBSITE_ID__",
};

// ─── Public API ───────────────────────────────────────────────────────────────

function subscribe(data: SubscribeData): Promise<{ status: number }> {
  return coreSubscribe(config, data);
}

function bindForm(selector: string | HTMLFormElement, callbacks: BindFormCallbacks): () => void {
  return _bindForm(selector, config, callbacks);
}

// ─── Global export ────────────────────────────────────────────────────────────

const __HB = { subscribe, bindForm };

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__HB = __HB;
}

export { subscribe, bindForm };
