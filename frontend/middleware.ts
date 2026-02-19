import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROLE_COOKIE_KEY } from "@/lib/auth/constants";
import { resolveRouteGuardRedirect } from "@/lib/auth/route-guard";

export function middleware(request: NextRequest) {
  const role = request.cookies.get(AUTH_ROLE_COOKIE_KEY)?.value ?? null;
  const pathAndQuery = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectPath = resolveRouteGuardRedirect(pathAndQuery, role);
  if (!redirectPath) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL(redirectPath, request.url));
}

export const config = {
  matcher: ["/teacher/:path*", "/student/:path*"]
};
