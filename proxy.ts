import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = new Set(["/", "/home", "/auth/sign-in"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const isSignInPage = pathname === "/auth/sign-in";

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/home#home", req.url));
  }

  if (isAuthenticated && isSignInPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!isAuthenticated && !PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.redirect(new URL("/auth/sign-in", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png|.*\\.svg).*)",
  ],
};
