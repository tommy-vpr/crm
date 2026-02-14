import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { CreateContactSchema } from "@cultivated-crm/shared";
import { apiHandler, requirePermission, parseSearchParams } from "@/lib/api-utils";
import { publishEvent, buildChannels } from "@/lib/events";
import { scopeWhere, validateTeamMembership } from "@/lib/authorization";

export const runtime = "nodejs";

// GET /api/contacts — list with filtering + search (SCOPED)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("read", "contact");
  const params = parseSearchParams(req.url);
  const scope = await scopeWhere(user);

  const where: any = { ...scope.contact };

  if (params.search) {
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: [
          { firstName: { contains: params.search, mode: "insensitive" } },
          { lastName: { contains: params.search, mode: "insensitive" } },
          { email: { contains: params.search, mode: "insensitive" } },
          { company: { name: { contains: params.search, mode: "insensitive" } } },
        ],
      },
    ];
  }
  if (params.status) where.status = params.status;
  if (params.source) where.source = params.source;
  if (params.ownerId) where.ownerId = params.ownerId;
  if (params.companyId) where.companyId = params.companyId;

  const limit = Math.min(Number(params.limit) || 50, 100);
  const offset = Number(params.offset) || 0;

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        company: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        _count: { select: { deals: true, activities: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({ contacts, total, limit, offset });
});

// POST /api/contacts — create (with team validation)
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("create", "contact");
  const body = await req.json();
  const data = CreateContactSchema.parse(body);

  // P0: Validate team membership if teamId provided
  if ((data as any).teamId) await validateTeamMembership(user.id, (data as any).teamId);

  const contact = await prisma.contact.create({
    data: {
      ...(data as any),
      ownerId: data.ownerId ?? user.id,
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      company: { select: { id: true, name: true } },
    },
  });

  await prisma.activity.create({
    data: {
      type: "CONTACT_CREATED",
      title: `${contact.firstName} ${contact.lastName} created`,
      contactId: contact.id,
      userId: user.id,
    },
  });

  publishEvent({
    entityType: "contact",
    entityId: contact.id,
    action: "created",
    userId: user.id,
    channels: buildChannels({
      userId: user.id,
      teamId: (contact as any).teamId,
      contactId: contact.id,
    }),
  });

  return NextResponse.json(contact, { status: 201 });
});
