import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { MoveDealStageSchema } from "@cultivated-crm/shared";
import { apiHandler, requirePermission } from "@/lib/api-utils";
import { publishEvent, buildChannels } from "@/lib/events";
import { canAccessDeal, denyAccess } from "@/lib/authorization";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const MoveSchema = MoveDealStageSchema.extend({
  position: z.number().int().min(0).optional(),
});

// PATCH /api/deals/:id/stage — move to a new stage (scoped)
export const PATCH = apiHandler(
  async (req: NextRequest, { params }: Params) => {
    const user = await requirePermission("update", "deal");
    const { id } = await params;

    if (!(await canAccessDeal(user, id))) denyAccess();

    const body = await req.json();
    const { stageId, position } = MoveSchema.parse(body);

    const old = await prisma.deal.findUniqueOrThrow({
      where: { id },
      include: { stage: { select: { name: true } } },
    });

    const newStage = await prisma.stage.findUniqueOrThrow({
      where: { id: stageId },
    });

    const updateData: any = { stageId };

    if (newStage.isWon || newStage.isLost) {
      updateData.actualCloseDate = new Date();
    } else if (old.actualCloseDate) {
      updateData.actualCloseDate = null;
    }

    if (position !== undefined) {
      await prisma.deal.updateMany({
        where: {
          stageId,
          position: { gte: position },
          id: { not: id },
        },
        data: { position: { increment: 1 } },
      });
      updateData.position = position;
    } else {
      const lastDeal = await prisma.deal.findFirst({
        where: { stageId, id: { not: id } },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      updateData.position = (lastDeal?.position ?? -1) + 1;
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        stage: {
          select: {
            id: true,
            name: true,
            color: true,
            position: true,
            isWon: true,
            isLost: true,
          },
        },
        pipeline: {
          include: {
            stages: { orderBy: { position: "asc" } },
          },
        },
        owner: {
          select: { id: true, name: true, avatarUrl: true, image: true },
        },
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
        type: "DEAL_STAGE_CHANGED",
        title: `Moved from "${old.stage.name}" to "${newStage.name}"`,
        dealId: id,
        userId: user.id,
        metadata: {
          fromStageId: old.stageId,
          toStageId: stageId,
          fromStageName: old.stage.name,
          toStageName: newStage.name,
        },
      },
    });

    publishEvent({
      entityType: "deal",
      entityId: id,
      action: "stage_changed",
      userId: user.id,
      changes: {
        stageId: { old: old.stageId, new: stageId },
        stageName: { old: old.stage.name, new: newStage.name },
      },
      channels: buildChannels({
        userId: user.id,
        teamId: deal.teamId,
        pipelineId: deal.pipelineId,
        dealId: id,
      }),
    });

    return NextResponse.json(deal);
  },
);
