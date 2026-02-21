"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Deal {
  id: string;
  stageId: string;
  [key: string]: unknown;
}

/**
 * Move a deal to a new stage with optimistic UI update.
 * On success, merges server response to catch side effects
 * (e.g., actualCloseDate auto-set on Won/Lost).
 */
export function useMoveDealStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      stageId,
      position,
    }: {
      dealId: string;
      stageId: string;
      position?: number;
    }) => {
      const res = await fetch(`/api/deals/${dealId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, position }),
      });
      if (!res.ok) throw new Error("Failed to update deal stage");
      return res.json() as Promise<Deal>;
    },

    onMutate: async ({ dealId, stageId }) => {
      await queryClient.cancelQueries({ queryKey: ["deals"] });
      const previousQueries = queryClient.getQueriesData({
        queryKey: ["deals"],
      });

      queryClient.setQueriesData({ queryKey: ["deals"] }, (old: any) => {
        if (!old) return old;
        if (old.deals) {
          return {
            ...old,
            deals: old.deals.map((d: any) =>
              d.id === dealId ? { ...d, stageId } : d,
            ),
          };
        }
        if (Array.isArray(old)) {
          return old.map((d: any) => (d.id === dealId ? { ...d, stageId } : d));
        }
        return old;
      });

      return { previousQueries };
    },

    onError: (_err, _variables, context) => {
      context?.previousQueries?.forEach(([key, data]: [any, any]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error("Failed to move deal. Reverted.");
    },

    onSuccess: (serverDeal) => {
      queryClient.setQueryData(["deal", serverDeal.id], serverDeal);
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal moved");
    },
  });
}

/**
 * Create a new deal.
 */
export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create deal");
      return res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stats"] });
      toast.success("Deal created");
    },

    onError: () => {
      toast.error("Failed to create deal");
    },
  });
}

/**
 * Update a deal's fields.
 */
export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      data,
    }: {
      dealId: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update deal");
      return res.json();
    },

    onSuccess: (serverDeal) => {
      queryClient.setQueryData(["deal", serverDeal.id], serverDeal);
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal updated");
    },

    onError: () => {
      toast.error("Failed to update deal");
    },
  });
}

/**
 * Delete a deal.
 */
export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId: string) => {
      const res = await fetch(`/api/deals/${dealId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete deal");
      return res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stats"] });
      toast.success("Deal deleted");
    },

    onError: () => {
      toast.error("Failed to delete deal");
    },
  });
}

/**
 * Add a contact to a deal.
 */
export function useAddDealContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      contactId,
      role,
    }: {
      dealId: string;
      contactId: string;
      role?: string;
    }) => {
      const res = await fetch(`/api/deals/${dealId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, role }),
      });
      if (!res.ok) throw new Error("Failed to add contact");
      return res.json();
    },

    onSuccess: (_data, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      toast.success("Contact added to deal");
    },

    onError: () => toast.error("Failed to add contact"),
  });
}

/**
 * Remove a contact from a deal.
 */
export function useRemoveDealContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      contactId,
    }: {
      dealId: string;
      contactId: string;
    }) => {
      const res = await fetch(`/api/deals/${dealId}/contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) throw new Error("Failed to remove contact");
      return res.json();
    },

    onSuccess: (_data, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      toast.success("Contact removed");
    },

    onError: () => toast.error("Failed to remove contact"),
  });
}
