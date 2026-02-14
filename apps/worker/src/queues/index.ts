import { Queue, QueueEvents, type JobsOptions } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(
  process.env.REDIS_QUEUE_URL ||
    process.env.REDIS_URL ||
    "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

// ─── DEFAULT JOB OPTIONS ──────────────────────────────────────
// Every queue inherits these unless overridden per-job.

const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 3000, // 3s → 6s → 12s → 24s → 48s
  },
  removeOnComplete: { age: 7 * 24 * 3600, count: 2000 }, // keep 7d / 2k
  removeOnFail: { age: 30 * 24 * 3600, count: 5000 }, // keep 30d / 5k
};

// ─── DEAD-LETTER QUEUE ────────────────────────────────────────
// Jobs that exhaust all retries land here for manual inspection.

export const deadLetterQueue = new Queue("dead-letter", {
  connection,
  defaultJobOptions: {
    attempts: 1, // don't retry DLQ jobs
    removeOnComplete: { age: 90 * 24 * 3600 }, // keep 90 days
    removeOnFail: false, // never auto-delete failed DLQ jobs
  },
});

// ─── QUEUE DEFINITIONS ────────────────────────────────────────

export const emailQueue = new Queue("email", {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3, // emails fail fast — 3 tries max
  },
});

export const automationQueue = new Queue("automation", {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
  },
});

export const syncQueue = new Queue("sync", {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
  },
});

export const notificationQueue = new Queue("notification", {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
  },
});

export const analyticsQueue = new Queue("analytics", {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
  },
});

// ─── IDEMPOTENCY HELPER ──────────────────────────────────────
// Prevents duplicate jobs within a TTL window.
// Usage: await enqueueOnce(emailQueue, "send-email", data, "email:contact:123")

export async function enqueueOnce(
  queue: Queue,
  name: string,
  data: Record<string, unknown>,
  idempotencyKey: string,
  ttlSeconds = 300,
): Promise<boolean> {
  const lockKey = `idempotent:${queue.name}:${idempotencyKey}`;
  const acquired = await connection.set(lockKey, "1", "EX", ttlSeconds, "NX");
  if (!acquired) return false; // duplicate — skip

  await queue.add(name, data);
  return true;
}

// ─── DLQ FORWARDER ────────────────────────────────────────────
// Attach to each queue to forward permanently failed jobs to DLQ.

function attachDLQ(queue: Queue) {
  const events = new QueueEvents(queue.name, {
    connection: connection.duplicate(),
  });
  events.on("failed", async ({ jobId, failedReason }) => {
    const job = await queue.getJob(jobId);
    if (!job) return;

    // Only forward if all attempts exhausted
    if (job.attemptsMade >= (job.opts.attempts ?? 5)) {
      await deadLetterQueue.add("failed-job", {
        originalQueue: queue.name,
        originalJobId: jobId,
        originalJobName: job.name,
        originalData: job.data,
        failedReason,
        attemptsMade: job.attemptsMade,
        failedAt: new Date().toISOString(),
      });
      console.error(
        `☠️  [${queue.name}] Job ${jobId} moved to DLQ after ${job.attemptsMade} attempts: ${failedReason}`,
      );
    }
  });
}

// ─── RECURRING JOBS ───────────────────────────────────────────

export async function setupRecurringJobs() {
  // Attach DLQ forwarders
  [
    emailQueue,
    automationQueue,
    syncQueue,
    notificationQueue,
    analyticsQueue,
  ].forEach(attachDLQ);

  // Pipeline stats refresh — every 2 hours
  await analyticsQueue.add(
    "refresh-pipeline-stats",
    {},
    { repeat: { every: 2 * 60 * 60 * 1000 } },
  );

  // Daily pipeline snapshot — 2 AM
  await analyticsQueue.add(
    "daily-pipeline-snapshot",
    {},
    { repeat: { pattern: "0 2 * * *" } },
  );

  // Overdue task check — every 30 minutes
  await notificationQueue.add(
    "check-overdue-tasks",
    {},
    { repeat: { every: 30 * 60 * 1000 } },
  );

  // Stale deal check (no activity in X days) — daily at 9 AM
  await automationQueue.add(
    "check-stale-deals",
    {},
    { repeat: { pattern: "0 9 * * *" } },
  );

  console.log("📅 Recurring jobs scheduled");
}
