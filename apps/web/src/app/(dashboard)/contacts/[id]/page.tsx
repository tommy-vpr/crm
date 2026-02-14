"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useContact, useUpdateContact, useDeleteContact } from "@/hooks/use-contacts";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useCreateActivity } from "@/hooks/use-activities";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Avatar,
  Card,
  PageLoader,
  Dialog,
  DialogHeader,
  DialogTitle,
  Select,
} from "@/components/ui/index";
import { ContactForm } from "@/components/forms/contact-form";
import { ActivityForm } from "@/components/forms/activity-form";

const statusColors: Record<string, string> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  CHURNED: "destructive",
  DO_NOT_CONTACT: "warning",
};

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const { data: contact, isLoading } = useContact(id);
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const createActivity = useCreateActivity();

  if (isLoading) return <PageLoader />;
  if (!contact) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">Contact not found</p>
        <Link href="/contacts" className="mt-2 text-sm text-primary hover:underline">
          Back to contacts
        </Link>
      </div>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6">
        <Link href="/contacts" className="text-sm text-slate-500 hover:text-slate-700">
          &larr; Back to contacts
        </Link>
        <div className="mt-3 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={fullName} size="lg" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
              <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                {contact.title && <span>{contact.title}</span>}
                {contact.title && contact.company && <span>at</span>}
                {contact.company && (
                  <span className="font-medium text-slate-700">{contact.company.name}</span>
                )}
              </div>
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
                if (confirm("Delete this contact? This cannot be undone.")) {
                  deleteContact.mutate(id, {
                    onSuccess: () => router.push("/contacts"),
                  });
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="col-span-2 space-y-6">
          {/* Info Card */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Contact Info
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                      {contact.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">{contact.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <Badge variant={statusColors[contact.status] as any}>
                    {contact.status.replace(/_/g, " ")}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Source</dt>
                <dd className="font-medium text-slate-900">{contact.source.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Owner</dt>
                <dd className="font-medium text-slate-900">
                  {contact.owner ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={contact.owner.name} size="sm" />
                      {contact.owner.name}
                    </div>
                  ) : (
                    "Unassigned"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Last Contacted</dt>
                <dd className="font-medium text-slate-900">
                  {contact.lastContactedAt
                    ? new Date(contact.lastContactedAt).toLocaleDateString()
                    : "Never"}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Activity Timeline */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Activity ({contact.activities?.length ?? 0})
            </h2>
            {contact.activities?.length > 0 ? (
              <div className="space-y-4">
                {contact.activities.map((activity: any) => (
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

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* Associated Deals */}
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Deals ({contact.deals?.length ?? 0})
            </h2>
            {contact.deals?.length > 0 ? (
              <div className="space-y-3">
                {contact.deals.map((dc: any) => (
                  <Link
                    key={dc.deal.id}
                    href={`/deals/${dc.deal.id}`}
                    className="block rounded-md border p-3 transition hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-900">{dc.deal.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: dc.deal.stage?.color }}
                      />
                      <span className="text-xs text-slate-500">{dc.deal.stage?.name}</span>
                      {dc.deal.value && (
                        <span className="text-xs font-medium text-slate-700">
                          ${dc.deal.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {dc.role && (
                      <p className="mt-1 text-xs text-slate-400">Role: {dc.role}</p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No deals associated</p>
            )}
          </Card>

          {/* Open Tasks */}
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Open Tasks ({contact.tasks?.length ?? 0})
            </h2>
            {contact.tasks?.length > 0 ? (
              <div className="space-y-2">
                {contact.tasks.map((task: any) => (
                  <div key={task.id} className="rounded-md border p-3">
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
              Stats
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Deals</dt>
                <dd className="font-medium">{contact._count?.deals ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Activities</dt>
                <dd className="font-medium">{contact._count?.activities ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Emails</dt>
                <dd className="font-medium">{contact._count?.emails ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Created</dt>
                <dd className="font-medium">
                  {new Date(contact.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={showEdit} onClose={() => setShowEdit(false)}>
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <ContactForm
          defaultValues={{
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email || "",
            phone: contact.phone || "",
            title: contact.title || "",
            source: contact.source,
            companyId: contact.companyId || "",
          }}
          onSubmit={(data) => {
            updateContact.mutate(
              { id, data },
              { onSuccess: () => setShowEdit(false) }
            );
          }}
          onCancel={() => setShowEdit(false)}
          loading={updateContact.isPending}
          submitLabel="Save Changes"
        />
      </Dialog>

      {/* Activity Modal */}
      <Dialog open={showActivity} onClose={() => setShowActivity(false)}>
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>
        <ActivityForm
          contactId={id}
          onSubmit={(data) => {
            createActivity.mutate(data, {
              onSuccess: () => setShowActivity(false),
            });
          }}
          onCancel={() => setShowActivity(false)}
          loading={createActivity.isPending}
        />
      </Dialog>
    </PageWrapper>
  );
}
