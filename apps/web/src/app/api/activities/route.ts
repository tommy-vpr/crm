import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { CreateActivitySchema } from "@cultivated-crm/shared";
import { apiHandler, requirePermission, parseSearchParams } from "@/lib/api-utils";
import { publishEvent, buildChannels } from "@/lib/events";
import { scopeWhere } from "@/lib/authorization";

export const runtime = "nodejs";

// GET /api/activities — list with filters (SCOPED)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("read", "contact");
  const params = parseSearchParams(req.url);
  const scope = await scopeWhere(user);

  const where: any = { ...scope.activity };
  if (params.contactId) where.contactId = params.contactId;
  if (params.dealId) where.dealId = params.dealId;
  if (params.companyId) where.companyId = params.companyId;
  if (params.type) where.type = params.type;

  const limit = Math.min(Number(params.limit) || 30, 100);
  const offset = Number(params.offset) || 0;

  const activities = await prisma.activity.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: limit,
    skip: offset,
  });

  return NextResponse.json(activities);
});

// POST /api/activities — create a note, call log, etc.
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("create", "contact");
  const body = await req.json();
  const data = CreateActivitySchema.parse(body);

  const activity = await prisma.activity.create({
    data: {
      type: data.type,
      title: data.title,
      description: data.description,
      contactId: data.contactId,
      dealId: data.dealId,
      companyId: data.companyId,
      metadata: data.metadata as any,
      userId: user.id,
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  if (data.contactId) {
    await prisma.contact.update({
      where: { id: data.contactId },
      data: { lastContactedAt: new Date() },
    });
  }

  publishEvent({
    entityType: "activity",
    entityId: activity.id,
    action: "created",
    userId: user.id,
    channels: buildChannels({
      userId: user.id,
      dealId: data.dealId,
      contactId: data.contactId,
    }),
  });

  return NextResponse.json(activity, { status: 201 });
});
