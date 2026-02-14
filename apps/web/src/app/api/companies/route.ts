import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requirePermission, parseSearchParams } from "@/lib/api-utils";
import { publishEvent, buildChannels } from "@/lib/events";
import { scopeWhere, validateTeamMembership } from "@/lib/authorization";
import { z } from "zod";

export const runtime = "nodejs";

const CreateCompanySchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  size: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional().or(z.literal("")),
  annualRevenue: z.number().positive().optional(),
  teamId: z.string().cuid().optional(),
});

// GET /api/companies (SCOPED)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("read", "contact");
  const params = parseSearchParams(req.url);
  const scope = await scopeWhere(user);

  const where: any = { ...scope.company };

  if (params.search) {
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: [
          { name: { contains: params.search, mode: "insensitive" } },
          { domain: { contains: params.search, mode: "insensitive" } },
          { industry: { contains: params.search, mode: "insensitive" } },
        ],
      },
    ];
  }
  if (params.industry) where.industry = params.industry;
  if (params.size) where.size = params.size;

  const limit = Math.min(Number(params.limit) || 50, 100);
  const offset = Number(params.offset) || 0;

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        _count: { select: { contacts: true, deals: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.company.count({ where }),
  ]);

  return NextResponse.json({ companies, total, limit, offset });
});

// POST /api/companies (with team validation)
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("create", "contact");
  const body = await req.json();
  const data = CreateCompanySchema.parse(body);

  if (data.teamId) await validateTeamMembership(user.id, data.teamId);

  const company = await prisma.company.create({
    data: {
      name: data.name,
      domain: data.domain,
      industry: data.industry,
      size: data.size as any,
      phone: data.phone,
      website: data.website || undefined,
      annualRevenue: data.annualRevenue,
      teamId: data.teamId,
    },
    include: { _count: { select: { contacts: true, deals: true } } },
  });

  publishEvent({
    entityType: "company",
    entityId: company.id,
    action: "created",
    userId: user.id,
    channels: buildChannels({ userId: user.id, teamId: data.teamId }),
  });

  return NextResponse.json(company, { status: 201 });
});
