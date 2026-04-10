import { sign } from "./signing";

export type HbErrorCode = "RATE_LIMITED" | "VALIDATION_ERROR" | "SERVER_ERROR" | "NETWORK_ERROR";

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
  readonly key: string;
}

export interface SubscribeData {
  email: string;
  firstName?: string;
  lastName?: string;
}

async function attempt(config: HbConfig, data: SubscribeData): Promise<{ status: number }> {
  const timestamp = Date.now();
  const signature = await sign(config.websiteId, config.key, timestamp);

  const res = await fetch(`/api/${config.websiteId}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      __hp: "",
      timestamp,
      signature,
    }),
  });

  if (res.ok) return { status: res.status };

  let code: HbErrorCode = "SERVER_ERROR";
  if (res.status === 429) code = "RATE_LIMITED";
  else if (res.status === 400) code = "VALIDATION_ERROR";

  let message = "Subscribe failed";
  try {
    const body = (await res.json()) as { message?: string };
    if (typeof body.message === "string") message = body.message;
  } catch {
    // ignore parse errors
  }

  throw new HbError(code, message, res.status);
}

/** POSTs a subscribe request. Retries once after 2 s on network errors only. */
export async function coreSubscribe(config: HbConfig, data: SubscribeData): Promise<{ status: number }> {
  try {
    return await attempt(config, data);
  } catch (err) {
    if (err instanceof HbError) throw err;
    // Network error (fetch threw) — retry once after 2 s
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    try {
      return await attempt(config, data);
    } catch (retryErr) {
      if (retryErr instanceof HbError) throw retryErr;
      throw new HbError("NETWORK_ERROR", "Network error");
    }
  }
}
