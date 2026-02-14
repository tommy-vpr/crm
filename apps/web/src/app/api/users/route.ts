import { NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requireUser } from "@/lib/api-utils";

export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  await requireUser();

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
});
