"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { usePipelines } from "@/hooks/use-pipelines";
import { usePipelineDeals } from "@/hooks/use-deals";
import { useCreateDeal, useMoveDealStage } from "@/hooks/use-deal-mutations";
import { Button } from "@/components/ui/button";
import {
  Select,
  PageLoader,
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/index";
import { StageColumn } from "@/components/cards/stage-column";
import { DealCardInner } from "@/components/cards/deal-card";
import { DealForm } from "@/components/forms/deal-form";

export default function PipelinePage() {
  const { data: pipelines, isLoading: loadingPipelines } = usePipelines();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [createStageId, setCreateStageId] = useState<string>("");
  const [activeDeal, setActiveDeal] = useState<any>(null);

  // Select first/default pipeline
  const pipelineId = useMemo(() => {
    if (selectedPipelineId) return selectedPipelineId;
    if (!pipelines?.length) return "";
    const defaultPipeline = pipelines.find((p: any) => p.isDefault);
    return defaultPipeline?.id ?? pipelines[0]?.id ?? "";
  }, [selectedPipelineId, pipelines]);

  const currentPipeline = pipelines?.find((p: any) => p.id === pipelineId);

  const { data: dealsData, isLoading: loadingDeals } =
    usePipelineDeals(pipelineId);
  const createDeal = useCreateDeal();
  const moveDeal = useMoveDealStage();

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    if (currentPipeline?.stages) {
      for (const stage of currentPipeline.stages) {
        map[stage.id] = [];
      }
    }
    if (dealsData?.deals) {
      for (const deal of dealsData.deals) {
        if (map[deal.stageId]) {
          map[deal.stageId].push(deal);
        }
      }
    }
    for (const stageId of Object.keys(map)) {
      map[stageId].sort((a: any, b: any) => a.position - b.position);
    }
    return map;
  }, [currentPipeline, dealsData]);

  // Drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDeal(event.active.data.current?.deal ?? null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDeal(null);
      if (!over) {
        console.log("[DnD] No drop target");
        return;
      }

      const dealId = active.id as string;
      const deal = active.data.current?.deal;
      if (!deal) {
        console.log("[DnD] No deal data on active");
        return;
      }

      let targetStageId: string;
      let targetPosition: number | undefined;

      if (over.data.current?.type === "deal") {
        const overDeal = over.data.current.deal;
        targetStageId = overDeal.stageId;
        const stageDeals = dealsByStage[targetStageId] ?? [];
        const overIndex = stageDeals.findIndex((d: any) => d.id === over.id);
        targetPosition = overIndex >= 0 ? overIndex : undefined;
      } else {
        targetStageId = over.id as string;
      }

      if (deal.stageId === targetStageId && targetPosition === undefined) {
        console.log("[DnD] Same stage, no position change — skipping");
        return;
      }

      console.log(
        "[DnD] Moving",
        dealId,
        "from",
        deal.stageId,
        "to",
        targetStageId,
      );
      moveDeal.mutate({
        dealId,
        stageId: targetStageId,
        position: targetPosition,
      });
    },
    [dealsByStage, moveDeal],
  );

  const handleAddDeal = (stageId: string) => {
    setCreateStageId(stageId);
    setShowCreateDeal(true);
  };

  if (loadingPipelines) return <PageLoader />;

  if (!pipelines?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          No Pipeline Yet
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Create your first sales pipeline to start tracking deals.
        </p>
      </div>
    );
  }

  const stages = currentPipeline?.stages ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900">Pipeline</h1>
          {pipelines.length > 1 && (
            <Select
              value={pipelineId}
              onChange={(e) => setSelectedPipelineId(e.target.value)}
              className="w-48"
            >
              {pipelines.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p._count?.deals ?? 0})
                </option>
              ))}
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            {dealsData?.total ?? 0} deal
            {(dealsData?.total ?? 0) !== 1 ? "s" : ""}
          </span>
          <Button onClick={() => handleAddDeal(stages[0]?.id)}>
            + New Deal
          </Button>
        </div>
      </div>

      {/* Board */}
      {loadingDeals ? (
        <PageLoader />
      ) : (
        <div className="flex-1 overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full gap-3 p-4">
              {stages.map((stage: any) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  deals={dealsByStage[stage.id] ?? []}
                  onAddDeal={handleAddDeal}
                />
              ))}
            </div>

            <DragOverlay>
              {activeDeal && <DealCardInner deal={activeDeal} isOverlay />}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Create Deal Modal */}
      <Dialog open={showCreateDeal} onClose={() => setShowCreateDeal(false)}>
        <DialogHeader>
          <DialogTitle>New Deal</DialogTitle>
        </DialogHeader>
        <DealForm
          stages={stages}
          pipelineId={pipelineId}
          defaultStageId={createStageId}
          onSubmit={(data) => {
            createDeal.mutate(data, {
              onSuccess: () => setShowCreateDeal(false),
            });
          }}
          onCancel={() => setShowCreateDeal(false)}
          loading={createDeal.isPending}
        />
      </Dialog>
    </div>
  );
}
