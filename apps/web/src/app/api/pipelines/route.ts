import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requirePermission } from "@/lib/api-utils";
import { scopeWhere, validateTeamMembership } from "@/lib/authorization";
import { z } from "zod";

export const runtime = "nodejs";

const CreatePipelineSchema = z.object({
  name: z.string().min(1).max(100),
  teamId: z.string().cuid().optional(),
  stages: z
    .array(
      z.object({
        name: z.string().min(1),
        color: z.string().default("#6B7280"),
        probability: z.number().min(0).max(100).default(0),
        isWon: z.boolean().default(false),
        isLost: z.boolean().default(false),
      }),
    )
    .optional(),
});

// GET /api/pipelines — list all accessible pipelines (SCOPED)
export const GET = apiHandler(async () => {
  const user = await requirePermission("read", "deal");
  const scope = await scopeWhere(user);

  const pipelines = await prisma.pipeline.findMany({
    where: scope.pipeline,
    include: {
      stages: { orderBy: { position: "asc" } },
      team: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { deals: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(pipelines);
});

// POST /api/pipelines — create with default stages
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("create", "deal");
  const body = await req.json();
  const data = CreatePipelineSchema.parse(body);

  // Auto-assign team if not provided
  let teamId = data.teamId;
  if (!teamId) {
    const membership = await prisma.teamMember.findFirst({
      where: { userId: user.id },
      select: { teamId: true },
    });
    teamId = membership?.teamId ?? undefined;
  }

  if (teamId) await validateTeamMembership(user.id, teamId);

  const defaultStages = data.stages ?? [
    {
      name: "Lead",
      color: "#6B7280",
      probability: 10,
      isWon: false,
      isLost: false,
    },
    {
      name: "Qualified",
      color: "#3B82F6",
      probability: 25,
      isWon: false,
      isLost: false,
    },
    {
      name: "Proposal",
      color: "#8B5CF6",
      probability: 50,
      isWon: false,
      isLost: false,
    },
    {
      name: "Negotiation",
      color: "#F59E0B",
      probability: 75,
      isWon: false,
      isLost: false,
    },
    {
      name: "Won",
      color: "#10B981",
      probability: 100,
      isWon: true,
      isLost: false,
    },
    {
      name: "Lost",
      color: "#EF4444",
      probability: 0,
      isWon: false,
      isLost: true,
    },
  ];

  const pipeline = await prisma.pipeline.create({
    data: {
      name: data.name,
      teamId,
      createdById: user.id,
      stages: {
        create: defaultStages.map((s, i) => ({ ...s, position: i })),
      },
    },
    include: {
      stages: { orderBy: { position: "asc" } },
      _count: { select: { deals: true } },
    },
  });

  return NextResponse.json(pipeline, { status: 201 });
});
