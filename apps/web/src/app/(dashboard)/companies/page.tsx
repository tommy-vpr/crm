"use client";

import { useState } from "react";
import Link from "next/link";
import { useCompanies, useCreateCompany, useDeleteCompany } from "@/hooks/use-companies";
import { useDebounce } from "@/hooks/use-debounce";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Badge,
  EmptyState,
  PageLoader,
  Dialog,
  DialogHeader,
  DialogTitle,
  Select,
} from "@/components/ui/index";
import { CompanyForm } from "@/components/forms/company-form";
import { Pagination } from "@/components/ui/pagination";

const sizeLabels: Record<string, string> = {
  SOLO: "Solo",
  SMALL: "Small (2-10)",
  MEDIUM: "Medium (11-50)",
  LARGE: "Large (51-200)",
  ENTERPRISE: "Enterprise (200+)",
};

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 30;
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useCompanies({
    search: debouncedSearch || undefined,
    size: sizeFilter || undefined,
    limit,
    offset,
  });

  const createCompany = useCreateCompany();
  const deleteCompany = useDeleteCompany();

  const companies = data?.companies ?? [];
  const total = data?.total ?? 0;

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500">
            {total} compan{total !== 1 ? "ies" : "y"}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New Company</Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={sizeFilter}
          onChange={(e) => setSizeFilter(e.target.value)}
          className="w-44"
        >
          <option value="">All Sizes</option>
          <option value="SOLO">Solo</option>
          <option value="SMALL">Small (2-10)</option>
          <option value="MEDIUM">Medium (11-50)</option>
          <option value="LARGE">Large (51-200)</option>
          <option value="ENTERPRISE">Enterprise (200+)</option>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <PageLoader />
      ) : companies.length === 0 ? (
        <EmptyState
          title="No companies yet"
          description={search ? "Try a different search term" : "Add your first company to get started"}
          action={!search ? <Button onClick={() => setShowCreate(true)}>+ New Company</Button> : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Contacts</th>
                <th className="px-4 py-3">Deals</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {companies.map((company: any) => (
                <tr key={company.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${company.id}`} className="group">
                      <p className="font-medium text-slate-900 group-hover:text-primary">
                        {company.name}
                      </p>
                      {company.domain && (
                        <p className="text-xs text-slate-500">{company.domain}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {company.industry || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {company.size ? (
                      <Badge variant="outline">{sizeLabels[company.size]}</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{company._count?.contacts ?? 0}</td>
                  <td className="px-4 py-3 text-slate-600">{company._count?.deals ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm("Delete this company? All contact associations will be removed.")) {
                          deleteCompany.mutate(company.id);
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
          <Pagination total={total} limit={limit} offset={offset} onPageChange={setOffset} />
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader>
          <DialogTitle>New Company</DialogTitle>
        </DialogHeader>
        <CompanyForm
          onSubmit={(data) => {
            createCompany.mutate(data, {
              onSuccess: () => setShowCreate(false),
            });
          }}
          onCancel={() => setShowCreate(false)}
          loading={createCompany.isPending}
        />
      </Dialog>
    </PageWrapper>
  );
}
