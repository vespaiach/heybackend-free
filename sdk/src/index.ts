import {
  bindContactForm as _bindContactForm,
  bindSubscriberForm as _bindForm,
  type BindFormCallbacks,
} from "./form";
import { coreSubscribe, type HbConfig, type SubscribeData } from "./subscribe";

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

export function deriveWebsiteId(): string {
  if (typeof document === "undefined") return "__HB_WEBSITE_ID__";
  try {
    const src = (document.currentScript as HTMLScriptElement | null)?.src;
    if (src) {
      const url = new URL(src);
      // Extract websiteId from /api/{websiteId}/sdk.js pattern
      const match = url.pathname.match(/\/api\/([^/]+)\/sdk\.js/);
      if (match?.[1]) return match[1];
    }
  } catch {
    // ignore malformed URLs
  }
  return "__HB_WEBSITE_ID__";
}

const config: HbConfig = {
  websiteId: deriveWebsiteId(),
  baseUrl: deriveBaseUrl(),
};

// ─── Public API ───────────────────────────────────────────────────────────────

function subscribe(data: SubscribeData): Promise<{ status: number }> {
  return coreSubscribe(config, data);
}

function bindSubscriberForm(selector: string | HTMLFormElement, callbacks: BindFormCallbacks): () => void {
  return _bindForm(selector, config, callbacks);
}

function bindContactForm(selector: string | HTMLFormElement, callbacks: BindFormCallbacks): () => void {
  return _bindContactForm(selector, config, callbacks);
}

// ─── Global export ────────────────────────────────────────────────────────────

const __HB = { subscribe, bindSubscriberForm, bindContactForm };

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__HB = __HB;
}

export { subscribe, bindSubscriberForm, bindContactForm };
