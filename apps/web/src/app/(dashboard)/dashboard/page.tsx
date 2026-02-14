"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useDashboardStats } from "@/hooks/use-analytics";
import { useTasks } from "@/hooks/use-tasks";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { StatCard } from "@/components/cards/stat-card";
import { Card, PageLoader, Badge, Avatar } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { useCompleteTask } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: stats, isLoading } = useDashboardStats(30);
  const { data: myTasksData } = useTasks({ mine: "true", limit: 8 });
  const completeTask = useCompleteTask();

  if (isLoading) return <PageLoader />;

  const overview = stats?.overview;
  const funnel = stats?.funnel ?? [];
  const activities = stats?.activityBreakdown ?? [];
  const myTasks = myTasksData?.tasks ?? [];

  return (
    <PageWrapper>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back
          {session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-slate-500">
          Here&apos;s what&apos;s happening with your CRM today.
        </p>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Open Pipeline"
            value={formatCurrency(overview.openPipelineValue)}
            subValue={`${overview.openDeals} deals`}
          />
          <StatCard
            label="Won Revenue (30d)"
            value={formatCurrency(overview.wonRevenue)}
            subValue={
              overview.wonDeals > 0 ? `${overview.wonDeals} closed` : "—"
            }
            trend={overview.wonRevenue > 0 ? "up" : "neutral"}
          />
          <StatCard
            label="Win Rate"
            value={`${overview.winRate}%`}
            trend={
              overview.winRate >= 50
                ? "up"
                : overview.winRate > 0
                  ? "down"
                  : "neutral"
            }
          />
          <StatCard
            label="Overdue Tasks"
            value={overview.overdueTasks}
            trend={overview.overdueTasks > 0 ? "down" : "neutral"}
            subValue={
              overview.overdueTasks > 0 ? "needs attention" : "all clear"
            }
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: My Tasks + Pipeline */}
        <div className="col-span-2 space-y-6">
          {/* My Tasks */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                My Tasks
              </h2>
              <Link
                href="/tasks"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            {myTasks.length > 0 ? (
              <div className="divide-y">
                {myTasks.map((task: any) => {
                  const overdue =
                    task.dueDate &&
                    task.status !== "DONE" &&
                    new Date(task.dueDate) < new Date();
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <button
                        onClick={() => completeTask.mutate(task.id)}
                        className={cn(
                          "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition",
                          task.status === "DONE"
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-slate-300 hover:border-primary",
                        )}
                      >
                        {task.status === "DONE" && (
                          <svg
                            className="h-2.5 w-2.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                      <span
                        className={cn(
                          "flex-1 text-sm truncate",
                          task.status === "DONE"
                            ? "text-slate-400 line-through"
                            : "text-slate-800",
                        )}
                      >
                        {task.title}
                      </span>
                      {task.deal && (
                        <Link
                          href={`/deals/${task.deal.id}`}
                          className="text-[11px] text-slate-400 hover:text-primary truncate max-w-[120px]"
                        >
                          {task.deal.title}
                        </Link>
                      )}
                      {overdue && (
                        <span className="text-[10px] font-medium text-red-500">
                          Overdue
                        </span>
                      )}
                      {task.dueDate && !overdue && task.status !== "DONE" && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(task.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-slate-400">
                No tasks assigned to you
              </p>
            )}
          </Card>

          {/* Pipeline Snapshot */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Pipeline Snapshot
              </h2>
              <Link
                href="/pipeline"
                className="text-xs font-medium text-primary hover:underline"
              >
                Open board
              </Link>
            </div>
            {funnel.length > 0 ? (
              <div className="space-y-2">
                {funnel.map((stage: any) => {
                  const maxCount = Math.max(
                    ...funnel.map((s: any) => s.count),
                    1,
                  );
                  return (
                    <div key={stage.id} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-slate-600 truncate">
                        {stage.name}
                      </span>
                      <div className="flex-1">
                        <div
                          className="h-5 rounded flex items-center px-2"
                          style={{
                            width: `${Math.max((stage.count / maxCount) * 100, 8)}%`,
                            backgroundColor: stage.color,
                          }}
                        >
                          <span className="text-[10px] font-semibold text-white">
                            {stage.count}
                          </span>
                        </div>
                      </div>
                      <span className="w-16 text-right text-[11px] text-slate-400">
                        {formatCurrency(stage.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-slate-400">
                No active deals
              </p>
            )}
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <Link
                href="/contacts"
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                New Contact
              </Link>
              <Link
                href="/deals"
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                New Deal
              </Link>
              <Link
                href="/tasks"
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                New Task
              </Link>
              <Link
                href="/pipeline"
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Pipeline Board
              </Link>
            </div>
          </Card>

          {/* Summary Stats */}
          {overview && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                CRM Summary
              </h2>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Total Contacts</dt>
                  <dd className="font-semibold text-slate-900">
                    {overview.totalContacts}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">New (30d)</dt>
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
                <div className="flex justify-between border-t pt-2">
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
                  <dt className="text-slate-500">Activities (30d)</dt>
                  <dd className="font-semibold text-slate-900">
                    {overview.recentActivities}
                  </dd>
                </div>
              </dl>
            </Card>
          )}

          {/* Activity Breakdown */}
          {activities.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Activity (30d)
              </h2>
              <div className="space-y-1.5">
                {activities.slice(0, 6).map((a: any) => (
                  <div
                    key={a.type}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-slate-500">
                      {a.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {a.count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
