import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { can } from "@cultivated-crm/shared";
import type { UserRole, Action, Resource } from "@cultivated-crm/shared";
import {
  checkRateLimit,
  rateLimitKey,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import type { RateLimitConfig } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
}

// ─── MAX REQUEST BODY SIZE ────────────────────────────────────
// Enforced at the handler level. Next.js serverActions.bodySizeLimit
// only applies to server actions, not API routes.
const MAX_BODY_BYTES = 1_048_576; // 1 MB

/**
 * Get authenticated user from session or return null.
 */
export async function getUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as AuthenticatedUser;
}

/**
 * Require authentication — returns user or throws 401 response.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getUser();
  if (!user) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

/**
 * Require a specific permission — returns user or throws 403.
 */
export async function requirePermission(
  action: Action,
  resource: Resource
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!can(user.role, action, resource)) {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}

interface HandlerOptions {
  /** Rate limit preset or custom config. Default: "standard" */
  rateLimit?: keyof typeof RATE_LIMITS | RateLimitConfig;
  /** Max body size in bytes. Default: 1 MB. Set 0 to skip. */
  maxBodyBytes?: number;
}

/**
 * Wrap an API handler with error handling, rate limiting, and body size check.
 */
export function apiHandler(
  handler: (req: NextRequest, ctx: any) => Promise<NextResponse>,
  options?: HandlerOptions
) {
  const rlConfig: RateLimitConfig =
    typeof options?.rateLimit === "object"
      ? options.rateLimit
      : RATE_LIMITS[options?.rateLimit ?? "standard"];

  const maxBody = options?.maxBodyBytes ?? MAX_BODY_BYTES;

  return async (req: NextRequest, ctx: any): Promise<NextResponse> => {
    try {
      // ─── RATE LIMIT ──────────────────────────────────────
      const user = await getUser();
      const key = rateLimitKey(req, req.nextUrl.pathname, user?.id);
      const rl = await checkRateLimit(key, rlConfig);

      if (rl instanceof NextResponse) return rl; // 429

      // ─── BODY SIZE CHECK ─────────────────────────────────
      if (maxBody > 0 && req.method !== "GET" && req.method !== "HEAD") {
        const contentLength = req.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > maxBody) {
          return NextResponse.json(
            { error: `Request body too large. Max: ${maxBody} bytes` },
            { status: 413 }
          );
        }
      }

      // ─── HANDLER ─────────────────────────────────────────
      const response = await handler(req, ctx);

      // Attach rate limit headers to successful responses
      response.headers.set("X-RateLimit-Limit", String(rlConfig.limit));
      response.headers.set("X-RateLimit-Remaining", String(rl.remaining));

      return response;
    } catch (error) {
      // If it's already a NextResponse (from requireUser/requirePermission), return it
      if (error instanceof NextResponse) return error;

      console.error("[API Error]", error);
      logger.error("Unhandled API error", {
        path: req.nextUrl.pathname,
        method: req.method,
        error: (error as Error).message,
        stack: (error as Error).stack?.split("\n").slice(0, 3).join(" ← "),
      });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Parse search params into a typed filter object.
 */
export function parseSearchParams(url: string) {
  const { searchParams } = new URL(url);
  return Object.fromEntries(searchParams.entries());
}
