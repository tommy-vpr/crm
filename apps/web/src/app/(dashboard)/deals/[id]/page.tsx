"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useDeal } from "@/hooks/use-deals";
import {
  useUpdateDeal,
  useDeleteDeal,
  useMoveDealStage,
  useAddDealContact,
  useRemoveDealContact,
} from "@/hooks/use-deal-mutations";
import { useCreateActivity } from "@/hooks/use-activities";
import { useContacts } from "@/hooks/use-contacts";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  Badge,
  Card,
  PageLoader,
  Dialog,
  DialogHeader,
  DialogTitle,
  Select,
} from "@/components/ui/index";
import { DealForm } from "@/components/forms/deal-form";
import { ActivityForm } from "@/components/forms/activity-form";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  LOW: "secondary",
  MEDIUM: "outline",
  HIGH: "warning",
  URGENT: "destructive",
};

function formatCurrency(value: number | null | undefined) {
  if (!value) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);

  const { data: deal, isLoading } = useDeal(id);

  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const moveDeal = useMoveDealStage();
  const createActivity = useCreateActivity();
  const addContact = useAddDealContact();
  const removeContact = useRemoveDealContact();
  const { data: allContacts } = useContacts({ limit: 100 });

  if (isLoading) return <PageLoader />;
  if (!deal) {
    return (
      <PageWrapper>
        <div className="py-12 text-center">
          <p className="text-slate-500">Deal not found</p>
          <Link href="/pipeline" className="mt-2 text-sm text-primary hover:underline">
            Back to pipeline
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const stages = deal.pipeline?.stages ?? [];
  const currentStageIndex = stages.findIndex((s: any) => s.id === deal.stageId);
  const associatedContactIds = new Set(deal.contacts?.map((dc: any) => dc.contact.id) ?? []);
  const availableContacts = allContacts?.contacts?.filter(
    (c: any) => !associatedContactIds.has(c.id)
  ) ?? [];

  return (
    <PageWrapper>
      {/* Back link */}
      <Link href="/pipeline" className="text-sm text-slate-500 hover:text-slate-700">
        &larr; Back to pipeline
      </Link>

      {/* Header */}
      <div className="mt-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{deal.title}</h1>
            <Badge variant={priorityColors[deal.priority] as any}>
              {deal.priority}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
            {deal.company && (
              <Link href={`/companies/${deal.company.id}`} className="hover:text-primary">
                {deal.company.name}
              </Link>
            )}
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(deal.value)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowActivity(true)}>
            Log Activity
          </Button>
          <Button variant="outline" onClick={() => setShowEdit(true)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Delete this deal?")) {
                deleteDeal.mutate(id, {
                  onSuccess: () => router.push("/pipeline"),
                });
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Stage Progress Bar */}
      <div className="mt-6">
        <div className="flex gap-1">
          {stages.map((stage: any, i: number) => {
            const isCurrent = stage.id === deal.stageId;
            const isPast = i < currentStageIndex;
            const isWon = stage.isWon && isCurrent;
            const isLost = stage.isLost && isCurrent;

            return (
              <button
                key={stage.id}
                onClick={() => {
                  if (stage.id !== deal.stageId) {
                    moveDeal.mutate({ dealId: id, stageId: stage.id });
                  }
                }}
                className={cn(
                  "flex-1 rounded-sm py-2 text-center text-xs font-medium transition-all",
                  isCurrent && !isWon && !isLost && "text-white",
                  isPast && "bg-primary/20 text-primary",
                  isWon && "bg-emerald-500 text-white",
                  isLost && "bg-red-500 text-white",
                  !isCurrent && !isPast && "bg-slate-100 text-slate-400 hover:bg-slate-200",
                )}
                style={isCurrent && !isWon && !isLost ? { backgroundColor: stage.color } : undefined}
              >
                {stage.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="mt-6 grid grid-cols-3 gap-6">
        {/* Left: Details + Activities */}
        <div className="col-span-2 space-y-6">
          {/* Deal Info */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Deal Info
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Value</dt>
                <dd className="font-medium text-slate-900">{formatCurrency(deal.value)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Stage</dt>
                <dd>
                  <Badge style={{ backgroundColor: deal.stage?.color, color: "white" }}>
                    {deal.stage?.name}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Priority</dt>
                <dd>
                  <Badge variant={priorityColors[deal.priority] as any}>{deal.priority}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Owner</dt>
                <dd className="font-medium text-slate-900">
                  {deal.owner ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={deal.owner.name ?? "?"} src={deal.owner.image} size="sm" />
                      {deal.owner.name}
                    </div>
                  ) : (
                    "Unassigned"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Expected Close</dt>
                <dd className="font-medium text-slate-900">
                  {deal.expectedCloseDate
                    ? new Date(deal.expectedCloseDate).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="font-medium text-slate-900">
                  {new Date(deal.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
            {deal.description && (
              <div className="mt-4 border-t pt-4">
                <dt className="text-sm text-slate-500">Description</dt>
                <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                  {deal.description}
                </dd>
              </div>
            )}
          </Card>

          {/* Activity Timeline */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Activity ({deal.activities?.length ?? 0})
              </h2>
              <Button variant="outline" size="sm" onClick={() => setShowActivity(true)}>
                + Log
              </Button>
            </div>
            {deal.activities?.length > 0 ? (
              <div className="space-y-4">
                {deal.activities.map((activity: any) => (
                  <div key={activity.id} className="flex gap-3 border-l-2 border-slate-200 pl-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {activity.type.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {new Date(activity.occurredAt).toLocaleDateString()}{" "}
                          {new Date(activity.occurredAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900">{activity.title}</p>
                      {activity.description && (
                        <p className="mt-0.5 text-sm text-slate-600">{activity.description}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">by {activity.user?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No activity recorded yet</p>
            )}
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Contacts */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Contacts ({deal.contacts?.length ?? 0})
              </h2>
              <Button variant="outline" size="sm" onClick={() => setShowAddContact(true)}>
                + Add
              </Button>
            </div>
            {deal.contacts?.length > 0 ? (
              <div className="space-y-2">
                {deal.contacts.map((dc: any) => (
                  <div key={dc.contact.id} className="flex items-center justify-between rounded-md border p-2.5">
                    <Link href={`/contacts/${dc.contact.id}`} className="flex items-center gap-2">
                      <Avatar
                        name={`${dc.contact.firstName} ${dc.contact.lastName}`}
                        size="sm"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {dc.contact.firstName} {dc.contact.lastName}
                        </p>
                        {dc.role && (
                          <p className="text-[11px] text-slate-500">{dc.role}</p>
                        )}
                      </div>
                    </Link>
                    <button
                      onClick={() =>
                        removeContact.mutate({ dealId: id, contactId: dc.contact.id })
                      }
                      className="text-xs text-slate-400 hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No contacts linked</p>
            )}
          </Card>

          {/* Tasks */}
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Open Tasks ({deal.tasks?.length ?? 0})
            </h2>
            {deal.tasks?.length > 0 ? (
              <div className="space-y-2">
                {deal.tasks.map((task: any) => (
                  <div key={task.id} className="rounded-md border p-2.5">
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      {task.dueDate && (
                        <span
                          className={
                            new Date(task.dueDate) < new Date()
                              ? "text-destructive font-medium"
                              : ""
                          }
                        >
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.assignee && <span>• {task.assignee.name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No open tasks</p>
            )}
          </Card>

          {/* Stats */}
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Summary
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Activities</dt>
                <dd className="font-medium">{deal._count?.activities ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Tasks</dt>
                <dd className="font-medium">{deal._count?.tasks ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Contacts</dt>
                <dd className="font-medium">{deal._count?.contacts ?? 0}</dd>
              </div>
              {deal.actualCloseDate && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Closed</dt>
                  <dd className="font-medium">
                    {new Date(deal.actualCloseDate).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>

      {/* Edit Deal Modal */}
      <Dialog open={showEdit} onClose={() => setShowEdit(false)}>
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>
        <DealForm
          stages={stages}
          pipelineId={deal.pipelineId}
          defaultValues={{
            title: deal.title,
            value: deal.value ?? undefined,
            stageId: deal.stageId,
            pipelineId: deal.pipelineId,
            companyId: deal.companyId ?? undefined,
            priority: deal.priority,
            expectedCloseDate: deal.expectedCloseDate
              ? new Date(deal.expectedCloseDate)
              : undefined,
            description: deal.description ?? undefined,
          }}
          onSubmit={(data) => {
            updateDeal.mutate(
              { dealId: id, data },
              { onSuccess: () => setShowEdit(false) }
            );
          }}
          onCancel={() => setShowEdit(false)}
          loading={updateDeal.isPending}
          submitLabel="Save Changes"
        />
      </Dialog>

      {/* Activity Modal */}
      <Dialog open={showActivity} onClose={() => setShowActivity(false)}>
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>
        <ActivityForm
          dealId={id}
          onSubmit={(data) => {
            createActivity.mutate(data, {
              onSuccess: () => setShowActivity(false),
            });
          }}
          onCancel={() => setShowActivity(false)}
          loading={createActivity.isPending}
        />
      </Dialog>

      {/* Add Contact Modal */}
      <Dialog open={showAddContact} onClose={() => setShowAddContact(false)}>
        <DialogHeader>
          <DialogTitle>Add Contact to Deal</DialogTitle>
        </DialogHeader>
        <AddContactForm
          contacts={availableContacts}
          onSubmit={(contactId, role) => {
            addContact.mutate(
              { dealId: id, contactId, role },
              { onSuccess: () => setShowAddContact(false) }
            );
          }}
          onCancel={() => setShowAddContact(false)}
          loading={addContact.isPending}
        />
      </Dialog>
    </PageWrapper>
  );
}

// ─── Inline Add Contact Form ────────────────────────────────────

function AddContactForm({
  contacts,
  onSubmit,
  onCancel,
  loading,
}: {
  contacts: any[];
  onSubmit: (contactId: string, role?: string) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [role, setRole] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Contact</label>
        <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Select a contact...</option>
          {contacts.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ""}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Role (optional)</label>
        <input
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Decision Maker, Champion, End User"
        />
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => onSubmit(selectedId, role || undefined)}
          disabled={!selectedId}
          loading={loading}
        >
          Add Contact
        </Button>
      </div>
    </div>
  );
}
