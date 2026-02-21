"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
} from "@/hooks/use-contacts";
import { useBulkOperation } from "@/hooks/use-bulk";
import { useDebounce } from "@/hooks/use-debounce";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Badge,
  Avatar,
  EmptyState,
  PageLoader,
  Dialog,
  DialogHeader,
  DialogTitle,
  Select,
} from "@/components/ui/index";
import { ContactForm } from "@/components/forms/contact-form";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  CHURNED: "destructive",
  DO_NOT_CONTACT: "warning",
};

const sourceLabels: Record<string, string> = {
  MANUAL: "Manual",
  WEBSITE: "Website",
  REFERRAL: "Referral",
  LINKEDIN: "LinkedIn",
  COLD_OUTREACH: "Cold Outreach",
  INBOUND: "Inbound",
  EVENT: "Event",
  OTHER: "Other",
};

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const limit = 30;
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useContacts({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    limit,
    offset,
  });

  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const bulkOp = useBulkOperation();

  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;

  const allSelected =
    contacts.length > 0 && contacts.every((c: any) => selected.has(c.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map((c: any) => c.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} contact(s)?`)) return;
    bulkOp.mutate(
      { entity: "contacts", action: "delete", ids: Array.from(selected) },
      { onSuccess: () => setSelected(new Set()) },
    );
  }

  function handleBulkStatus() {
    if (!bulkStatus) return;
    bulkOp.mutate(
      {
        entity: "contacts",
        action: "update_status",
        ids: Array.from(selected),
        status: bulkStatus,
      },
      {
        onSuccess: () => {
          setSelected(new Set());
          setBulkStatus("");
        },
      },
    );
  }

  function handleExport() {
    window.open("/api/export?type=contacts", "_blank");
  }

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
          <p className="text-sm text-slate-500">
            {total} contact{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
          <Button onClick={() => setShowCreate(true)}>+ New Contact</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="CHURNED">Churned</option>
          <option value="DO_NOT_CONTACT">Do Not Contact</option>
        </Select>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-primary">
            {selected.size} selected
          </span>
          <div className="h-4 w-px bg-primary/20" />
          <Select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="h-8 w-36 text-xs"
          >
            <option value="">Set status...</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="CHURNED">Churned</option>
          </Select>
          {bulkStatus && (
            <Button
              size="sm"
              onClick={handleBulkStatus}
              disabled={bulkOp.isPending}
            >
              Apply
            </Button>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={bulkOp.isPending}
          >
            Delete
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <PageLoader />
      ) : contacts.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description={
            search
              ? "Try a different search term"
              : "Add your first contact to get started"
          }
          action={
            !search ? (
              <Button onClick={() => setShowCreate(true)}>+ New Contact</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((contact: any) => (
                <tr
                  key={contact.id}
                  className={cn(
                    "transition hover:bg-slate-50",
                    selected.has(contact.id) && "bg-primary/5",
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(contact.id)}
                      onChange={() => toggleOne(contact.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar
                        name={`${contact.firstName} ${contact.lastName}`}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-slate-900">
                          {contact.firstName} {contact.lastName}
                        </p>
                        {contact.email && (
                          <p className="text-xs text-slate-500">
                            {contact.email}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {contact.company ? (
                      <Link
                        href={`/companies/${contact.company.id}`}
                        className="hover:text-primary"
                      >
                        {contact.company.name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {contact.title || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColors[contact.status] as any}>
                      {contact.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {sourceLabels[contact.source] || contact.source}
                  </td>
                  <td className="px-4 py-3">
                    {contact.owner ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={contact.owner.name} size="sm" />
                        <span className="text-slate-600">
                          {contact.owner.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm("Delete this contact?")) {
                          deleteContact.mutate(contact.id);
                        }
                      }}
                      className="text-xs text-slate-400 transition hover:text-destructive"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            total={total}
            limit={limit}
            offset={offset}
            onPageChange={setOffset}
          />
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader>
          <DialogTitle>New Contact</DialogTitle>
        </DialogHeader>
        <ContactForm
          onSubmit={(data) => {
            createContact.mutate(data, {
              onSuccess: () => setShowCreate(false),
            });
          }}
          onCancel={() => setShowCreate(false)}
          loading={createContact.isPending}
        />
      </Dialog>
    </PageWrapper>
  );
}
