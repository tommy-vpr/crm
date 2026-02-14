import { Worker } from "bullmq";
import { prisma } from "@cultivated-crm/db";
import Ably from "ably";
import { connection } from "../queues";

const ably = process.env.ABLY_API_KEY
  ? new Ably.Rest(process.env.ABLY_API_KEY)
  : null;

export const notificationWorker = new Worker(
  "notification",
  async (job) => {
    switch (job.name) {
      case "send": {
        const { userId, title, body, entityType, entityId, type } = job.data;

        // Create in DB
        const notification = await prisma.notification.create({
          data: {
            userId,
            title,
            body,
            type: type ?? "automation",
            entityType,
            entityId,
          },
        });

        // Push via Ably
        if (ably) {
          await ably.channels.get(`user:${userId}`).publish("notification", {
            type: "notification.created",
            entityType: "notification",
            entityId: notification.id,
            action: "created",
            userId: "system",
            timestamp: Date.now(),
          });
        }

        break;
      }

      case "check-overdue-tasks": {
        const overdueTasks = await prisma.task.findMany({
          where: {
            status: { in: ["TODO", "IN_PROGRESS"] },
            dueDate: { lt: new Date() },
          },
          include: { assignee: true },
        });

        for (const task of overdueTasks) {
          if (!task.assigneeId) continue;

          // Deduplicate: only notify once per task per day
          const existing = await prisma.notification.findFirst({
            where: {
              userId: task.assigneeId,
              entityType: "task",
              entityId: task.id,
              type: "task_overdue",
              createdAt: { gte: new Date(Date.now() - 86400000) },
            },
          });

          if (!existing) {
            await prisma.notification.create({
              data: {
                userId: task.assigneeId,
                title: "Task overdue",
                body: `"${task.title}" is past due`,
                type: "task_overdue",
                entityType: "task",
                entityId: task.id,
              },
            });

            if (ably) {
              await ably.channels
                .get(`user:${task.assigneeId}`)
                .publish("notification", {
                  type: "notification.created",
                  entityType: "notification",
                  action: "created",
                  userId: "system",
                  timestamp: Date.now(),
                });
            }
          }
        }

        console.log(`📋 Checked ${overdueTasks.length} overdue tasks`);
        break;
      }
    }
  },
  { connection, concurrency: 10 }
);
