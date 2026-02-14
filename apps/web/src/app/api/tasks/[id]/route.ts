import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { UpdateTaskSchema } from "@cultivated-crm/shared";
import { apiHandler, requirePermission } from "@/lib/api-utils";
import { publishEvent, buildChannels } from "@/lib/events";
import { canAccessTask, denyAccess } from "@/lib/authorization";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// GET /api/tasks/:id (scoped)
export const GET = apiHandler(async (_req: NextRequest, { params }: Params) => {
  const user = await requirePermission("read", "contact");
  const { id } = await params;

  if (!(await canAccessTask(user, id))) denyAccess();

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true, image: true } },
      creator: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
});

// PATCH /api/tasks/:id (scoped)
export const PATCH = apiHandler(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission("update", "contact");
  const { id } = await params;

  if (!(await canAccessTask(user, id))) denyAccess();

  const body = await req.json();
  const data = UpdateTaskSchema.parse(body);

  const old = await prisma.task.findUniqueOrThrow({ where: { id } });

  const updateData: any = { ...data };
  if (data.status === "DONE" && old.status !== "DONE") {
    updateData.completedAt = new Date();
  } else if (data.status && data.status !== "DONE" && old.status === "DONE") {
    updateData.completedAt = null;
  }

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true, image: true } },
      creator: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  if (data.status === "DONE" && old.status !== "DONE") {
    await prisma.activity.create({
      data: {
        type: "TASK_COMPLETED",
        title: `Task completed: "${task.title}"`,
        dealId: task.dealId ?? undefined,
        contactId: task.contactId ?? undefined,
        userId: user.id,
      },
    });
  }

  publishEvent({
    entityType: "task",
    entityId: id,
    action: data.status === "DONE" ? "completed" : "updated",
    userId: user.id,
    channels: buildChannels({ userId: user.id }),
  });

  return NextResponse.json(task);
});

// DELETE /api/tasks/:id (scoped)
export const DELETE = apiHandler(async (_req: NextRequest, { params }: Params) => {
  const user = await requirePermission("delete", "contact");
  const { id } = await params;

  if (!(await canAccessTask(user, id))) denyAccess();

  await prisma.task.delete({ where: { id } });

  publishEvent({
    entityType: "task",
    entityId: id,
    action: "deleted",
    userId: user.id,
    channels: buildChannels({ userId: user.id }),
  });

  return NextResponse.json({ success: true });
});
