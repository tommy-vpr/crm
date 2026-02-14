import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { CreateTaskSchema } from "@cultivated-crm/shared";
import { apiHandler, requirePermission, parseSearchParams } from "@/lib/api-utils";
import { publishEvent, buildChannels } from "@/lib/events";
import { scopeWhere } from "@/lib/authorization";

export const runtime = "nodejs";

// GET /api/tasks — list with filters (SCOPED)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("read", "contact");
  const params = parseSearchParams(req.url);
  const scope = await scopeWhere(user);

  const where: any = { ...scope.task };

  if (params.assigneeId) where.assigneeId = params.assigneeId;
  if (params.status) where.status = params.status;
  if (params.priority) where.priority = params.priority;
  if (params.dealId) where.dealId = params.dealId;
  if (params.contactId) where.contactId = params.contactId;

  if (params.search) {
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: [
          { title: { contains: params.search, mode: "insensitive" } },
          { description: { contains: params.search, mode: "insensitive" } },
        ],
      },
    ];
  }

  if (params.overdue === "true") {
    where.dueDate = { lt: new Date() };
    where.status = { in: ["TODO", "IN_PROGRESS"] };
  }

  if (params.mine === "true") {
    where.assigneeId = user.id;
  }

  const limit = Math.min(Number(params.limit) || 50, 200);
  const offset = Number(params.offset) || 0;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true, image: true } },
        creator: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: [
        { status: "asc" },
        { dueDate: { sort: "asc", nulls: "last" } },
        { priority: "desc" },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json({ tasks, total, limit, offset });
});

// POST /api/tasks — create
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("create", "contact");
  const body = await req.json();
  const data = CreateTaskSchema.parse(body);

  const task = await prisma.task.create({
    data: {
      ...(data as any),
      creatorId: user.id,
      assigneeId: data.assigneeId ?? user.id,
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true, image: true } },
      creator: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  publishEvent({
    entityType: "task",
    entityId: task.id,
    action: "created",
    userId: user.id,
    channels: buildChannels({ userId: user.id }),
  });

  return NextResponse.json(task, { status: 201 });
});
