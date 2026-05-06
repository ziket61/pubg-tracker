import { NextResponse, type NextRequest } from "next/server";
import { proxyPubgRequest } from "@/lib/pubg/proxy";
import { checkPerIpRate, originAllowed } from "@/lib/pubg/guard";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if (!originAllowed(req)) {
    return NextResponse.json(
      { error: "forbidden", reason: "origin_not_allowed" },
      { status: 403 },
    );
  }

  const rate = checkPerIpRate(req);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: rate.retryAfter, scope: "client" },
      {
        status: 429,
        headers: {
          "retry-after": String(rate.retryAfter),
          "x-rate-limit-scope": "client",
        },
      },
    );
  }

  const { path } = await ctx.params;
  const url = new URL(req.url);
  const result = await proxyPubgRequest("/" + path.join("/"), url.searchParams);

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      ...result.headers,
      "x-client-rate-remaining": String(rate.remaining),
    },
  });
}
