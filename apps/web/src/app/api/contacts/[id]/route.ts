import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { UpdateContactSchema } from "@cultivated-crm/shared";
import { apiHandler, requirePermission } from "@/lib/api-utils";
import { publishEvent, buildChannels } from "@/lib/events";
import { canAccessContact, denyAccess } from "@/lib/authorization";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// GET /api/contacts/:id (scoped)
export const GET = apiHandler(async (_req: NextRequest, { params }: Params) => {
  const user = await requirePermission("read", "contact");
  const { id } = await params;

  if (!(await canAccessContact(user, id))) denyAccess();

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      company: { select: { id: true, name: true, domain: true } },
      tags: { include: { tag: true } },
      deals: {
        include: {
          deal: {
            include: {
              stage: { select: { name: true, color: true } },
            },
          },
        },
      },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 20,
        include: { user: { select: { id: true, name: true } } },
      },
      tasks: {
        where: { status: { in: ["TODO", "IN_PROGRESS"] } },
        orderBy: { dueDate: "asc" },
        include: { assignee: { select: { id: true, name: true } } },
      },
      _count: { select: { deals: true, activities: true, emails: true } },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json(contact);
});

// PATCH /api/contacts/:id (scoped)
export const PATCH = apiHandler(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission("update", "contact");
  const { id } = await params;

  if (!(await canAccessContact(user, id))) denyAccess();

  const body = await req.json();
  const data = UpdateContactSchema.parse(body);

  const old = await prisma.contact.findUniqueOrThrow({ where: { id } });

  const contact = await prisma.contact.update({
    where: { id },
    data: data as any,
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      company: { select: { id: true, name: true } },
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
      entityType: "contact",
      entityId: id,
      action: "updated",
      userId: user.id,
      changes,
      channels: buildChannels({
        userId: user.id,
        teamId: (contact as any).teamId,
        contactId: id,
      }),
    });
  }

  return NextResponse.json(contact);
});

// DELETE /api/contacts/:id (scoped)
export const DELETE = apiHandler(async (_req: NextRequest, { params }: Params) => {
  const user = await requirePermission("delete", "contact");
  const { id } = await params;

  if (!(await canAccessContact(user, id))) denyAccess();

  const contact = await prisma.contact.findUniqueOrThrow({ where: { id }, select: { teamId: true } });

  await prisma.contact.delete({ where: { id } });

  publishEvent({
    entityType: "contact",
    entityId: id,
    action: "deleted",
    userId: user.id,
    channels: buildChannels({ userId: user.id, teamId: (contact as any).teamId }),
  });

  return NextResponse.json({ success: true });
});
