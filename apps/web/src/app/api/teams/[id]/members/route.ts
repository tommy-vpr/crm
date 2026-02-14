import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requireUser } from "@/lib/api-utils";

export const runtime = "nodejs";

// POST /api/teams/[id]/members — add member (admin only)
export const POST = apiHandler(async (req: NextRequest, context: any) => {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id: teamId } = await context.params;
  const body = await req.json();
  const { userId, role = "MEMBER" } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const member = await prisma.teamMember.upsert({
    where: { userId_teamId: { userId, teamId } },
    create: { userId, teamId, role },
    update: { role },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true, role: true },
      },
    },
  });

  return NextResponse.json(member, { status: 201 });
});

// DELETE /api/teams/[id]/members — remove member (admin only)
export const DELETE = apiHandler(async (req: NextRequest, context: any) => {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id: teamId } = await context.params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await prisma.teamMember.deleteMany({
    where: { userId, teamId },
  });

  return NextResponse.json({ success: true });
});
