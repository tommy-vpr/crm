import "server-only";
import { Prisma, prisma } from "@cultivated-crm/db";
import type { CRMEvent } from "@cultivated-crm/shared";
import { logger } from "@/lib/logger";

interface PublishOptions {
  entityType: string;
  entityId: string;
  action: "created" | "updated" | "deleted" | "stage_changed" | "completed";
  userId: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  /** Team-scoped channels. Use buildChannels() to generate these. */
  channels: string[];
}

/**
 * Build team-scoped channel list for an entity event.
 * Replaces "crm:global" with specific, scoped channels.
 *
 * Channel scheme:
 *   user:{userId}    — always included (notifies the actor)
 *   team:{teamId}    — if entity has a team (scoped to team members)
 *   pipeline:{id}    — for deal events (kanban board subscribers)
 *   deal:{id}        — for deal detail page subscribers
 *   contact:{id}     — for contact detail page subscribers
 */
export function buildChannels(opts: {
  userId: string;
  teamId?: string | null;
  pipelineId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
}): string[] {
  const channels: string[] = [`user:${opts.userId}`];
  if (opts.teamId) channels.push(`team:${opts.teamId}`);
  if (opts.pipelineId) channels.push(`pipeline:${opts.pipelineId}`);
  if (opts.dealId) channels.push(`deal:${opts.dealId}`);
  if (opts.contactId) channels.push(`contact:${opts.contactId}`);
  return channels;
}

/**
 * Ably publish (no SDK).
 * This avoids bundling `ably` -> `got` -> `keyv` into the Next.js server build.
 */
async function publishToAbly(channel: string, name: string, data: unknown) {
  const key = process.env.ABLY_API_KEY;
  if (!key) return;

  const [keyName, keySecret] = key.split(":");
  if (!keyName || !keySecret) return;

  const auth = Buffer.from(`${keyName}:${keySecret}`).toString("base64");
  const url = `https://rest.ably.io/channels/${encodeURIComponent(channel)}/messages`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ name, data }),
      cache: "no-store",
    });
  } catch (err) {
    logger.error("[events] Ably publish failed", {
      channel,
      error: (err as Error).message,
    });
  }
}

/**
 * Publish a CRM event.
 * 1) Writes to audit log (best-effort — failures don't block the mutation)
 * 2) Publishes to Ably channels (fire-and-forget)
 */
export function publishEvent(options: PublishOptions) {
  const event: CRMEvent = {
    type: `${options.entityType}.${options.action}`,
    entityType: options.entityType as CRMEvent["entityType"],
    entityId: options.entityId,
    action: options.action,
    userId: options.userId,
    timestamp: Date.now(),
    changes: options.changes,
  };

  // 1) Audit log — best-effort, non-blocking
  //    If this fails, the main mutation still succeeds.
  prisma.auditLog
    .create({
      data: {
        userId: options.userId,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        changes: (options.changes ?? {}) as Prisma.InputJsonValue,
      },
    })
    .catch((err: Error) => {
      logger.error("[events] Audit log write failed", {
        entityType: options.entityType,
        entityId: options.entityId,
        error: err.message,
      });
    });

  // 2) Ably — fire-and-forget
  if (process.env.ABLY_API_KEY) {
    Promise.allSettled(
      options.channels.map((channel) =>
        publishToAbly(channel, event.type, event),
      ),
    ).then((results) => {
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        logger.error("[events] Ably publish failures", {
          count: failed.length,
        });
      }
    });
  }
}
