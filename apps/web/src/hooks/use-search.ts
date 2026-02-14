"use client";

import { useQuery } from "@tanstack/react-query";
import { searchService } from "@/services/search";

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ["global-search", query],
    queryFn: () => searchService.search(query),
    enabled: query.length >= 2,
    staleTime: 10000,
  });
}
