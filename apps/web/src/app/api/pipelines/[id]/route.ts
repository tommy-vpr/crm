import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requirePermission } from "@/lib/api-utils";
import { canAccessPipeline, denyAccess } from "@/lib/authorization";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const UpdatePipelineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
});

// GET /api/pipelines/:id (scoped)
export const GET = apiHandler(async (_req: NextRequest, { params }: Params) => {
  const user = await requirePermission("read", "deal");
  const { id } = await params;

  if (!(await canAccessPipeline(user, id))) denyAccess();

  const pipeline = await prisma.pipeline.findUnique({
    where: { id },
    include: {
      stages: {
        orderBy: { position: "asc" },
        include: {
          _count: { select: { deals: true } },
        },
      },
      _count: { select: { deals: true } },
    },
  });

  if (!pipeline) {
    return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  }

  return NextResponse.json(pipeline);
});

// PATCH /api/pipelines/:id (scoped)
export const PATCH = apiHandler(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission("update", "deal");
  const { id } = await params;

  if (!(await canAccessPipeline(user, id))) denyAccess();

  const body = await req.json();
  const data = UpdatePipelineSchema.parse(body);

  if (data.isDefault) {
    await prisma.pipeline.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const pipeline = await prisma.pipeline.update({
    where: { id },
    data: data as any,
    include: {
      stages: { orderBy: { position: "asc" } },
      _count: { select: { deals: true } },
    },
  });

  return NextResponse.json(pipeline);
});

// DELETE /api/pipelines/:id (scoped)
export const DELETE = apiHandler(async (_req: NextRequest, { params }: Params) => {
  const user = await requirePermission("delete", "deal");
  const { id } = await params;

  if (!(await canAccessPipeline(user, id))) denyAccess();

  const dealCount = await prisma.deal.count({ where: { pipelineId: id } });
  if (dealCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete pipeline with ${dealCount} active deals` },
      { status: 400 }
    );
  }

  await prisma.pipeline.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
