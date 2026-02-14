"use client";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ label, value, subValue, trend, className }: StatCardProps) {
  return (
    <div className={cn("rounded-lg border bg-white p-5", className)}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {subValue && (
          <span
            className={cn(
              "text-sm font-medium",
              trend === "up" && "text-emerald-600",
              trend === "down" && "text-red-600",
              (!trend || trend === "neutral") && "text-slate-500"
            )}
          >
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}
