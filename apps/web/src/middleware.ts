import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";
import { NextResponse } from "next/server";
const { auth } = NextAuth(authConfig);

// ─── SECURITY HEADERS ────────────────────────────────────────
// Applied to all matched routes. Equivalent to helmet.js but edge-compatible.

function applySecurityHeaders(response: NextResponse) {
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME-type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Block reflected XSS
  response.headers.set("X-XSS-Protection", "1; mode=block");
  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy — disable dangerous browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  // Strict transport security (HTTPS only in production)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  // Content Security Policy — env-aware: strict in prod, relaxed in dev
  const isProd = process.env.NODE_ENV === "production";
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      isProd
        ? "script-src 'self' 'unsafe-inline' https://cdn.ably.com"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.ably.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.ably.io https://*.ably.net https://*.ably-realtime.com wss://*.ably.io wss://*.ably.net wss://*.ably-realtime.com https://accounts.google.com",
      "frame-src 'self' https://accounts.google.com",
    ].join("; "),
  );

  return response;
}

// ─── CORS ─────────────────────────────────────────────────────
// Only allow requests from our own origin in production.

function applyCors(response: NextResponse, origin: string | null) {
  const allowedOrigins = [process.env.NEXTAUTH_URL || "http://localhost:3000"];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (process.env.NODE_ENV === "development") {
    response.headers.set("Access-Control-Allow-Origin", origin || "*");
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

// ─── AUTH + HEADERS ───────────────────────────────────────────

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  // Handle preflight
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    applyCors(res, origin);
    return res;
  }

  // Auth check for protected routes
  if (!req.auth) {
    // API routes return 401, pages redirect to login
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return applySecurityHeaders(applyCors(res, origin));
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  applyCors(response, origin);
  return response;
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/deals/:path*",
    "/contacts/:path*",
    "/companies/:path*",
    "/pipeline/:path*",
    "/tasks/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/api/contacts/:path*",
    "/api/companies/:path*",
    "/api/deals/:path*",
    "/api/tasks/:path*",
    "/api/activities/:path*",
    "/api/pipelines/:path*",
    "/api/analytics/:path*",
    "/api/notifications/:path*",
    "/api/search/:path*",
    "/api/export/:path*",
    "/api/bulk/:path*",
    "/api/users/:path*",
    "/api/teams/:path*",
    "/api/ably-token",
  ],
};
