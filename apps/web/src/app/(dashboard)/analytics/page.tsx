"use client";

import { useState } from "react";
import { useDashboardStats } from "@/hooks/use-analytics";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { StatCard } from "@/components/cards/stat-card";
import { Card, PageLoader, Select, Badge } from "@/components/ui/index";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatCurrency";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState(30);
  const { data, isLoading } = useDashboardStats(period);

  if (isLoading) return <PageLoader />;
  if (!data) return null;

  const { overview, funnel, activityBreakdown, revenueTrend } = data;

  // Funnel max for bar sizing
  const maxFunnelCount = Math.max(...funnel.map((s: any) => s.count), 1);
  const maxFunnelValue = Math.max(...funnel.map((s: any) => s.value), 1);

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">
            Overview of your CRM performance
          </p>
        </div>
        <Select
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
          className="w-40"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </Select>
      </div>

      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Open Pipeline"
          value={formatCurrency(overview.openPipelineValue)}
          subValue={`${overview.openDeals} deals`}
        />
        <StatCard
          label="Won Revenue"
          value={formatCurrency(overview.wonRevenue)}
          subValue={`${overview.wonDeals} won`}
          trend={overview.wonRevenue > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Win Rate"
          value={`${overview.winRate}%`}
          subValue={`${overview.lostDeals} lost`}
          trend={
            overview.winRate >= 50
              ? "up"
              : overview.winRate > 0
                ? "down"
                : "neutral"
          }
        />
        <StatCard
          label="Activities"
          value={overview.recentActivities}
          subValue={`in ${period} days`}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Funnel + Revenue Trend */}
        <div className="col-span-2 space-y-6">
          {/* Pipeline Funnel */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Pipeline Funnel
            </h2>
            {funnel.length > 0 ? (
              <div className="space-y-3">
                {funnel.map((stage: any) => (
                  <div key={stage.id} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-slate-700 truncate">
                      {stage.name}
                    </span>
                    <div className="flex-1">
                      <div className="flex gap-1">
                        {/* Count bar */}
                        <div
                          className="h-7 rounded-l-sm flex items-center justify-end px-2 transition-all"
                          style={{
                            width: `${Math.max((stage.count / maxFunnelCount) * 100, 8)}%`,
                            backgroundColor: stage.color,
                          }}
                        >
                          <span className="text-[11px] font-medium text-white">
                            {stage.count}
                          </span>
                        </div>
                        {/* Value bar */}
                        {stage.value > 0 && (
                          <div
                            className="h-7 rounded-r-sm flex items-center px-2 transition-all"
                            style={{
                              width: `${Math.max((stage.value / maxFunnelValue) * 60, 5)}%`,
                              backgroundColor: stage.color,
                              opacity: 0.4,
                            }}
                          >
                            <span className="text-[11px] font-medium text-slate-700">
                              {formatCurrency(stage.value)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No active deals in pipeline
              </p>
            )}
          </Card>

          {/* Revenue Trend */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Revenue Won (by Week)
            </h2>
            {revenueTrend.length > 0 ? (
              <div className="space-y-2">
                {revenueTrend.map((week: any) => {
                  const maxVal = Math.max(
                    ...revenueTrend.map((w: any) => w.value),
                    1,
                  );
                  return (
                    <div key={week.week} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-slate-500">
                        {new Date(week.week).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <div className="flex-1">
                        <div
                          className="h-6 rounded bg-emerald-500 flex items-center px-2 transition-all"
                          style={{
                            width: `${Math.max((week.value / maxVal) * 100, 5)}%`,
                          }}
                        >
                          <span className="text-[11px] font-medium text-white whitespace-nowrap">
                            {formatCurrency(week.value)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 w-12 text-right">
                        {week.count} deal{week.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No deals won in this period
              </p>
            )}
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Contacts & Companies
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Total Contacts</dt>
                <dd className="font-semibold text-slate-900">
                  {overview.totalContacts}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">New Contacts</dt>
                <dd className="font-semibold text-emerald-600">
                  +{overview.newContactsInPeriod}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Companies</dt>
                <dd className="font-semibold text-slate-900">
                  {overview.totalCompanies}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Task Summary */}
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Tasks
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Open Tasks</dt>
                <dd className="font-semibold text-slate-900">
                  {overview.openTasks}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Completed</dt>
                <dd className="font-semibold text-emerald-600">
                  {overview.completedTasks}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Overdue</dt>
                <dd
                  className={cn(
                    "font-semibold",
                    overview.overdueTasks > 0
                      ? "text-red-600"
                      : "text-slate-900",
                  )}
                >
                  {overview.overdueTasks}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Activity Breakdown */}
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Activity Breakdown
            </h2>
            {activityBreakdown.length > 0 ? (
              <div className="space-y-2">
                {activityBreakdown.map((item: any) => (
                  <div
                    key={item.type}
                    className="flex items-center justify-between"
                  >
                    <Badge variant="outline" className="text-[10px]">
                      {item.type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm font-medium text-slate-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No activity in this period
              </p>
            )}
          </Card>

          {/* Deal Stats */}
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Deal Summary
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Total Deals</dt>
                <dd className="font-semibold text-slate-900">
                  {overview.totalDeals}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Open</dt>
                <dd className="font-semibold text-blue-600">
                  {overview.openDeals}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Won</dt>
                <dd className="font-semibold text-emerald-600">
                  {overview.wonDeals}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Lost</dt>
                <dd className="font-semibold text-red-600">
                  {overview.lostDeals}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-2">
                <dt className="text-slate-500">Lost Value</dt>
                <dd className="font-semibold text-red-600">
                  {formatCurrency(overview.lostValue)}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
