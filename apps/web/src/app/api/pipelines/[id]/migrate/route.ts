import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requireUser } from "@/lib/api-utils";
import {
  canAccessPipeline,
  canModifyPipeline,
  denyAccess,
} from "@/lib/authorization";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const MigrateSchema = z.object({
  targetPipelineId: z.string().cuid(),
  /** Optional explicit stage mapping: { [sourceStageId]: targetStageId } */
  stageMapping: z.record(z.string(), z.string()).optional(),
  /** If true, delete the source pipeline after migrating */
  deleteAfterMigrate: z.boolean().default(true),
});

// POST /api/pipelines/[id]/migrate — move all deals to another pipeline, optionally delete source
export const POST = apiHandler(async (req: NextRequest, { params }: Params) => {
  const user = await requireUser();
  const { id: sourcePipelineId } = await params;

  // Must be able to access and modify the source pipeline
  if (!(await canAccessPipeline(user, sourcePipelineId))) denyAccess();
  if (!(await canModifyPipeline(user, sourcePipelineId))) denyAccess();

  const body = await req.json();
  const { targetPipelineId, stageMapping, deleteAfterMigrate } =
    MigrateSchema.parse(body);

  if (sourcePipelineId === targetPipelineId) {
    return NextResponse.json(
      { error: "Source and target pipeline cannot be the same" },
      { status: 400 },
    );
  }

  // Must be able to access the target pipeline
  if (!(await canAccessPipeline(user, targetPipelineId))) {
    return NextResponse.json(
      { error: "You don't have access to the target pipeline" },
      { status: 403 },
    );
  }

  // Fetch stages for both pipelines
  const [sourceStages, targetStages] = await Promise.all([
    prisma.stage.findMany({
      where: { pipelineId: sourcePipelineId },
      orderBy: { position: "asc" },
    }),
    prisma.stage.findMany({
      where: { pipelineId: targetPipelineId },
      orderBy: { position: "asc" },
    }),
  ]);

  if (targetStages.length === 0) {
    return NextResponse.json(
      { error: "Target pipeline has no stages" },
      { status: 400 },
    );
  }

  // Build stage mapping: explicit or positional fallback
  const finalMapping: Record<string, string> = {};

  for (let i = 0; i < sourceStages.length; i++) {
    const source = sourceStages[i];

    if (stageMapping?.[source.id]) {
      // Use explicit mapping if provided
      finalMapping[source.id] = stageMapping[source.id];
    } else {
      // Positional mapping: match by position, clamp to last target stage
      const target = targetStages[Math.min(i, targetStages.length - 1)];
      finalMapping[source.id] = target.id;
    }
  }

  // Count deals being migrated
  const dealCount = await prisma.deal.count({
    where: { pipelineId: sourcePipelineId },
  });

  // Migrate all deals in a transaction
  await prisma.$transaction([
    // Move deals stage by stage
    ...sourceStages.map((source) =>
      prisma.deal.updateMany({
        where: { stageId: source.id, pipelineId: sourcePipelineId },
        data: {
          stageId: finalMapping[source.id],
          pipelineId: targetPipelineId,
        },
      }),
    ),
    // Optionally delete the source pipeline (stages cascade)
    ...(deleteAfterMigrate
      ? [prisma.pipeline.delete({ where: { id: sourcePipelineId } })]
      : []),
  ]);

  return NextResponse.json({
    success: true,
    migratedDeals: dealCount,
    deleted: deleteAfterMigrate,
    stageMapping: finalMapping,
  });
});
