import { NextRequest, NextResponse } from "next/server";
import { mockResponse } from "@/lib/mock/fixtures";

// Server-side proxy to the RISEx Analytics API. Keeps the upstream bearer key
// off the browser; the dashboard itself is public and read-only.
//
//   GET /api/proxy/<rest>?<query>  →  ${RISEX_API_URL}/api/v1/<rest>?<query>
//
// Env:
//   RISEX_API_URL  base url of risex-api (default http://localhost:8080)
//   RISEX_API_KEY  bearer key (optional; omitted when upstream auth is disabled)

const API_URL = process.env.RISEX_API_URL || "http://localhost:8080";
const API_KEY = process.env.RISEX_API_KEY || "";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const rest = (path || []).join("/");
  const search = req.nextUrl.search; // includes leading "?" or ""

  // Mock mode: serve deterministic fixtures (review / tests without a warehouse).
  if (process.env.RISEX_API_MOCK === "1") {
    const mock = mockResponse(rest, req.nextUrl.searchParams);
    if (mock !== undefined) {
      return NextResponse.json(mock);
    }
    return NextResponse.json(
      { error: "not_found", message: `no mock for ${rest}` },
      { status: 404 },
    );
  }

  const target = `${API_URL}/api/v1/${rest}${search}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;

  try {
    const upstream = await fetch(target, {
      headers,
      // Always hit upstream; caching is handled client-side by TanStack Query.
      cache: "no-store",
    });

    const body = await upstream.text();
    const contentType =
      upstream.headers.get("content-type") || "application/json";

    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "upstream_unreachable",
        message: err instanceof Error ? err.message : String(err),
        target,
      },
      { status: 502 },
    );
  }
}
