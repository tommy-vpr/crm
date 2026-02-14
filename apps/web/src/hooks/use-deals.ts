"use client";

import { useQuery } from "@tanstack/react-query";
import { dealsService } from "@/services/deals";
import type { DealFilters } from "@cultivated-crm/shared";

export function useDeals(filters?: DealFilters) {
  return useQuery({
    queryKey: ["deals", filters],
    queryFn: () => dealsService.list(filters),
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ["deal", id],
    queryFn: () => dealsService.getById(id),
    enabled: !!id,
  });
}

/**
 * Fetch deals for a specific pipeline — used by the board view.
 * Returns all deals (up to 200) for the pipeline in one request.
 */
export function usePipelineDeals(pipelineId: string) {
  return useQuery({
    queryKey: ["deals", { pipelineId }],
    queryFn: () => dealsService.list({ pipelineId, limit: 200 }),
    enabled: !!pipelineId,
  });
}
