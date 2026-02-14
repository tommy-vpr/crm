"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsService } from "@/services/contacts";
import { toast } from "sonner";
import type { ContactFilters } from "@cultivated-crm/shared";

// ─── QUERIES ──────────────────────────────────────────────────

export function useContacts(filters?: ContactFilters) {
  return useQuery({
    queryKey: ["contacts", filters],
    queryFn: () => contactsService.list(filters),
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: () => contactsService.getById(id),
    enabled: !!id,
  });
}

// ─── MUTATIONS ────────────────────────────────────────────────

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => contactsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact created");
    },
    onError: () => toast.error("Failed to create contact"),
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      contactsService.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["contact", updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact updated");
    },
    onError: () => toast.error("Failed to update contact"),
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted");
    },
    onError: () => toast.error("Failed to delete contact"),
  });
}
