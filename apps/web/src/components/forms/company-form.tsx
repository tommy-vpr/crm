"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/index";

const CompanyFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  domain: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  size: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  annualRevenue: z.coerce.number().positive().optional().or(z.literal("")),
});

type CompanyFormData = z.infer<typeof CompanyFormSchema>;

interface CompanyFormProps {
  defaultValues?: Partial<CompanyFormData>;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export function CompanyForm({
  defaultValues,
  onSubmit,
  onCancel,
  loading,
  submitLabel = "Create Company",
}: CompanyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(CompanyFormSchema),
    defaultValues,
  });

  const handleFormSubmit = (data: CompanyFormData) => {
    const cleaned = {
      ...data,
      annualRevenue: data.annualRevenue
        ? Number(data.annualRevenue)
        : undefined,
      website: data.website || undefined,
      domain: data.domain || undefined,
    };
    onSubmit(cleaned);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name" required>
          Company Name
        </Label>
        <Input id="name" {...register("name")} error={errors.name?.message} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="domain">Domain</Label>
          <Input
            id="domain"
            placeholder="example.com"
            {...register("domain")}
          />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            placeholder="https://example.com"
            {...register("website")}
            error={errors.website?.message}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            placeholder="e.g. Vape shop, Distro"
            {...register("industry")}
          />
        </div>
        <div>
          <Label htmlFor="size">Company Size</Label>
          <Select id="size" {...register("size")}>
            <option value="">Select size</option>
            <option value="SOLO">Solo</option>
            <option value="SMALL">Small (2-10)</option>
            <option value="MEDIUM">Medium (11-50)</option>
            <option value="LARGE">Large (51-200)</option>
            <option value="ENTERPRISE">Enterprise (200+)</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div>
          <Label htmlFor="annualRevenue">Annual Revenue ($)</Label>
          <Input
            id="annualRevenue"
            type="number"
            step="1000"
            {...register("annualRevenue")}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
