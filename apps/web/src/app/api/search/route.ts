import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requirePermission, parseSearchParams } from "@/lib/api-utils";
import { scopeWhere } from "@/lib/authorization";

export const runtime = "nodejs";

// GET /api/search?q=term — search across contacts, companies, deals (SCOPED)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("read", "contact");
  const params = parseSearchParams(req.url);
  const q = params.q?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ contacts: [], companies: [], deals: [] });
  }

  const scope = await scopeWhere(user);
  const limit = 5;

  const [contacts, companies, deals] = await Promise.all([
    prisma.contact.findMany({
      where: {
        ...scope.contact,
        AND: [
          {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: { select: { name: true } },
      },
      take: limit,
    }),
    prisma.company.findMany({
      where: {
        ...scope.company,
        AND: [
          {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { domain: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        domain: true,
        _count: { select: { contacts: true } },
      },
      take: limit,
    }),
    prisma.deal.findMany({
      where: {
        ...scope.deal,
        AND: [
          {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        value: true,
        stage: { select: { name: true, color: true } },
        company: { select: { name: true } },
      },
      take: limit,
    }),
  ]);

  return NextResponse.json({ contacts, companies, deals });
}, { rateLimit: "search" });
