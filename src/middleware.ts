import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)"
  );

  // Cache-Control for API routes
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    // User-specific endpoints: never cache
    if (
      pathname.startsWith("/api/auth/") ||
      pathname.startsWith("/api/users/") ||
      pathname.startsWith("/api/favorites") ||
      pathname.startsWith("/api/recognize") ||
      pathname.startsWith("/api/notifications")
    ) {
      response.headers.set("Cache-Control", "private, no-store");
    }
    // Public read-only endpoints: CDN cacheable
    else if (
      pathname.match(/^\/api\/dishes\/[^/]+$/) ||
      pathname.match(/^\/api\/restaurants\/[^/]+$/) ||
      pathname.match(/^\/api\/restaurants\/[^/]+\/menu$/) ||
      pathname.startsWith("/api/discover/")
    ) {
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600"
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
