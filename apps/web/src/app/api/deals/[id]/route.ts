import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@cultivated-crm/db";
import { UpdateDealSchema } from "@cultivated-crm/shared";
import { apiHandler, requirePermission } from "@/lib/api-utils";
import { publishEvent, buildChannels } from "@/lib/events";
import { canAccessDeal, validateTeamMembership, denyAccess } from "@/lib/authorization";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// GET /api/deals/:id — full detail (scoped)
export const GET = apiHandler(async (_req: NextRequest, { params }: Params) => {
  const user = await requirePermission("read", "deal");
  const { id } = await params;

  // P0: Row-level access check
  if (!(await canAccessDeal(user, id))) denyAccess();

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      stage: true,
      pipeline: {
        include: {
          stages: { orderBy: { position: "asc" } },
        },
      },
      owner: { select: { id: true, name: true, email: true, avatarUrl: true, image: true } },
      company: { select: { id: true, name: true, domain: true } },
      contacts: {
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              title: true,
              phone: true,
            },
          },
        },
      },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 30,
        include: { user: { select: { id: true, name: true } } },
      },
      tasks: {
        where: { status: { in: ["TODO", "IN_PROGRESS"] } },
        orderBy: { dueDate: "asc" },
        include: { assignee: { select: { id: true, name: true } } },
      },
      tags: { include: { tag: true } },
      _count: { select: { activities: true, tasks: true, contacts: true } },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json(deal);
});

// PATCH /api/deals/:id — update fields (scoped + teamId validation)
export const PATCH = apiHandler(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission("update", "deal");
  const { id } = await params;

  if (!(await canAccessDeal(user, id))) denyAccess();

  const body = await req.json();
  const { contactIds, ...data } = UpdateDealSchema.parse(body);

  // P0: Prevent teamId spoofing on update
  if (data.teamId) await validateTeamMembership(user.id, data.teamId);

  const old = await prisma.deal.findUniqueOrThrow({ where: { id } });

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      title: data.title,
      value: data.value,
      currency: data.currency,
      stageId: data.stageId,
      pipelineId: data.pipelineId,
      companyId: data.companyId,
      teamId: data.teamId,
      priority: data.priority,
      expectedCloseDate: data.expectedCloseDate,
      description: data.description,
      customFields: data.customFields as any,
    },
    include: {
      stage: { select: { id: true, name: true, color: true, position: true, isWon: true, isLost: true } },
      owner: { select: { id: true, name: true, avatarUrl: true, image: true } },
      company: { select: { id: true, name: true } },
      contacts: {
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(data) as (keyof typeof data)[]) {
    if (data[key] !== undefined && (old as any)[key] !== data[key]) {
      changes[key] = { old: (old as any)[key], new: data[key] };
    }
  }

  if (Object.keys(changes).length > 0) {
    publishEvent({
      entityType: "deal",
      entityId: id,
      action: "updated",
      userId: user.id,
      changes,
      channels: buildChannels({
        userId: user.id,
        teamId: deal.teamId,
        pipelineId: deal.pipelineId,
        dealId: id,
      }),
    });
  }

  return NextResponse.json(deal);
});

// DELETE /api/deals/:id (scoped)
export const DELETE = apiHandler(async (_req: NextRequest, { params }: Params) => {
  const user = await requirePermission("delete", "deal");
  const { id } = await params;

  if (!(await canAccessDeal(user, id))) denyAccess();

  const deal = await prisma.deal.delete({ where: { id } });

  publishEvent({
    entityType: "deal",
    entityId: id,
    action: "deleted",
    userId: user.id,
    channels: buildChannels({
      userId: user.id,
      teamId: deal.teamId,
      pipelineId: deal.pipelineId,
    }),
  });

  return NextResponse.json({ success: true });
});
