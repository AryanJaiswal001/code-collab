import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = new Set([
  "/",
  "/home",
  "/auth/sign-in",
  "/auth/error",
  "/privacy",
  "/signin",
  "/terms",
]);
const PUBLIC_PREFIXES = ["/playground"];
const STATIC_FILE_PATTERN =
  /\.(?:avif|css|gif|ico|jpeg|jpg|js|map|png|svg|txt|webp|xml)$/i;

function applyCrossOriginIsolationHeaders(response: NextResponse) {
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");

  return response;
}

function isPublicPath(pathname: string) {
  return (
    PUBLIC_ROUTES.has(pathname) ||
    PUBLIC_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

function isStaticPath(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    STATIC_FILE_PATTERN.test(pathname)
  );
}

function isSafePublicRequest(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isReadRequest =
    request.method === "GET" ||
    request.method === "HEAD" ||
    request.method === "OPTIONS";

  if (!isReadRequest) {
    return false;
  }

  return pathname === "/" || isPublicPath(pathname) || isStaticPath(pathname);
}

function getCanonicalAuthOrigin() {
  const authUrl = process.env.AUTH_URL?.trim();

  if (!authUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(authUrl);

    if (process.env.NODE_ENV !== "production") {
      return null;
    }

    if (
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1" ||
      parsedUrl.hostname === "::1"
    ) {
      return null;
    }

    if (process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "production") {
      return null;
    }

    return parsedUrl.origin;
  } catch {
    return null;
  }
}

const authProxy = auth((req, _event: NextFetchEvent) => {
  const { pathname } = req.nextUrl;
  const canonicalOrigin = getCanonicalAuthOrigin();

  if (canonicalOrigin && req.nextUrl.origin !== canonicalOrigin) {
    return applyCrossOriginIsolationHeaders(
      NextResponse.redirect(
        new URL(`${pathname}${req.nextUrl.search}`, canonicalOrigin),
      ),
    );
  }

  const isAuthenticated = !!req.auth;
  const isSignInPage = pathname === "/auth/sign-in";
  const requestedCallbackUrl = req.nextUrl.searchParams.get("callbackUrl");
  const callbackUrl =
    requestedCallbackUrl && requestedCallbackUrl.startsWith("/")
      ? requestedCallbackUrl
      : "/dashboard";

  if (pathname === "/home") {
    return applyCrossOriginIsolationHeaders(
      NextResponse.redirect(new URL("/", req.url)),
    );
  }

  if (isAuthenticated && isSignInPage) {
    return applyCrossOriginIsolationHeaders(
      NextResponse.redirect(new URL(callbackUrl, req.url)),
    );
  }

  if (!isAuthenticated && !isPublicPath(pathname)) {
    const signInUrl = new URL("/auth/sign-in", req.url);
    signInUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${req.nextUrl.search}`,
    );

    return applyCrossOriginIsolationHeaders(NextResponse.redirect(signInUrl));
  }

  return applyCrossOriginIsolationHeaders(NextResponse.next());
});

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  if (isSafePublicRequest(req)) {
    return applyCrossOriginIsolationHeaders(NextResponse.next());
  }

  return authProxy(req, event);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
