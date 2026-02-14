"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCompany, useUpdateCompany, useDeleteCompany } from "@/hooks/use-companies";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Avatar,
  Card,
  PageLoader,
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/index";
import { CompanyForm } from "@/components/forms/company-form";

const sizeLabels: Record<string, string> = {
  SOLO: "Solo",
  SMALL: "Small (2-10)",
  MEDIUM: "Medium (11-50)",
  LARGE: "Large (51-200)",
  ENTERPRISE: "Enterprise (200+)",
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);

  const { data: company, isLoading } = useCompany(id);
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  if (isLoading) return <PageLoader />;
  if (!company) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">Company not found</p>
        <Link href="/companies" className="mt-2 text-sm text-primary hover:underline">
          Back to companies
        </Link>
      </div>
    );
  }

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6">
        <Link href="/companies" className="text-sm text-slate-500 hover:text-slate-700">
          &larr; Back to companies
        </Link>
        <div className="mt-3 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
              {company.domain && <span>{company.domain}</span>}
              {company.industry && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{company.industry}</span>
                </>
              )}
              {company.size && (
                <>
                  <span className="text-slate-300">•</span>
                  <Badge variant="outline">{sizeLabels[company.size]}</Badge>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEdit(true)}>
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Delete this company?")) {
                  deleteCompany.mutate(id, {
                    onSuccess: () => router.push("/companies"),
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
        {/* Left: Main content */}
        <div className="col-span-2 space-y-6">
          {/* Company Info */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Company Info
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Website</dt>
                <dd className="font-medium text-slate-900">
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {company.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">{company.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Annual Revenue</dt>
                <dd className="font-medium text-slate-900">
                  {company.annualRevenue
                    ? `$${company.annualRevenue.toLocaleString()}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="font-medium text-slate-900">
                  {new Date(company.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Contacts */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Contacts ({company.contacts?.length ?? 0})
            </h2>
            {company.contacts?.length > 0 ? (
              <div className="space-y-3">
                {company.contacts.map((contact: any) => (
                  <Link
                    key={contact.id}
                    href={`/contacts/${contact.id}`}
                    className="flex items-center gap-3 rounded-md border p-3 transition hover:bg-slate-50"
                  >
                    <Avatar name={`${contact.firstName} ${contact.lastName}`} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {[contact.title, contact.email].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                    {contact.owner && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Avatar name={contact.owner.name} size="sm" />
                        {contact.owner.name}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No contacts at this company</p>
            )}
          </Card>

          {/* Activity */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Recent Activity
            </h2>
            {company.activities?.length > 0 ? (
              <div className="space-y-3">
                {company.activities.map((activity: any) => (
                  <div key={activity.id} className="flex gap-3 border-l-2 border-slate-200 pl-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {activity.type.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {new Date(activity.occurredAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-900">{activity.title}</p>
                      {activity.description && (
                        <p className="mt-0.5 text-sm text-slate-600">{activity.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No activity recorded</p>
            )}
          </Card>
        </div>

        {/* Right: Deals + Stats */}
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Deals ({company.deals?.length ?? 0})
            </h2>
            {company.deals?.length > 0 ? (
              <div className="space-y-3">
                {company.deals.map((deal: any) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="block rounded-md border p-3 transition hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-900">{deal.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: deal.stage?.color }}
                      />
                      <span className="text-xs text-slate-500">{deal.stage?.name}</span>
                      {deal.value && (
                        <span className="ml-auto text-xs font-medium text-slate-700">
                          ${deal.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No deals yet</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Summary
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Contacts</dt>
                <dd className="font-medium">{company._count?.contacts ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Deals</dt>
                <dd className="font-medium">{company._count?.deals ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Total Pipeline</dt>
                <dd className="font-medium">
                  $
                  {(
                    company.deals?.reduce(
                      (sum: number, d: any) => sum + (d.value || 0),
                      0
                    ) ?? 0
                  ).toLocaleString()}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={showEdit} onClose={() => setShowEdit(false)}>
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
        </DialogHeader>
        <CompanyForm
          defaultValues={{
            name: company.name,
            domain: company.domain || "",
            industry: company.industry || "",
            size: company.size || undefined,
            phone: company.phone || "",
            website: company.website || "",
            annualRevenue: company.annualRevenue || undefined,
          }}
          onSubmit={(data) => {
            updateCompany.mutate(
              { id, data },
              { onSuccess: () => setShowEdit(false) }
            );
          }}
          onCancel={() => setShowEdit(false)}
          loading={updateCompany.isPending}
          submitLabel="Save Changes"
        />
      </Dialog>
    </PageWrapper>
  );
}
