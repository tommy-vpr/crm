"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { activitiesService } from "@/services/activities";
import { toast } from "sonner";

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => activitiesService.create(data),
    onSuccess: (_data, variables) => {
      // Invalidate the parent entity to refresh its activity timeline
      if (variables.contactId) {
        queryClient.invalidateQueries({ queryKey: ["contact", variables.contactId] });
      }
      if (variables.dealId) {
        queryClient.invalidateQueries({ queryKey: ["deal", variables.dealId] });
      }
      if (variables.companyId) {
        queryClient.invalidateQueries({ queryKey: ["company", variables.companyId] });
      }
      toast.success("Activity logged");
    },
    onError: () => toast.error("Failed to log activity"),
  });
}
