import { NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";

export const runtime = "nodejs";

/**
 * GET /api/health
 *
 * Public endpoint (no auth required) for uptime monitoring, load balancers,
 * and deployment readiness checks.
 *
 * Returns:
 * - status: "ok" | "degraded" | "error"
 * - checks: db, redis, env connectivity/config status
 * - timestamp, uptime, version, node
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // ─── Database ──────────────────────────────────────────
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.db = { ok: false, latencyMs: Date.now() - dbStart, error: (err as Error).message };
  }

  // ─── Redis (rate limiting) ─────────────────────────────
  if (process.env.REDIS_CACHE_URL) {
    const redisStart = Date.now();
    try {
      const Redis = (await import("ioredis")).default;
      const redis = new Redis(process.env.REDIS_CACHE_URL, {
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      await redis.connect();
      const pong = await redis.ping();
      await redis.quit();
      checks.redis = { ok: pong === "PONG", latencyMs: Date.now() - redisStart };
    } catch (err) {
      checks.redis = { ok: false, latencyMs: Date.now() - redisStart, error: (err as Error).message };
    }
  } else {
    checks.redis = { ok: true, error: "not configured (using in-memory fallback)" };
  }

  // ─── Required env vars ─────────────────────────────────
  const requiredEnv = ["DATABASE_URL", "NEXTAUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
  const missingEnv = requiredEnv.filter((k) => !process.env[k]);
  checks.env = missingEnv.length === 0
    ? { ok: true }
    : { ok: false, error: `Missing: ${missingEnv.join(", ")}` };

  // ─── Overall status ────────────────────────────────────
  // db + env are critical; redis is optional
  const critical = [checks.db, checks.env];
  const allCriticalOk = critical.every((c) => c.ok);
  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? "ok" : allCriticalOk ? "degraded" : "error";

  const body = {
    status,
    checks,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    region: process.env.VERCEL_REGION ?? "local",
    node: process.version,
  };

  return NextResponse.json(body, {
    status: allCriticalOk ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
