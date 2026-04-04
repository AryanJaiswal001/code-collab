import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = new Set(["/", "/home", "/auth/sign-in", "/auth/error"]);

function getCanonicalAuthOrigin() {
  const authUrl = process.env.AUTH_URL?.trim();

  if (!authUrl) {
    return null;
  }

  try {
    return new URL(authUrl).origin;
  } catch {
    return null;
  }
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const canonicalOrigin = getCanonicalAuthOrigin();

  if (canonicalOrigin && req.nextUrl.origin !== canonicalOrigin) {
    return NextResponse.redirect(
      new URL(`${pathname}${req.nextUrl.search}`, canonicalOrigin),
    );
  }

  const isAuthenticated = !!req.auth;
  const isSignInPage = pathname === "/auth/sign-in";
  const requestedCallbackUrl = req.nextUrl.searchParams.get("callbackUrl");
  const callbackUrl =
    requestedCallbackUrl && requestedCallbackUrl.startsWith("/")
      ? requestedCallbackUrl
      : "/dashboard";

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/home#home", req.url));
  }

  if (isAuthenticated && isSignInPage) {
    return NextResponse.redirect(new URL(callbackUrl, req.url));
  }

  if (!isAuthenticated && !PUBLIC_ROUTES.has(pathname)) {
    const signInUrl = new URL("/auth/sign-in", req.url);
    signInUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${req.nextUrl.search}`,
    );

    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png|.*\\.svg).*)",
  ],
};
