"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateDealSchema } from "@cultivated-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/index";
import { useCompanies } from "@/hooks/use-companies";
import type { z } from "zod";

type DealFormData = z.infer<typeof CreateDealSchema>;

interface DealFormProps {
  defaultValues?: Partial<DealFormData>;
  stages: { id: string; name: string; color: string }[];
  pipelineId: string;
  /** Pre-select a stage (e.g. when adding from a column) */
  defaultStageId?: string;
  onSubmit: (data: DealFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export function DealForm({
  defaultValues,
  stages,
  pipelineId,
  defaultStageId,
  onSubmit,
  onCancel,
  loading,
  submitLabel = "Create Deal",
}: DealFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DealFormData>({
    resolver: zodResolver(CreateDealSchema),
    defaultValues: {
      pipelineId,
      stageId: defaultStageId ?? stages[0]?.id,
      currency: "USD",
      priority: "MEDIUM",
      ...defaultValues,
    },
  });

  const { data: companiesData } = useCompanies({ limit: 100 });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("pipelineId")} />

      <div>
        <Label htmlFor="title" required>
          Deal Title
        </Label>
        <Input
          id="title"
          {...register("title")}
          error={errors.title?.message}
          placeholder="e.g. Vape Essentials"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="value">Value ($)</Label>
          <Input
            id="value"
            type="number"
            step="0.01"
            {...register("value", { valueAsNumber: true })}
            error={errors.value?.message}
            placeholder="10000"
          />
        </div>
        <div>
          <Label htmlFor="stageId" required>
            Stage
          </Label>
          <Select
            id="stageId"
            {...register("stageId")}
            error={errors.stageId?.message}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="companyId">Company</Label>
          <Select id="companyId" {...register("companyId")}>
            <option value="">No company</option>
            {companiesData?.companies?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" {...register("priority")}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
        <Input
          id="expectedCloseDate"
          type="date"
          {...register("expectedCloseDate")}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Notes about this deal..."
          rows={3}
        />
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
