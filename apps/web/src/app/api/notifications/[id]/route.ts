import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requirePermission } from "@/lib/api-utils";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/notifications/:id — mark as read
export const PATCH = apiHandler(async (_req: NextRequest, { params }: Params) => {
  const user = await requirePermission("read", "contact");
  const { id } = await params;

  const notification = await prisma.notification.update({
    where: { id, userId: user.id },
    data: { isRead: true, readAt: new Date() },
  });

  return NextResponse.json(notification);
});

// DELETE /api/notifications/:id
export const DELETE = apiHandler(async (_req: NextRequest, { params }: Params) => {
  const user = await requirePermission("read", "contact");
  const { id } = await params;

  await prisma.notification.delete({
    where: { id, userId: user.id },
  });

  return NextResponse.json({ success: true });
});
