"use client";

import { useState } from "react";
import Link from "next/link";
import { useDeals } from "@/hooks/use-deals";
import { usePipelines } from "@/hooks/use-pipelines";
import { useCreateDeal, useDeleteDeal } from "@/hooks/use-deal-mutations";
import { useBulkOperation } from "@/hooks/use-bulk";
import { useDebounce } from "@/hooks/use-debounce";
import { PageWrapper } from "@/components/layout/page-wrapper";
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
import { DealForm } from "@/components/forms/deal-form";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  LOW: "secondary",
  MEDIUM: "outline",
  HIGH: "warning",
  URGENT: "destructive",
};

function formatCurrency(value: number | null | undefined) {
  if (!value) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function DealsPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPriority, setBulkPriority] = useState("");
  const limit = 30;

  const debouncedSearch = useDebounce(search);
  const { data: pipelines } = usePipelines();
  const defaultPipeline = pipelines?.find((p: any) => p.isDefault) ?? pipelines?.[0];

  const { data, isLoading } = useDeals({
    search: debouncedSearch || undefined,
    stageId: stageFilter || undefined,
    priority: priorityFilter || undefined,
    pipelineId: defaultPipeline?.id,
    limit,
    offset,
  });

  const createDeal = useCreateDeal();
  const deleteDeal = useDeleteDeal();
  const bulkOp = useBulkOperation();

  const deals = data?.deals ?? [];
  const total = data?.total ?? 0;
  const stages = defaultPipeline?.stages ?? [];

  const allSelected = deals.length > 0 && deals.every((d: any) => selected.has(d.id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(deals.map((d: any) => d.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} deal(s)?`)) return;
    bulkOp.mutate(
      { entity: "deals", action: "delete", ids: Array.from(selected) },
      { onSuccess: () => setSelected(new Set()) }
    );
  }

  function handleBulkPriority() {
    if (!bulkPriority) return;
    bulkOp.mutate(
      { entity: "deals", action: "update_priority", ids: Array.from(selected), priority: bulkPriority },
      { onSuccess: () => { setSelected(new Set()); setBulkPriority(""); } }
    );
  }

  function handleExport() {
    window.open("/api/export?type=deals", "_blank");
  }

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deals</h1>
          <p className="text-sm text-slate-500">
            {total} deal{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
          <Link href="/pipeline">
            <Button variant="outline">Board View</Button>
          </Link>
          <Button onClick={() => setShowCreate(true)}>+ New Deal</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <Input
          placeholder="Search deals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="w-40"
        >
          <option value="">All Stages</option>
          {stages.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-36"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </Select>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <div className="h-4 w-px bg-primary/20" />
          <Select
            value={bulkPriority}
            onChange={(e) => setBulkPriority(e.target.value)}
            className="h-8 w-36 text-xs"
          >
            <option value="">Set priority...</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
          {bulkPriority && (
            <Button size="sm" onClick={handleBulkPriority} disabled={bulkOp.isPending}>
              Apply
            </Button>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={bulkOp.isPending}
          >
            Delete
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <PageLoader />
      ) : deals.length === 0 ? (
        <EmptyState
          title="No deals yet"
          description={search ? "Try a different search term" : "Create your first deal to start tracking"}
          action={
            !search ? (
              <Button onClick={() => setShowCreate(true)}>+ New Deal</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3">Deal</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Close Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {deals.map((deal: any) => (
                <tr
                  key={deal.id}
                  className={cn(
                    "transition hover:bg-slate-50",
                    selected.has(deal.id) && "bg-primary/5"
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(deal.id)}
                      onChange={() => toggleOne(deal.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/deals/${deal.id}`} className="font-medium text-slate-900 hover:text-primary">
                      {deal.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {formatCurrency(deal.value)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge style={{ backgroundColor: deal.stage?.color, color: "white" }}>
                      {deal.stage?.name}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={priorityColors[deal.priority] as any}>
                      {deal.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {deal.company ? (
                      <Link href={`/companies/${deal.company.id}`} className="hover:text-primary">
                        {deal.company.name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {deal.owner ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={deal.owner.name ?? "?"} src={deal.owner.image} size="sm" />
                        <span className="text-slate-600">{deal.owner.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {deal.expectedCloseDate
                      ? new Date(deal.expectedCloseDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm("Delete this deal?")) {
                          deleteDeal.mutate(deal.id);
                        }
                      }}
                      className="text-xs text-slate-400 transition hover:text-destructive"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination total={total} limit={limit} offset={offset} onPageChange={setOffset} />
        </div>
      )}

      {/* Create Deal Modal */}
      {defaultPipeline && (
        <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
          </DialogHeader>
          <DealForm
            stages={stages}
            pipelineId={defaultPipeline.id}
            onSubmit={(data) => {
              createDeal.mutate(data, {
                onSuccess: () => setShowCreate(false),
              });
            }}
            onCancel={() => setShowCreate(false)}
            loading={createDeal.isPending}
          />
        </Dialog>
      )}
    </PageWrapper>
  );
}
