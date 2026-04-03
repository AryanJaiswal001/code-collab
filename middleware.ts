import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth/sign-in");

  if (!isAuthenticated && !isAuthPage) {
    if (req.nextUrl.pathname !== "/auth/sign-in") {
      return NextResponse.redirect(new URL("/auth/sign-in", req.url));
    }
  }

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  if (req.nextUrl.pathname === "/") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/auth/sign-in", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)",
  ],
};
