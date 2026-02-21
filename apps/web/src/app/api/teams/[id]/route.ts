import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requireUser } from "@/lib/api-utils";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// GET /api/teams/[id]
export const GET = apiHandler(async (_req: NextRequest, { params }: Params) => {
  await requireUser();
  const { id } = await params;

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
        },
      },
      _count: { select: { deals: true, contacts: true, pipelines: true } },
    },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(team);
});

// DELETE /api/teams/[id]
export const DELETE = apiHandler(
  async (_req: NextRequest, { params }: Params) => {
    const user = await requireUser();
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        _count: { select: { deals: true, contacts: true, pipelines: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Nullify team references on related records before deleting
    await prisma.$transaction([
      prisma.deal.updateMany({ where: { teamId: id }, data: { teamId: null } }),
      prisma.contact.updateMany({
        where: { teamId: id },
        data: { teamId: null },
      }),
      prisma.company.updateMany({
        where: { teamId: id },
        data: { teamId: null },
      }),
      prisma.pipeline.updateMany({
        where: { teamId: id },
        data: { teamId: null },
      }),
      prisma.teamMember.deleteMany({ where: { teamId: id } }),
      prisma.team.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  },
);
