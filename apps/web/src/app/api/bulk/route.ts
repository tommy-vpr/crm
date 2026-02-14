import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requirePermission } from "@/lib/api-utils";
import { scopeWhere } from "@/lib/authorization";

export const runtime = "nodejs";

// POST /api/bulk — bulk operations (SCOPED: only operates on accessible records)
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("read", "contact");
  const body = await req.json();
  const { entity, action, ids, status } = body;

  if (!ids?.length || !Array.isArray(ids)) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: "Max 100 items per bulk operation" }, { status: 400 });
  }

  const scope = await scopeWhere(user);

  if (entity === "contacts") {
    // P0: Scope bulk operations — only affect records user can access
    const scopedWhere = { id: { in: ids }, ...scope.contact };

    if (action === "delete") {
      await requirePermission("delete", "contact");
      const result = await prisma.contact.deleteMany({ where: scopedWhere });
      return NextResponse.json({ deleted: result.count });
    }

    if (action === "update_status" && status) {
      await requirePermission("update", "contact");
      const result = await prisma.contact.updateMany({
        where: scopedWhere,
        data: { status },
      });
      return NextResponse.json({ updated: result.count });
    }
  }

  if (entity === "deals") {
    const scopedWhere = { id: { in: ids }, ...scope.deal };

    if (action === "delete") {
      await requirePermission("delete", "deal");
      const result = await prisma.deal.deleteMany({ where: scopedWhere });
      return NextResponse.json({ deleted: result.count });
    }

    if (action === "update_priority" && body.priority) {
      await requirePermission("update", "deal");
      const result = await prisma.deal.updateMany({
        where: scopedWhere,
        data: { priority: body.priority },
      });
      return NextResponse.json({ updated: result.count });
    }

    if (action === "update_stage" && body.stageId) {
      await requirePermission("update", "deal");
      const result = await prisma.deal.updateMany({
        where: scopedWhere,
        data: { stageId: body.stageId },
      });
      return NextResponse.json({ updated: result.count });
    }
  }

  return NextResponse.json({ error: "Invalid entity or action" }, { status: 400 });
}, { rateLimit: "bulk" });
