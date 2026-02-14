"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateTaskSchema } from "@cultivated-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/index";
import type { z } from "zod";

type TaskFormData = z.infer<typeof CreateTaskSchema>;

interface TaskFormProps {
  defaultValues?: Partial<TaskFormData>;
  /** Pre-link to deal or contact */
  dealId?: string;
  contactId?: string;
  users?: { id: string; name: string | null }[];
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export function TaskForm({
  defaultValues,
  dealId,
  contactId,
  users,
  onSubmit,
  onCancel,
  loading,
  submitLabel = "Create Task",
}: TaskFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: {
      priority: "MEDIUM",
      dealId: dealId ?? undefined,
      contactId: contactId ?? undefined,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title" required>
          Title
        </Label>
        <Input
          id="title"
          {...register("title")}
          error={errors.title?.message}
          placeholder="e.g. Follow up with client"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" {...register("priority")}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" type="date" {...register("dueDate")} />
        </div>
      </div>

      {users && users.length > 0 && (
        <div>
          <Label htmlFor="assigneeId">Assign To</Label>
          <Select id="assigneeId" {...register("assigneeId")}>
            <option value="">Assign to me</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.id}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          rows={3}
          placeholder="Additional details..."
        />
      </div>

      {dealId && <input type="hidden" {...register("dealId")} />}
      {contactId && <input type="hidden" {...register("contactId")} />}

      <div className="flex justify-end gap-3 pt-2">
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
