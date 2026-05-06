import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./src/lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const intlResponse = intlMiddleware(req);

  const isRedirect = intlResponse.headers.get("location") !== null;
  if (isRedirect) {
    return intlResponse;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);

  const intlRewrite = intlResponse.headers.get("x-middleware-rewrite");

  if (intlRewrite) {
    const rewritten = NextResponse.rewrite(new URL(intlRewrite), {
      request: { headers: requestHeaders },
    });
    intlResponse.headers.forEach((value, key) => {
      if (key === "x-middleware-rewrite" || key === "set-cookie") {
        rewritten.headers.set(key, value);
      }
    });
    return rewritten;
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
