import { z } from "zod";

// Base client for the RISEx API, always routed through the Next proxy so the
// upstream key stays server-side.

const BASE = "/api/proxy";

export const DEFAULT_ENV = "mainnet";

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(path: string, params?: QueryParams): string {
  const usp = new URLSearchParams();
  // Default env on every call unless explicitly overridden.
  if (!params || params.env === undefined) usp.set("env", DEFAULT_ENV);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      usp.set(k, String(v));
    }
  }
  const qs = usp.toString();
  return `${BASE}/${path.replace(/^\//, "")}${qs ? `?${qs}` : ""}`;
}

/** Fetch + zod-validate a response. Throws ApiError on non-2xx. */
export async function apiGet<T>(
  path: string,
  schema: z.ZodType<T>,
  params?: QueryParams,
): Promise<T> {
  const url = buildUrl(path, params);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.message || j.error || detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  const json = await res.json();
  return schema.parse(json);
}
