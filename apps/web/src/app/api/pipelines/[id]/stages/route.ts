import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requirePermission } from "@/lib/api-utils";
import { canAccessPipeline, denyAccess } from "@/lib/authorization";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const CreateStageSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().default("#6B7280"),
  probability: z.number().min(0).max(100).default(0),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
});

const ReorderStagesSchema = z.object({
  stageIds: z.array(z.string().cuid()),
});

const UpdateStageSchema = z.object({
  stageId: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  isWon: z.boolean().optional(),
  isLost: z.boolean().optional(),
});

// POST /api/pipelines/:id/stages — add stage or reorder (scoped)
export const POST = apiHandler(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission("update", "deal");
  const { id } = await params;

  if (!(await canAccessPipeline(user, id))) denyAccess();

  const body = await req.json();

  // Reorder mode
  if (body.stageIds) {
    const { stageIds } = ReorderStagesSchema.parse(body);

    await prisma.$transaction(
      stageIds.map((stageId, index) =>
        prisma.stage.update({
          where: { id: stageId },
          data: { position: index },
        })
      )
    );

    const pipeline = await prisma.pipeline.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { position: "asc" },
          include: { _count: { select: { deals: true } } },
        },
      },
    });

    return NextResponse.json(pipeline);
  }

  // Update existing stage
  if (body.stageId) {
    const data = UpdateStageSchema.parse(body);
    const { stageId, ...updateData } = data;

    const stage = await prisma.stage.update({
      where: { id: stageId },
      data: updateData as any,
    });

    return NextResponse.json(stage);
  }

  // Create new stage
  const data = CreateStageSchema.parse(body);

  const lastStage = await prisma.stage.findFirst({
    where: { pipelineId: id },
    orderBy: { position: "desc" },
  });

  const stage = await prisma.stage.create({
    data: {
      ...(data as any),
      pipelineId: id,
      position: (lastStage?.position ?? -1) + 1,
    },
  });

  return NextResponse.json(stage, { status: 201 });
});

// DELETE /api/pipelines/:id/stages (scoped)
export const DELETE = apiHandler(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission("delete", "deal");
  const { id } = await params;

  if (!(await canAccessPipeline(user, id))) denyAccess();

  const { searchParams } = new URL(req.url);
  const stageId = searchParams.get("stageId");

  if (!stageId) {
    return NextResponse.json({ error: "stageId required" }, { status: 400 });
  }

  const dealCount = await prisma.deal.count({ where: { stageId } });
  if (dealCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete stage with ${dealCount} deals. Move them first.` },
      { status: 400 }
    );
  }

  await prisma.stage.delete({ where: { id: stageId } });

  const remaining = await prisma.stage.findMany({
    where: { pipelineId: id },
    orderBy: { position: "asc" },
  });

  await prisma.$transaction(
    remaining.map((s: any, i: number) =>
      prisma.stage.update({ where: { id: s.id }, data: { position: i } })
    )
  );

  return NextResponse.json({ success: true });
});
