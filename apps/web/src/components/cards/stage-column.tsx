"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableDealCard } from "@/components/cards/deal-card";
import { cn } from "@/lib/utils";

interface StageColumnProps {
  stage: {
    id: string;
    name: string;
    color: string;
    isWon?: boolean;
    isLost?: boolean;
  };
  deals: any[];
  onAddDeal: (stageId: string) => void;
}

function formatTotal(deals: any[]) {
  const total = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  if (total === 0) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    notation: total >= 1_000_000 ? "compact" : "standard",
  }).format(total);
}

export function StageColumn({ stage, deals, onAddDeal }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const dealIds = deals.map((d) => d.id);
  const total = formatTotal(deals);

  return (
    <div className="flex h-full w-72 flex-shrink-0 flex-col rounded-lg bg-slate-100/70">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-sm font-semibold text-slate-700">
            {stage.name}
          </h3>
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            {deals.length}
          </span>
        </div>
        <button
          onClick={() => onAddDeal(stage.id)}
          className="rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
          title="Add deal"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Total value */}
      {total && (
        <div className="px-3 pb-1">
          <span className="text-xs font-medium text-slate-500">{total}</span>
        </div>
      )}

      {/* Cards area */}
      <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 transition-colors",
            isOver && "bg-primary/5 rounded-b-lg"
          )}
          style={{ minHeight: 100 }}
        >
          {deals.map((deal) => (
            <SortableDealCard key={deal.id} deal={deal} />
          ))}

          {deals.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-8">
              <p className="text-xs text-slate-400">No deals</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
