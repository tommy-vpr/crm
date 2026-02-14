"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics";

export function useDashboardStats(days?: number) {
  return useQuery({
    queryKey: ["dashboard-stats", days],
    queryFn: () => analyticsService.getDashboard(days),
    refetchInterval: 60000, // Refresh every minute
  });
}
