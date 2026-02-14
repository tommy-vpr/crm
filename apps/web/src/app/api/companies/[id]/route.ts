import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@cultivated-crm/db";
import { apiHandler, requirePermission } from "@/lib/api-utils";
import { publishEvent, buildChannels } from "@/lib/events";
import { canAccessCompany, denyAccess } from "@/lib/authorization";
import { z } from "zod";

export const runtime = "nodejs";

const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  domain: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  size: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional().or(z.literal("")),
  annualRevenue: z.number().positive().optional(),
});

type Params = { params: Promise<{ id: string }> };

// GET /api/companies/:id (scoped)
export const GET = apiHandler(async (_req: NextRequest, { params }: Params) => {
  const user = await requirePermission("read", "contact");
  const { id } = await params;

  if (!(await canAccessCompany(user, id))) denyAccess();

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: {
        include: {
          owner: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      deals: {
        include: {
          stage: { select: { name: true, color: true } },
          owner: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 20,
        include: { user: { select: { id: true, name: true } } },
      },
      _count: { select: { contacts: true, deals: true } },
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json(company);
});

// PATCH /api/companies/:id (scoped)
export const PATCH = apiHandler(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission("update", "contact");
  const { id } = await params;

  if (!(await canAccessCompany(user, id))) denyAccess();

  const body = await req.json();
  const data = UpdateCompanySchema.parse(body);

  const old = await prisma.company.findUniqueOrThrow({ where: { id } });

  const company = await prisma.company.update({
    where: { id },
    data: {
      name: data.name,
      domain: data.domain,
      industry: data.industry,
      size: data.size as any,
      phone: data.phone,
      website: data.website,
      annualRevenue: data.annualRevenue,
    },
    include: { _count: { select: { contacts: true, deals: true } } },
  });

  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(data) as (keyof typeof data)[]) {
    if (data[key] !== undefined && (old as any)[key] !== data[key]) {
      changes[key] = { old: (old as any)[key], new: data[key] };
    }
  }

  if (Object.keys(changes).length > 0) {
    publishEvent({
      entityType: "company",
      entityId: id,
      action: "updated",
      userId: user.id,
      changes,
      channels: buildChannels({ userId: user.id, teamId: (company as any).teamId }),
    });
  }

  return NextResponse.json(company);
});

// DELETE /api/companies/:id (scoped)
export const DELETE = apiHandler(async (_req: NextRequest, { params }: Params) => {
  const user = await requirePermission("delete", "contact");
  const { id } = await params;

  if (!(await canAccessCompany(user, id))) denyAccess();

  const company = await prisma.company.findUniqueOrThrow({ where: { id }, select: { teamId: true } });
  await prisma.company.delete({ where: { id } });

  publishEvent({
    entityType: "company",
    entityId: id,
    action: "deleted",
    userId: user.id,
    channels: buildChannels({ userId: user.id, teamId: (company as any).teamId }),
  });

  return NextResponse.json({ success: true });
});
