/**
 * Next.js Instrumentation Hook
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Runs ONCE when the Next.js server starts. Used for:
 * 1. Environment validation (fail fast in production)
 * 2. Observability init (Sentry, OpenTelemetry)
 */

// ─── ENV VALIDATION ──────────────────────────────────────────

interface EnvRequirement {
  key: string;
  required: boolean; // true = fatal in prod, false = warning
  hint?: string;
}

const ENV_REQUIREMENTS: EnvRequirement[] = [
  // Auth (fatal — app won't work without these)
  { key: "DATABASE_URL", required: true },
  {
    key: "NEXTAUTH_SECRET",
    required: true,
    hint: "Run: openssl rand -base64 32",
  },
  {
    key: "GOOGLE_CLIENT_ID",
    required: true,
    hint: "Create at console.cloud.google.com",
  },
  { key: "GOOGLE_CLIENT_SECRET", required: true },

  // Recommended (warnings)
  {
    key: "NEXTAUTH_URL",
    required: false,
    hint: "Set to your app URL (e.g. https://crm.cultivatedagency.com)",
  },
  {
    key: "DIRECT_URL",
    required: false,
    hint: "Required for Supabase/PgBouncer. Can match DATABASE_URL for local dev.",
  },
  {
    key: "ABLY_API_KEY",
    required: false,
    hint: "Real-time features disabled without this",
  },
  {
    key: "REDIS_CACHE_URL",
    required: false,
    hint: "Rate limiting falls back to in-memory without this",
  },
];

function validateEnv() {
  const isProd = process.env.NODE_ENV === "production";
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const { key, required, hint } of ENV_REQUIREMENTS) {
    if (!process.env[key]) {
      const msg = hint ? `${key} — ${hint}` : key;
      if (required) {
        missing.push(msg);
      } else {
        warnings.push(msg);
      }
    }
  }

  // Warnings (always log, never fatal)
  if (warnings.length > 0) {
    console.warn(
      `[env] ⚠️  Optional env vars not set:\n${warnings.map((w) => `  · ${w}`).join("\n")}`,
    );
  }

  // Required vars missing
  if (missing.length > 0) {
    const message = `[env] Missing required env vars:\n${missing.map((m) => `  ✗ ${m}`).join("\n")}`;

    if (isProd) {
      console.error(message);
      throw new Error(
        "[env] ❌ Refusing to start with missing env vars in production.",
      );
    } else {
      // Warning in dev — let it boot but log clearly
      console.warn(
        `${message}\n[env] ⚠️  Running anyway (dev mode). Some features will fail.`,
      );
    }
  } else {
    console.log("[env] ✅ All required env vars present");
  }
}

// ─── REGISTER ─────────────────────────────────────────────────

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[instrumentation] Server starting...");

    // 1. Validate env vars (fail fast in prod)
    validateEnv();

    // 2. Sentry (uncomment when ready)
    // ─────────────────────────────────────────────────────────
    // const Sentry = await import("@sentry/nextjs");
    // Sentry.init({
    //   dsn: process.env.SENTRY_DSN,
    //   environment: process.env.NODE_ENV,
    //   tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    //   enabled: process.env.NODE_ENV === "production",
    // });

    console.log("[instrumentation] ✅ Server initialized");
  }
}
