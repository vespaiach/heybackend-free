import { fetchToken } from "./signing";

export type HbErrorCode =
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "TOKEN_ERROR";

export class HbError extends Error {
  constructor(
    public readonly code: HbErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "HbError";
  }
}

export interface HbConfig {
  readonly websiteId: string;
  /** Absolute origin of the heybackend server, e.g. "https://app.heybackend.com".
   *  Derived automatically from the script's own src at init time so the SDK works
   *  when embedded on third-party sites. Defaults to "" (same-origin) for local dev. */
  readonly baseUrl: string;
}

export interface ContactSubmitData {
  name: string;
  email: string;
  message: string;
  company?: string;
  phone?: string;
}

// ─── In-memory token cache ────────────────────────────────────────────────────
// Keep a module-local cache keyed by websiteId to avoid re-fetching contact
// tokens on repeated submissions from the same page load.
// Refresh the token 60 s before it actually expires to avoid a race where the
// token is valid at cache-read time but expires before the contact POST lands.

interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();
const EXPIRY_BUFFER_MS = 60_000;

/** Export for tests — clears the module-scoped cache between test cases. */
export function __resetTokenCache(): void {
  tokenCache.clear();
}

async function getToken(config: HbConfig): Promise<CachedToken> {
  const cached = tokenCache.get(config.websiteId);
  if (cached && Date.now() < cached.expiresAt - EXPIRY_BUFFER_MS) {
    return cached;
  }
  const fresh = await fetchToken(config.baseUrl, config.websiteId);
  tokenCache.set(config.websiteId, fresh);
  return fresh;
}

async function attempt(config: HbConfig, data: ContactSubmitData): Promise<{ status: number }> {
  let tokenData: CachedToken;
  try {
    tokenData = await getToken(config);
  } catch {
    throw new HbError("TOKEN_ERROR", "Failed to obtain contact token");
  }

  const res = await fetch(`${config.baseUrl}/api/${config.websiteId}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      message: data.message,
      company: data.company,
      phone: data.phone,
      __hp: "",
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
    }),
  });

  if (res.ok) return { status: res.status };

  // On 401 the token may have just expired in a race; clear cache so a retry
  // will re-fetch a fresh token automatically.
  if (res.status === 401) {
    tokenCache.delete(config.websiteId);
  }

  let code: HbErrorCode = "SERVER_ERROR";
  if (res.status === 429) code = "RATE_LIMITED";
  else if (res.status === 400) code = "VALIDATION_ERROR";
  else if (res.status === 401) code = "TOKEN_ERROR";

  let message = "Contact submission failed";
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (typeof body.message === "string") message = body.message;
    else if (Array.isArray(body.message)) message = body.message.join("; ");
  } catch {
    // ignore parse errors
  }

  throw new HbError(code, message, res.status);
}

/** POSTs a contact submission. Retries once after 2 s on network or token errors. */
export async function coreContactSubmit(
  config: HbConfig,
  data: ContactSubmitData,
): Promise<{ status: number }> {
  try {
    return await attempt(config, data);
  } catch (err) {
    if (err instanceof HbError) {
      // Retry once on token errors (e.g. 401 race) and network failures.
      // Other HbErrors (400, 429, 500) are not retried.
      if (err.code !== "TOKEN_ERROR" && err.code !== "NETWORK_ERROR") throw err;
      await new Promise<void>((resolve) => setTimeout(resolve, 2000));
      try {
        return await attempt(config, data);
      } catch (retryErr) {
        if (retryErr instanceof HbError) throw retryErr;
        throw new HbError("NETWORK_ERROR", "Network error");
      }
    }
    // Raw fetch threw (network error) — retry once after 2 s
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    try {
      return await attempt(config, data);
    } catch (retryErr) {
      if (retryErr instanceof HbError) throw retryErr;
      throw new HbError("NETWORK_ERROR", "Network error");
    }
  }
}
