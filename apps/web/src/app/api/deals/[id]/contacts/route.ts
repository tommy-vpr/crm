import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requirePermission } from "@/lib/api-utils";
import { canAccessDeal, denyAccess } from "@/lib/authorization";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const AddContactSchema = z.object({
  contactId: z.string().cuid(),
  role: z.string().max(100).optional(),
});

const RemoveContactSchema = z.object({
  contactId: z.string().cuid(),
});

// POST /api/deals/:id/contacts — add contact to deal (scoped)
export const POST = apiHandler(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission("update", "deal");
  const { id } = await params;

  if (!(await canAccessDeal(user, id))) denyAccess();

  const body = await req.json();
  const { contactId, role } = AddContactSchema.parse(body);

  const dc = await prisma.dealContact.upsert({
    where: { dealId_contactId: { dealId: id, contactId } },
    create: { dealId: id, contactId, role },
    update: { role },
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true, title: true },
      },
    },
  });

  return NextResponse.json(dc, { status: 201 });
});

// DELETE /api/deals/:id/contacts — remove contact from deal (scoped)
export const DELETE = apiHandler(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission("update", "deal");
  const { id } = await params;

  if (!(await canAccessDeal(user, id))) denyAccess();

  const body = await req.json();
  const { contactId } = RemoveContactSchema.parse(body);

  await prisma.dealContact.delete({
    where: { dealId_contactId: { dealId: id, contactId } },
  });

  return NextResponse.json({ success: true });
});
