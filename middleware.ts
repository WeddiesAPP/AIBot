import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { isAuthConfigured } from "@/lib/auth-config";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/favicon.ico",
  "/icon.ico",
  "/manifest.json",
]);

const STATIC_PREFIXES = ["/_next", "/public", "/assets"];
const STATIC_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".txt",
]);

const getPathExtension = (pathname: string): string | null => {
  const lastDot = pathname.lastIndexOf(".");
  if (lastDot === -1) {
    return null;
  }
  return pathname.slice(lastDot).toLowerCase();
};

export async function middleware(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.has(pathname) ||
    STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    STATIC_EXTENSIONS.has(getPathExtension(pathname) ?? "")
  ) {
    return NextResponse.next();
  }

  const sessionCookieName = getSessionCookieName();
  const sessionCookie = request.cookies.get(sessionCookieName)?.value;
  const user = await verifySessionToken(sessionCookie);

  if (user) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/chat", request.url));
    }
    if (pathname === "/dashboard") {
      return NextResponse.redirect(new URL(user.dashboard, request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      { error: "Niet geautoriseerd" },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/login") {
    const requested =
      request.nextUrl.pathname + request.nextUrl.search;
    loginUrl.searchParams.set("from", requested);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/public).*)"],
  runtime: "nodejs",
};
