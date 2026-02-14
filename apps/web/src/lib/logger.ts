/**
 * Structured Logger
 *
 * Production: JSON lines (parseable by Vercel, Fly, Datadog, Sentry, etc.)
 * Development: Human-readable console output
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("User signed in", { userId: "abc", method: "google" });
 *   logger.error("Payment failed", { dealId: "xyz", error: err.message });
 *
 * Integrating Sentry (when ready):
 *   1. pnpm add @sentry/nextjs
 *   2. Add Sentry.init() in instrumentation.ts
 *   3. Update logger.error to call Sentry.captureException()
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  msg: string;
  timestamp: string;
  [key: string]: unknown;
}

const isProd = process.env.NODE_ENV === "production";

function formatEntry(level: LogLevel, msg: string, data?: Record<string, unknown>): LogEntry {
  return {
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...data,
  };
}

function emit(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  const entry = formatEntry(level, msg, data);

  if (isProd) {
    // JSON lines — structured, parseable by log aggregators
    const line = JSON.stringify(entry);
    switch (level) {
      case "error":
        console.error(line);
        break;
      case "warn":
        console.warn(line);
        break;
      default:
        console.log(line);
    }
  } else {
    // Dev — human-readable
    const prefix = { debug: "🔍", info: "ℹ️", warn: "⚠️", error: "❌" }[level];
    const extra = data ? ` ${JSON.stringify(data)}` : "";
    switch (level) {
      case "error":
        console.error(`${prefix} ${msg}${extra}`);
        break;
      case "warn":
        console.warn(`${prefix} ${msg}${extra}`);
        break;
      default:
        console.log(`${prefix} ${msg}${extra}`);
    }
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => emit("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => emit("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => emit("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => emit("error", msg, data),

  /**
   * Create a child logger with preset context fields.
   * Useful for adding requestId, userId, etc.
   *
   * const reqLog = logger.child({ requestId: "abc", route: "/api/deals" });
   * reqLog.info("Fetching deals"); // includes requestId + route automatically
   */
  child: (context: Record<string, unknown>) => ({
    debug: (msg: string, data?: Record<string, unknown>) => emit("debug", msg, { ...context, ...data }),
    info: (msg: string, data?: Record<string, unknown>) => emit("info", msg, { ...context, ...data }),
    warn: (msg: string, data?: Record<string, unknown>) => emit("warn", msg, { ...context, ...data }),
    error: (msg: string, data?: Record<string, unknown>) => emit("error", msg, { ...context, ...data }),
  }),
};
