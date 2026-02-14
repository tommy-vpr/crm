import { NextResponse } from "next/server";

// ─── RATE LIMITER ─────────────────────────────────────────────
// Sliding window rate limiter with two backends:
//
// 1. Redis (production) — uses REDIS_CACHE_URL for distributed limiting
//    Works across Vercel lambdas / regions / edge instances
//
// 2. In-memory fallback (dev) — when Redis is not configured
//    Fine for single-instance / local development
//
// To enable Redis: set REDIS_CACHE_URL in apps/web/.env.local

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

// ─── PRESETS ──────────────────────────────────────────────────

export const RATE_LIMITS = {
  /** Standard API endpoints: 60 req / 60s */
  standard: { limit: 60, windowSeconds: 60 } as RateLimitConfig,
  /** Write-heavy endpoints (create/update): 30 req / 60s */
  write: { limit: 30, windowSeconds: 60 } as RateLimitConfig,
  /** Search / autocomplete: 30 req / 60s */
  search: { limit: 30, windowSeconds: 60 } as RateLimitConfig,
  /** Export (expensive): 5 req / 60s */
  export: { limit: 5, windowSeconds: 60 } as RateLimitConfig,
  /** Bulk operations: 10 req / 60s */
  bulk: { limit: 10, windowSeconds: 60 } as RateLimitConfig,
  /** Auth endpoints: 10 req / 60s */
  auth: { limit: 10, windowSeconds: 60 } as RateLimitConfig,
} as const;

// ─── REDIS BACKEND ────────────────────────────────────────────
// Lazy-initialized on first use. Uses sorted sets for sliding window.

let redisClient: any = null;
let redisAttempted = false;

async function getRedis(): Promise<any | null> {
  if (redisAttempted) return redisClient;
  redisAttempted = true;

  const url = process.env.REDIS_CACHE_URL;
  if (!url) return null;

  try {
    // Dynamic import so this doesn't break if ioredis isn't installed
    const Redis = (await import("ioredis")).default;
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    await redisClient.connect();
    console.log("[rate-limit] Redis backend connected");
    return redisClient;
  } catch (err) {
    console.warn("[rate-limit] Redis unavailable, using in-memory fallback:", (err as Error).message);
    redisClient = null;
    return null;
  }
}

async function checkRedisRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = await getRedis();
  if (!redis) return { allowed: true, remaining: config.limit, resetAt: 0 }; // fallback

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = now - windowMs;

  const multi = redis.multi();
  // Remove expired entries
  multi.zremrangebyscore(key, 0, windowStart);
  // Count current entries
  multi.zcard(key);
  // Add current request
  multi.zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 8)}`);
  // Set TTL on the key
  multi.expire(key, config.windowSeconds + 1);

  const results = await multi.exec();
  const count = results?.[1]?.[1] as number ?? 0;

  if (count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + windowMs,
    };
  }

  return {
    allowed: true,
    remaining: config.limit - count - 1,
    resetAt: now + windowMs,
  };
}

// ─── IN-MEMORY BACKEND (fallback) ─────────────────────────────

interface MemEntry {
  timestamps: number[];
}

const memStore = new Map<string, MemEntry>();

// Cleanup stale entries every 5 minutes
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const cutoff = Date.now() - 120_000;
    for (const [k, entry] of memStore) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) memStore.delete(k);
    }
  };
  // Avoid duplicate intervals in hot reload
  if (!(globalThis as any).__rateLimitCleanup) {
    (globalThis as any).__rateLimitCleanup = setInterval(cleanup, 5 * 60 * 1000);
  }
}

function checkMemoryRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = now - windowMs;

  let entry = memStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memStore.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= config.limit) {
    const oldest = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + windowMs,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: config.limit - entry.timestamps.length,
    resetAt: now + windowMs,
  };
}

// ─── PUBLIC API ───────────────────────────────────────────────

/**
 * Check rate limit for a given key.
 * Tries Redis first, falls back to in-memory.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: true; remaining: number; resetAt: number } | NextResponse> {
  let result: { allowed: boolean; remaining: number; resetAt: number };

  // Try Redis
  if (process.env.REDIS_CACHE_URL) {
    result = await checkRedisRateLimit(key, config);
  } else {
    result = checkMemoryRateLimit(key, config);
  }

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests", retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  return { allowed: true, remaining: result.remaining, resetAt: result.resetAt };
}

/**
 * Extract a rate-limit key from a request.
 */
export function rateLimitKey(
  req: Request,
  prefix: string,
  userId?: string
): string {
  if (userId) return `rl:${prefix}:u:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `rl:${prefix}:ip:${ip}`;
}
