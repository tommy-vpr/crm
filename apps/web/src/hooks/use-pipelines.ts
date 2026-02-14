"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pipelinesService } from "@/services/pipelines";
import { toast } from "sonner";

export function usePipelines() {
  return useQuery({
    queryKey: ["pipelines"],
    queryFn: () => pipelinesService.list(),
  });
}

export function usePipeline(id: string) {
  return useQuery({
    queryKey: ["pipeline", id],
    queryFn: () => pipelinesService.getById(id),
    enabled: !!id,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => pipelinesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Pipeline created");
    },
    onError: () => toast.error("Failed to create pipeline"),
  });
}

export function useReorderStages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pipelineId, stageIds }: { pipelineId: string; stageIds: string[] }) =>
      pipelinesService.reorderStages(pipelineId, stageIds),
    onSuccess: (data) => {
      queryClient.setQueryData(["pipeline", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
    onError: () => toast.error("Failed to reorder stages"),
  });
}
