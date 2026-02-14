"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, Badge } from "@/components/ui/index";
import { cn } from "@/lib/utils";

interface DealCardProps {
  deal: any;
  isDragging?: boolean;
  isOverlay?: boolean;
}

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

function formatCurrency(value: number | null | undefined) {
  if (!value) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function daysInStage(updatedAt: string) {
  const days = Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function SortableDealCard({ deal }: { deal: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id, data: { type: "deal", deal } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCardInner deal={deal} isDragging={isDragging} />
    </div>
  );
}

export const DealCardInner = forwardRef<HTMLDivElement, DealCardProps>(
  function DealCardInner({ deal, isDragging, isOverlay }, ref) {
    const primaryContact = deal.contacts?.[0]?.contact;

    return (
      <div
        ref={ref}
        className={cn(
          "group cursor-grab rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
          isDragging && "opacity-50",
          isOverlay && "rotate-2 shadow-lg"
        )}
      >
        <Link
          href={`/deals/${deal.id}`}
          className="block"
          onClick={(e) => {
            // Prevent navigation while dragging
            if (isDragging) e.preventDefault();
          }}
        >
          <p className="text-sm font-medium text-slate-900 line-clamp-2">
            {deal.title}
          </p>

          {deal.company && (
            <p className="mt-0.5 text-xs text-slate-500">{deal.company.name}</p>
          )}

          <div className="mt-2 flex items-center justify-between">
            {deal.value ? (
              <span className="text-sm font-semibold text-slate-900">
                {formatCurrency(deal.value)}
              </span>
            ) : (
              <span className="text-xs text-slate-400">No value</span>
            )}

            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                priorityColors[deal.priority] ?? priorityColors.MEDIUM
              )}
            >
              {deal.priority}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {deal.owner && (
                <Avatar
                  name={deal.owner.name ?? "?"}
                  src={deal.owner.image ?? deal.owner.avatarUrl}
                  size="sm"
                  className="h-5 w-5 text-[9px]"
                />
              )}
              {primaryContact && (
                <span className="text-[11px] text-slate-500 truncate max-w-[100px]">
                  {primaryContact.firstName} {primaryContact.lastName}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">
              {daysInStage(deal.updatedAt)}
            </span>
          </div>
        </Link>
      </div>
    );
  }
);
