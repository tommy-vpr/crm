"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companiesService } from "@/services/companies";
import type { CompanyFilters } from "@/services/companies";
import { toast } from "sonner";

export function useCompanies(filters?: CompanyFilters) {
  return useQuery({
    queryKey: ["companies", filters],
    queryFn: () => companiesService.list(filters),
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ["company", id],
    queryFn: () => companiesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => companiesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company created");
    },
    onError: () => toast.error("Failed to create company"),
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      companiesService.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["company", updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company updated");
    },
    onError: () => toast.error("Failed to update company"),
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => companiesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted");
    },
    onError: () => toast.error("Failed to delete company"),
  });
}
