import { Worker } from "bullmq";
import { prisma } from "@cultivated-crm/db";
import { MAX_AUTOMATION_DEPTH, can } from "@cultivated-crm/shared";
import { connection, emailQueue, notificationQueue, automationQueue } from "../queues";

export const automationWorker = new Worker(
  "automation",
  async (job) => {
    const { trigger, entityType, entityId, changes, depth = 0 } = job.data;

    // ─── LOOP DETECTION ─────────────────────────────────────
    if (depth >= MAX_AUTOMATION_DEPTH) {
      console.warn(
        `⚠️ Automation loop detected: ${entityType}:${entityId} at depth ${depth}`
      );
      await prisma.automationLog.create({
        data: {
          automationId: "system",
          status: "skipped",
          entityType,
          entityId,
          error: `Loop detected at depth ${depth}`,
        },
      });
      return;
    }

    // Find matching automations
    const automations = await prisma.automation.findMany({
      where: { trigger, isActive: true },
    });

    for (const automation of automations) {
      try {
        // ─── IDEMPOTENCY CHECK ────────────────────────────
        const idempotencyKey = `automation:exec:${automation.id}:${entityId}:${job.id}`;
        const isNew = await connection.set(idempotencyKey, "1", "EX", 3600, "NX");
        if (!isNew) {
          console.log(`⏭️ Skipping duplicate: ${automation.id} for ${entityId}`);
          continue;
        }

        // ─── PERMISSION CHECK ─────────────────────────────
        let creatorRole = "ADMIN";
        if (automation.createdBy) {
          const creator = await prisma.user.findUnique({
            where: { id: automation.createdBy },
            select: { role: true },
          });
          creatorRole = creator?.role ?? "MEMBER";
        }

        // Verify the creator can update this entity type
        if (!can(creatorRole as any, "update", entityType as any)) {
          console.warn(
            `🚫 Permission denied: automation ${automation.id} creator lacks ${entityType}:update`
          );
          await prisma.automationLog.create({
            data: {
              automationId: automation.id,
              status: "skipped",
              entityType,
              entityId,
              error: `Creator role ${creatorRole} lacks permission`,
            },
          });
          continue;
        }

        // Evaluate conditions
        const entity = await (prisma as any)[entityType].findUnique({
          where: { id: entityId },
        });
        if (!entity) continue;
        if (!matchesConditions(entity, automation.conditions)) continue;

        // Parse versioned actions
        const actions =
          typeof automation.actions === "object" &&
          "version" in (automation.actions as any)
            ? (automation.actions as any).data
            : automation.actions;

        // Execute actions
        for (const action of actions as any[]) {
          switch (action.type) {
            case "create_task":
              await prisma.task.create({
                data: {
                  title: action.config.title,
                  assigneeId: action.config.assigneeId ?? entity.ownerId,
                  dealId: entityType === "deal" ? entityId : undefined,
                  dueDate: action.config.dueDays
                    ? new Date(
                        Date.now() + action.config.dueDays * 86400000
                      )
                    : undefined,
                  creatorId: automation.createdBy ?? "system",
                  isAutomated: true,
                },
              });
              break;

            case "send_email":
              await emailQueue.add(
                "send-email",
                {
                  to: action.config.to,
                  subject: interpolate(action.config.subject, entity),
                  body: interpolate(action.config.body, entity),
                  contactId: entity.contactId,
                },
                {
                  jobId: `email:${automation.id}:${entityId}:${action.config.to}:${new Date().toISOString().slice(0, 10)}`,
                }
              );
              break;

            case "send_notification":
              await notificationQueue.add(
                "send",
                {
                  userId: action.config.userId ?? entity.ownerId,
                  title: interpolate(action.config.title, entity),
                  body: interpolate(action.config.body, entity),
                  entityType,
                  entityId,
                },
                {
                  jobId: `notif:${automation.id}:${entityId}:${Date.now()}`,
                }
              );
              break;

            case "update_field":
              await (prisma as any)[entityType].update({
                where: { id: entityId },
                data: { [action.config.field]: action.config.value },
              });
              // Re-enqueue with incremented depth
              await automationQueue.add("evaluate-trigger", {
                trigger: `${entityType.toUpperCase()}_UPDATED`,
                entityType,
                entityId,
                changes: {
                  [action.config.field]: {
                    old: entity[action.config.field],
                    new: action.config.value,
                  },
                },
                depth: depth + 1,
              });
              break;
          }
        }

        // Log success
        await prisma.automationLog.create({
          data: {
            automationId: automation.id,
            status: "success",
            entityType,
            entityId,
          },
        });

        await prisma.automation.update({
          where: { id: automation.id },
          data: { runCount: { increment: 1 }, lastRunAt: new Date() },
        });
      } catch (error) {
        console.error(
          `❌ Automation ${automation.id} failed for ${entityId}:`,
          error
        );
        await prisma.automationLog.create({
          data: {
            automationId: automation.id,
            status: "failed",
            entityType,
            entityId,
            error: (error as Error).message,
          },
        });
      }
    }
  },
  { connection, concurrency: 5 }
);

// ─── HELPERS ──────────────────────────────────────────────────

function matchesConditions(entity: any, conditions: any): boolean {
  // Parse versioned envelope
  const conditionList =
    typeof conditions === "object" && "version" in conditions
      ? conditions.data
      : conditions;

  if (!Array.isArray(conditionList) || conditionList.length === 0) return true;

  return conditionList.every((condition: any) => {
    const value = entity[condition.field];

    switch (condition.operator) {
      case "equals":
        return value === condition.value;
      case "not_equals":
        return value !== condition.value;
      case "contains":
        return String(value).includes(String(condition.value));
      case "gt":
        return Number(value) > Number(condition.value);
      case "lt":
        return Number(value) < Number(condition.value);
      case "gte":
        return Number(value) >= Number(condition.value);
      case "lte":
        return Number(value) <= Number(condition.value);
      case "in":
        return Array.isArray(condition.value) && condition.value.includes(value);
      case "is_empty":
        return !value;
      case "is_not_empty":
        return !!value;
      default:
        return true;
    }
  });
}

function interpolate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
  });
}
