import "./env"; // Must be first — loads apps/worker/.env
import { setupRecurringJobs, connection } from "./queues";
import { automationWorker } from "./workers/automation.worker";
import { notificationWorker } from "./workers/notification.worker";
import { emailWorker } from "./workers/email.worker";
import { prisma } from "@cultivated-crm/db";

// ─── READINESS CHECKS ────────────────────────────────────────

async function checkReadiness() {
  const required = ["DATABASE_URL", "REDIS_QUEUE_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  // Ping Redis
  const redisPing = await connection.ping();
  if (redisPing !== "PONG") throw new Error("Redis ping failed");
  console.log("  ✓ Redis connected");

  // Ping Database
  await prisma.$queryRaw`SELECT 1`;
  console.log("  ✓ Database connected");

  // Ably (optional)
  if (process.env.ABLY_API_KEY) {
    console.log("  ✓ Ably key configured");
  } else {
    console.log("  ⚠ Ably key not set — real-time push disabled");
  }
}

// ─── MAIN ─────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting CRM workers...\n");
  console.log("── Readiness checks ──");
  await checkReadiness();
  console.log("");

  // Register recurring jobs
  await setupRecurringJobs();

  // Log worker status
  const workers = [
    { name: "automation", worker: automationWorker },
    { name: "notification", worker: notificationWorker },
    { name: "email", worker: emailWorker },
  ];

  for (const { name, worker } of workers) {
    worker.on("completed", (job) => {
      console.log(`✅ [${name}] Job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`❌ [${name}] Job ${job?.id} failed:`, err.message);
    });

    console.log(`  ✓ ${name} worker ready`);
  }

  console.log("\n🟢 All workers running. Waiting for jobs...\n");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down workers...`);
    await Promise.all(workers.map(({ worker }) => worker.close()));
    await prisma.$disconnect();
    console.log("Workers stopped. Exiting.");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Fatal error starting workers:", err);
  process.exit(1);
});
