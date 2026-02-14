"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateContactSchema } from "@cultivated-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/index";
import { useCompanies } from "@/hooks/use-companies";
import type { z } from "zod";

type ContactFormData = z.infer<typeof CreateContactSchema>;

interface ContactFormProps {
  defaultValues?: Partial<ContactFormData>;
  onSubmit: (data: ContactFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export function ContactForm({
  defaultValues,
  onSubmit,
  onCancel,
  loading,
  submitLabel = "Create Contact",
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(CreateContactSchema),
    defaultValues: {
      source: "MANUAL",
      ...defaultValues,
    },
  });

  const { data: companiesData } = useCompanies({ limit: 100 });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" required>First Name</Label>
          <Input id="firstName" {...register("firstName")} error={errors.firstName?.message} />
        </div>
        <div>
          <Label htmlFor="lastName" required>Last Name</Label>
          <Input id="lastName" {...register("lastName")} error={errors.lastName?.message} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} error={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} error={errors.phone?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor="title">Job Title</Label>
        <Input id="title" placeholder="e.g. VP of Marketing" {...register("title")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="companyId">Company</Label>
          <Select id="companyId" {...register("companyId")}>
            <option value="">No company</option>
            {companiesData?.companies?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="source">Source</Label>
          <Select id="source" {...register("source")}>
            <option value="MANUAL">Manual</option>
            <option value="WEBSITE">Website</option>
            <option value="REFERRAL">Referral</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="COLD_OUTREACH">Cold Outreach</option>
            <option value="INBOUND">Inbound</option>
            <option value="EVENT">Event</option>
            <option value="OTHER">Other</option>
          </Select>
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
