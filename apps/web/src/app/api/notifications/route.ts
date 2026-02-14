import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requirePermission, parseSearchParams } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET /api/notifications — list for current user
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("read", "contact");
  const params = parseSearchParams(req.url);

  const limit = Math.min(Number(params.limit) || 20, 50);
  const offset = Number(params.offset) || 0;
  const unreadOnly = params.unread === "true";

  const where: any = { userId: user.id };
  if (unreadOnly) where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, total, unreadCount, limit, offset });
});

// POST /api/notifications — mark all as read
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("read", "contact");
  const body = await req.json();

  if (body.action === "mark_all_read") {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
});
