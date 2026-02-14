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
} from "@/components/ui/index";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { TeamManagement } from "@/components/settings/team-management";

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
    if (!confirm(`Delete "${stage.name}"? This cannot be undone.`)) return;
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
  onUpdated,
}: {
  pipeline: any;
  onUpdated: () => void;
}) {
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#6B7280");
  const [adding, setAdding] = useState(false);

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
    if (!confirm(`Delete "${pipeline.name}"? This cannot be undone.`)) return;
    try {
      await pipelinesService.delete(pipeline.id);
      toast.success("Pipeline deleted");
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete pipeline");
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-900">
            {pipeline.name}
          </h3>
          {pipeline.isDefault && <Badge variant="success">Default</Badge>}
          <span className="text-sm text-slate-500">
            {pipeline._count?.deals ?? 0} deals
          </span>
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
