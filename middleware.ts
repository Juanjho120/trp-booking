import { auth } from "@/auth";
import { ADMIN_ROLE } from "@/lib/auth/admin-access";
import { NextResponse } from "next/server";

const AUTH_SIGN_IN_PATH = "/api/auth/signin";
const ACCESS_DENIED_REDIRECT_PATH = "/";

function buildSignInUrl(origin: string, callbackUrl: string): URL {
  const signInUrl = new URL(AUTH_SIGN_IN_PATH, origin);
  signInUrl.searchParams.set("callbackUrl", callbackUrl);

  return signInUrl;
}

export default auth((request) => {
  const isAuthenticated = Boolean(request.auth?.user);
  const isAllowedAdmin = request.auth?.user?.role === ADMIN_ROLE;

  if (isAllowedAdmin) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(
      buildSignInUrl(request.nextUrl.origin, request.nextUrl.href),
    );
  }

  return NextResponse.redirect(
    new URL(ACCESS_DENIED_REDIRECT_PATH, request.nextUrl.origin),
  );
});

export const config = {
  matcher: ["/admin/:path*"],
};
