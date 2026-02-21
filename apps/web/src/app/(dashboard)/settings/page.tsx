"use client";

import { useState } from "react";
import {
  usePipelines,
  useCreatePipeline,
  useReorderStages,
} from "@/hooks/use-pipelines";
import { pipelinesService } from "@/services/pipelines";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  PageLoader,
  Dialog,
  DialogHeader,
  DialogTitle,
  Badge,
  Select,
} from "@/components/ui/index";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { TeamManagement } from "@/components/settings/team-management";
import { useSession } from "next-auth/react";
import { useConfirm } from "@/components/ui/confirm-dialog";

// ─── Stage Editor Row ────────────────────────────────────────────

function StageRow({
  stage,
  pipelineId,
  onUpdated,
}: {
  stage: any;
  pipelineId: string;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);
  const [color, setColor] = useState(stage.color);
  const [probability, setProbability] = useState(stage.probability);
  const [saving, setSaving] = useState(false);

  const confirm = useConfirm();

  const handleSave = async () => {
    setSaving(true);
    try {
      await pipelinesService.updateStage(pipelineId, stage.id, {
        name,
        color,
        probability: Number(probability),
      });
      toast.success("Stage updated");
      setEditing(false);
      onUpdated();
    } catch {
      toast.error("Failed to update stage");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete Stage",
      message:
        stage._count?.deals > 0
          ? `This stage has ${stage._count.deals} active deal${stage._count.deals !== 1 ? "s" : ""}. Move them first.`
          : `Delete "${stage.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await pipelinesService.deleteStage(pipelineId, stage.id);
      toast.success("Stage deleted");
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete stage");
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border-0"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-[180px]"
        />
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={100}
            value={probability}
            onChange={(e) => setProbability(e.target.value)}
            className="w-16"
          />
          <span className="text-xs text-slate-500">%</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={handleSave} loading={saving}>
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setName(stage.name);
              setColor(stage.color);
              setProbability(stage.probability);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-slate-50">
      <span
        className="h-4 w-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: stage.color }}
      />
      <span className="text-sm font-medium text-slate-900 flex-1">
        {stage.name}
      </span>
      <span className="text-xs text-slate-500">{stage.probability}%</span>
      {stage.isWon && <Badge variant="success">Won</Badge>}
      {stage.isLost && <Badge variant="destructive">Lost</Badge>}
      <span className="text-xs text-slate-400">
        {stage._count?.deals ?? 0} deals
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="rounded px-2 py-1 text-xs text-slate-400 transition hover:bg-red-50 hover:text-destructive"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Pipeline Card ───────────────────────────────────────────────

function PipelineCard({
  pipeline,
  allPipelines,
  onUpdated,
}: {
  pipeline: any;
  allPipelines: any[];
  onUpdated: () => void;
}) {
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#6B7280");
  const [adding, setAdding] = useState(false);
  const [showMigrate, setShowMigrate] = useState(false);
  const [targetPipelineId, setTargetPipelineId] = useState("");
  const [migrating, setMigrating] = useState(false);
  const { data: session } = useSession();
  const isOwner = session?.user?.id === pipeline.createdBy?.id;
  const confirm = useConfirm();

  const otherPipelines = allPipelines.filter((p) => p.id !== pipeline.id);
  const dealCount = pipeline._count?.deals ?? 0;

  const handleAddStage = async () => {
    if (!newStageName.trim()) return;
    setAdding(true);
    try {
      await pipelinesService.addStage(pipeline.id, {
        name: newStageName.trim(),
        color: newStageColor,
      });
      toast.success("Stage added");
      setNewStageName("");
      setShowAddStage(false);
      onUpdated();
    } catch {
      toast.error("Failed to add stage");
    } finally {
      setAdding(false);
    }
  };

  const handleSetDefault = async () => {
    try {
      await pipelinesService.update(pipeline.id, { isDefault: true });
      toast.success("Set as default pipeline");
      onUpdated();
    } catch {
      toast.error("Failed to update pipeline");
    }
  };

  const handleDelete = async () => {
    // If pipeline has deals, show migration dialog
    if (dealCount > 0) {
      if (otherPipelines.length === 0) {
        toast.error(
          "This is your only pipeline. Delete or close all deals before removing it.",
        );
        return;
      }
      setShowMigrate(true);
      return;
    }

    // No deals — simple delete with confirmation
    const ok = await confirm({
      title: "Delete Pipeline",
      message: "This will permanently delete the pipeline and all its stages.",
      confirmLabel: "Delete",
      typeToConfirm: pipeline.name,
    });
    if (!ok) return;

    try {
      await pipelinesService.delete(pipeline.id);
      toast.success("Pipeline deleted");
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete pipeline");
    }
  };

  const handleMigrateAndDelete = async () => {
    if (!targetPipelineId) return;
    setMigrating(true);
    try {
      const res = await fetch(`/api/pipelines/${pipeline.id}/migrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPipelineId,
          deleteAfterMigrate: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Migration failed");
      }
      const result = await res.json();
      toast.success(
        `Moved ${result.migratedDeals} deal${result.migratedDeals !== 1 ? "s" : ""} and deleted pipeline`,
      );
      setShowMigrate(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to migrate deals");
    } finally {
      setMigrating(false);
    }
  };

  const targetPipeline = otherPipelines.find((p) => p.id === targetPipelineId);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-900">
            {pipeline.name}
          </h3>
          {pipeline.isDefault && <Badge variant="success">Default</Badge>}
          <span className="text-sm text-slate-500">
            {dealCount} deal{dealCount !== 1 ? "s" : ""}
          </span>
          {pipeline.createdBy && (
            <span className="text-xs text-slate-400">
              by{" "}
              {isOwner
                ? "you"
                : pipeline.createdBy.name || pipeline.createdBy.email}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!pipeline.isDefault && (
            <Button variant="outline" size="sm" onClick={handleSetDefault}>
              Set Default
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddStage(true)}
          >
            + Stage
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:bg-destructive/10"
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {pipeline.stages
          ?.sort((a: any, b: any) => a.position - b.position)
          .map((stage: any) => (
            <StageRow
              key={stage.id}
              stage={stage}
              pipelineId={pipeline.id}
              onUpdated={onUpdated}
            />
          ))}
      </div>

      {showAddStage && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-dashed p-3">
          <input
            type="color"
            value={newStageColor}
            onChange={(e) => setNewStageColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border-0"
          />
          <Input
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            placeholder="Stage name..."
            className="max-w-[200px]"
            onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
          />
          <Button size="sm" onClick={handleAddStage} loading={adding}>
            Add
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddStage(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* ── Migrate Deals Dialog ── */}
      <Dialog
        open={showMigrate}
        onClose={() => {
          setShowMigrate(false);
          setTargetPipelineId("");
        }}
      >
        <DialogHeader>
          <DialogTitle>Move Deals & Delete Pipeline</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">
              "{pipeline.name}" has {dealCount} deal
              {dealCount !== 1 ? "s" : ""}
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Choose a pipeline to move them to. Deals will be mapped to
              matching stages by position (e.g. first stage → first stage).
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Move deals to:</label>
            <Select
              value={targetPipelineId}
              onChange={(e) => setTargetPipelineId(e.target.value)}
              className="mt-1"
            >
              <option value="">Select pipeline...</option>
              {otherPipelines.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.stages?.length ?? 0} stages,{" "}
                  {p._count?.deals ?? 0} existing deals)
                </option>
              ))}
            </Select>
          </div>
          {/* Stage mapping preview */}
          {targetPipeline && (
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                Stage Mapping Preview
              </p>
              <div className="space-y-1.5">
                {pipeline.stages
                  ?.sort((a: any, b: any) => a.position - b.position)
                  .map((sourceStage: any, i: number) => {
                    const targetStages = targetPipeline.stages?.sort(
                      (a: any, b: any) => a.position - b.position,
                    );
                    const targetStage =
                      targetStages?.[
                        Math.min(i, (targetStages?.length ?? 1) - 1)
                      ];
                    return (
                      <div
                        key={sourceStage.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: sourceStage.color,
                            }}
                          />
                          {sourceStage.name}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: targetStage?.color ?? "#6B7280",
                            }}
                          />
                          {targetStage?.name ?? "—"}
                        </span>
                        {sourceStage._count?.deals > 0 && (
                          <span className="text-xs text-slate-400">
                            ({sourceStage._count.deals} deal
                            {sourceStage._count.deals !== 1 ? "s" : ""})
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowMigrate(false);
                setTargetPipelineId("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!targetPipelineId}
              loading={migrating}
              onClick={handleMigrateAndDelete}
            >
              Move {dealCount} Deal{dealCount !== 1 ? "s" : ""} & Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

// ─── Settings Page ───────────────────────────────────────────────

export default function SettingsPage() {
  const { data: pipelines, isLoading } = usePipelines();
  const createPipeline = useCreatePipeline();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    queryClient.invalidateQueries({ queryKey: ["deals"] });
  };

  const handleCreatePipeline = () => {
    if (!newPipelineName.trim()) return;
    createPipeline.mutate(
      { name: newPipelineName.trim() },
      {
        onSuccess: () => {
          setNewPipelineName("");
          setShowCreate(false);
        },
      },
    );
  };

  if (isLoading) return <PageLoader />;

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your pipelines, stages, and CRM configuration
        </p>
      </div>

      <TeamManagement />

      {/* Pipeline Management */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Pipelines</h2>
          <Button onClick={() => setShowCreate(true)}>+ New Pipeline</Button>
        </div>

        <div className="space-y-6">
          {pipelines?.map((pipeline: any) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              allPipelines={pipelines}
              onUpdated={refresh}
            />
          ))}
        </div>

        {(!pipelines || pipelines.length === 0) && (
          <Card className="p-8 text-center">
            <p className="text-slate-500">No pipelines created yet.</p>
            <Button className="mt-3" onClick={() => setShowCreate(true)}>
              Create Your First Pipeline
            </Button>
          </Card>
        )}
      </section>

      {/* Create Pipeline Modal */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader>
          <DialogTitle>New Pipeline</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            A new pipeline will be created with default stages (Lead → Qualified
            → Proposal → Negotiation → Won → Lost). You can customize them
            after.
          </p>
          <div>
            <label className="text-sm font-medium">Pipeline Name</label>
            <Input
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              placeholder="e.g. Enterprise Sales"
              onKeyDown={(e) => e.key === "Enter" && handleCreatePipeline()}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePipeline}
              disabled={!newPipelineName.trim()}
              loading={createPipeline.isPending}
            >
              Create Pipeline
            </Button>
          </div>
        </div>
      </Dialog>
    </PageWrapper>
  );
}
