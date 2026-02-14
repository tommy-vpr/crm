import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@cultivated-crm/db";
import { CreateDealSchema } from "@cultivated-crm/shared";
import { apiHandler, requirePermission, parseSearchParams } from "@/lib/api-utils";
import { publishEvent, buildChannels } from "@/lib/events";
import { scopeWhere, validateTeamMembership } from "@/lib/authorization";

export const runtime = "nodejs";

// GET /api/deals — list with filtering, search, pagination (SCOPED)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("read", "deal");
  const params = parseSearchParams(req.url);
  const scope = await scopeWhere(user);

  const where: any = { ...scope.deal };

  if (params.pipelineId) where.pipelineId = params.pipelineId;
  if (params.stageId) where.stageId = params.stageId;
  if (params.ownerId) where.ownerId = params.ownerId;
  if (params.priority) where.priority = params.priority;
  if (params.companyId) where.companyId = params.companyId;

  if (params.search) {
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: [
          { title: { contains: params.search, mode: "insensitive" } },
          { company: { name: { contains: params.search, mode: "insensitive" } } },
        ],
      },
    ];
  }

  if (params.minValue || params.maxValue) {
    where.value = {};
    if (params.minValue) where.value.gte = Number(params.minValue);
    if (params.maxValue) where.value.lte = Number(params.maxValue);
  }

  const limit = Math.min(Number(params.limit) || 50, 200);
  const offset = Number(params.offset) || 0;

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: {
        stage: { select: { id: true, name: true, color: true, position: true, isWon: true, isLost: true } },
        owner: { select: { id: true, name: true, avatarUrl: true, image: true } },
        company: { select: { id: true, name: true } },
        contacts: {
          include: {
            contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        _count: { select: { activities: true, tasks: true } },
      },
      orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.deal.count({ where }),
  ]);

  return NextResponse.json({ deals, total, limit, offset });
});

// POST /api/deals — create a deal (with team membership validation)
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("create", "deal");
  const body = await req.json();
  const { contactIds, ...data } = CreateDealSchema.parse(body);

  // P0: Prevent teamId spoofing — user must be a member of the target team
  await validateTeamMembership(user.id, data.teamId);

  const lastDeal = await prisma.deal.findFirst({
    where: { stageId: data.stageId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const deal = await prisma.deal.create({
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
      ownerId: data.ownerId ?? user.id,
      position: (lastDeal?.position ?? -1) + 1,
      contacts: contactIds?.length
        ? { create: contactIds.map((contactId) => ({ contactId })) }
        : undefined,
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

  await prisma.activity.create({
    data: {
      type: "DEAL_CREATED",
      title: `Deal "${deal.title}" created`,
      dealId: deal.id,
      companyId: deal.companyId ?? undefined,
      userId: user.id,
    },
  });

  publishEvent({
    entityType: "deal",
    entityId: deal.id,
    action: "created",
    userId: user.id,
    channels: buildChannels({
      userId: user.id,
      teamId: deal.teamId,
      pipelineId: deal.pipelineId,
    }),
  });

  return NextResponse.json(deal, { status: 201 });
});
