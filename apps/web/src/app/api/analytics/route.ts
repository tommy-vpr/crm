import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import {
  apiHandler,
  requirePermission,
  parseSearchParams,
} from "@/lib/api-utils";
import { scopeWhere } from "@/lib/authorization";

export const runtime = "nodejs";

// GET /api/analytics — dashboard statistics (SCOPED)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("read", "deal");
  const params = parseSearchParams(req.url);
  const scope = await scopeWhere(user);

  const daysBack = Number(params.days) || 30;
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  // Scoped deal/contact/company/task filters
  const dealScope = scope.deal;
  const contactScope = scope.contact;
  const taskScope = scope.task;
  const activityScope = scope.activity;

  const [
    totalDeals,
    openDeals,
    wonDeals,
    lostDeals,
    totalContacts,
    newContactsInPeriod,
    totalCompanies,
    totalTasks,
    completedTasks,
    overdueTasks,
    recentActivities,
    dealsByStage,
    dealsWonInPeriod,
    dealsLostInPeriod,
    activitiesInPeriod,
  ] = await Promise.all([
    prisma.deal.count({ where: { ...dealScope } }),
    prisma.deal.count({
      where: { ...dealScope, stage: { isWon: false, isLost: false } },
    }),
    prisma.deal.count({
      where: { ...dealScope, stage: { isWon: true } },
    }),
    prisma.deal.count({
      where: { ...dealScope, stage: { isLost: true } },
    }),
    prisma.contact.count({ where: { ...contactScope } }),
    prisma.contact.count({
      where: { ...contactScope, createdAt: { gte: since } },
    }),
    prisma.company.count({ where: { ...scope.company } }),
    prisma.task.count({
      where: { ...taskScope, status: { in: ["TODO", "IN_PROGRESS"] } },
    }),
    prisma.task.count({
      where: { ...taskScope, status: "DONE", completedAt: { gte: since } },
    }),
    prisma.task.count({
      where: {
        ...taskScope,
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueDate: { lt: new Date() },
      },
    }),
    prisma.activity.count({
      where: { ...activityScope, createdAt: { gte: since } },
    }),
    prisma.stage.findMany({
      include: {
        deals: {
          select: { value: true },
          where: { ...dealScope, stage: { isWon: false, isLost: false } },
        },
        _count: { select: { deals: true } },
        pipeline: { select: { id: true, name: true } },
      },
      where: { isWon: false, isLost: false },
      orderBy: { position: "asc" },
    }),
    prisma.deal.findMany({
      where: {
        ...dealScope,
        stage: { isWon: true },
        actualCloseDate: { gte: since },
      },
      select: { value: true, actualCloseDate: true },
    }),
    prisma.deal.findMany({
      where: {
        ...dealScope,
        stage: { isLost: true },
        actualCloseDate: { gte: since },
      },
      select: { value: true },
    }),
    prisma.activity.groupBy({
      by: ["type"],
      _count: true,
      where: { ...activityScope, createdAt: { gte: since } },
      orderBy: { _count: { type: "desc" } },
    }),
  ]);

  const openPipelineValue = dealsByStage.reduce(
    (sum: number, stage: any) =>
      sum + stage.deals.reduce((s: number, d: any) => s + (d.value || 0), 0),
    0,
  );

  const wonRevenue = dealsWonInPeriod.reduce(
    (sum: number, d: any) => sum + (d.value || 0),
    0,
  );
  const lostValue = dealsLostInPeriod.reduce(
    (sum: number, d: any) => sum + (d.value || 0),
    0,
  );

  const winRate =
    dealsWonInPeriod.length + dealsLostInPeriod.length > 0
      ? Math.round(
          (dealsWonInPeriod.length /
            (dealsWonInPeriod.length + dealsLostInPeriod.length)) *
            100,
        )
      : 0;

  const funnel = dealsByStage.map((stage: any) => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    count: stage._count.deals,
    value: stage.deals.reduce((s: number, d: any) => s + (d.value || 0), 0),
    pipelineName: stage.pipeline.name,
  }));

  const activityBreakdown = activitiesInPeriod.map((a: any) => ({
    type: a.type,
    count: a._count,
  }));

  const wonByWeek: Record<string, { count: number; value: number }> = {};
  for (const deal of dealsWonInPeriod) {
    if (!deal.actualCloseDate) continue;
    const d = new Date(deal.actualCloseDate);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    if (!wonByWeek[key]) wonByWeek[key] = { count: 0, value: 0 };
    wonByWeek[key].count++;
    wonByWeek[key].value += deal.value || 0;
  }

  const revenueTrend = Object.entries(wonByWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({ week, ...data }));

  return NextResponse.json({
    period: { days: daysBack, since: since.toISOString() },
    overview: {
      totalDeals,
      openDeals,
      wonDeals,
      lostDeals,
      totalContacts,
      newContactsInPeriod,
      totalCompanies,
      openTasks: totalTasks,
      completedTasks,
      overdueTasks,
      recentActivities,
      openPipelineValue,
      wonRevenue,
      lostValue,
      winRate,
    },
    funnel,
    activityBreakdown,
    revenueTrend,
  });
});
