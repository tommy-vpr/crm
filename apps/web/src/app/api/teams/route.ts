import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requireUser } from "@/lib/api-utils";

export const runtime = "nodejs";

// GET /api/teams — list all teams (admin sees all, others see their own)
export const GET = apiHandler(async () => {
  const user = await requireUser();

  const where =
    user.role === "ADMIN" ? {} : { members: { some: { userId: user.id } } };

  const teams = await prisma.team.findMany({
    where,
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
    orderBy: { name: "asc" },
  });

  return NextResponse.json(teams);
});

// POST /api/teams — create team (admin only)
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { name } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const team = await prisma.team.create({
    data: { name: name.trim() },
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

  return NextResponse.json(team, { status: 201 });
});
