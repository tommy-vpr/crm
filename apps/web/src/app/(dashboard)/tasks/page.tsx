"use client";

import { useState } from "react";
import Link from "next/link";
import { useTasks, useCreateTask, useCompleteTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { useDebounce } from "@/hooks/use-debounce";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  Badge,
  PageLoader,
  Select,
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/index";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskForm } from "@/components/forms/task-form";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  LOW: "secondary",
  MEDIUM: "outline",
  HIGH: "warning",
  URGENT: "destructive",
};

const statusLabels: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "DONE" || status === "CANCELLED") return false;
  return new Date(dueDate) < new Date();
}

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showMine, setShowMine] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 30;

  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useTasks({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    mine: showMine ? "true" : undefined,
    limit,
    offset,
  });

  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const tasks = data?.tasks ?? [];
  const total = data?.total ?? 0;

  const handleStatusToggle = (task: any) => {
    if (task.status === "DONE") {
      updateTask.mutate({ id: task.id, data: { status: "TODO" } });
    } else {
      completeTask.mutate(task.id);
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500">
            {total} task{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New Task</Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
          className="w-36"
        >
          <option value="">All Status</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
        <Select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setOffset(0); }}
          className="w-36"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </Select>
        <button
          onClick={() => { setShowMine(!showMine); setOffset(0); }}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-medium transition",
            showMine
              ? "border-primary bg-primary/10 text-primary"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          )}
        >
          My Tasks
        </button>
      </div>

      {/* Task List */}
      {isLoading ? (
        <PageLoader />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks"
          description={search || statusFilter ? "Try different filters" : "Create your first task"}
          action={
            !(search || statusFilter) ? (
              <Button onClick={() => setShowCreate(true)}>+ New Task</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="divide-y">
            {tasks.map((task: any) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 transition hover:bg-slate-50",
                  task.status === "DONE" && "opacity-60"
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleStatusToggle(task)}
                  className={cn(
                    "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition",
                    task.status === "DONE"
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 hover:border-primary"
                  )}
                >
                  {task.status === "DONE" && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      task.status === "DONE" ? "text-slate-500 line-through" : "text-slate-900"
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    {task.deal && (
                      <Link href={`/deals/${task.deal.id}`} className="hover:text-primary">
                        {task.deal.title}
                      </Link>
                    )}
                    {task.contact && (
                      <Link href={`/contacts/${task.contact.id}`} className="hover:text-primary">
                        {task.contact.firstName} {task.contact.lastName}
                      </Link>
                    )}
                  </div>
                </div>

                {/* Priority */}
                <Badge variant={priorityColors[task.priority] as any} className="text-[10px]">
                  {task.priority}
                </Badge>

                {/* Due date */}
                <span
                  className={cn(
                    "text-xs whitespace-nowrap",
                    isOverdue(task.dueDate, task.status)
                      ? "font-medium text-red-600"
                      : "text-slate-500"
                  )}
                >
                  {task.dueDate
                    ? (isOverdue(task.dueDate, task.status) ? "Overdue: " : "") +
                      new Date(task.dueDate).toLocaleDateString()
                    : "No due date"}
                </span>

                {/* Assignee */}
                {task.assignee && (
                  <Avatar
                    name={task.assignee.name ?? "?"}
                    src={task.assignee.image ?? task.assignee.avatarUrl}
                    size="sm"
                    className="h-6 w-6 text-[10px]"
                  />
                )}

                {/* Status badge (for non-done) */}
                {task.status !== "DONE" && task.status !== "TODO" && (
                  <Badge variant="outline" className="text-[10px]">
                    {statusLabels[task.status]}
                  </Badge>
                )}

                {/* Actions */}
                <div className="flex gap-1">
                  {task.status !== "DONE" && task.status !== "IN_PROGRESS" && (
                    <button
                      onClick={() => updateTask.mutate({ id: task.id, data: { status: "IN_PROGRESS" } })}
                      className="rounded px-2 py-1 text-[11px] text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      Start
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("Delete this task?")) deleteTask.mutate(task.id);
                    }}
                    className="rounded px-2 py-1 text-[11px] text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            total={total}
            limit={limit}
            offset={offset}
            onPageChange={setOffset}
          />
        </div>
      )}

      {/* Create Task Modal */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <TaskForm
          onSubmit={(data) => {
            createTask.mutate(data, {
              onSuccess: () => setShowCreate(false),
            });
          }}
          onCancel={() => setShowCreate(false)}
          loading={createTask.isPending}
        />
      </Dialog>
    </PageWrapper>
  );
}
