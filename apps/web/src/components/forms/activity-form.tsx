"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const activityTypes = [
  { value: "NOTE", label: "Note" },
  { value: "CALL", label: "Call" },
  { value: "EMAIL_SENT", label: "Email Sent" },
  { value: "EMAIL_RECEIVED", label: "Email Received" },
  { value: "MEETING", label: "Meeting" },
  { value: "CUSTOM", label: "Other" },
];

interface ActivityFormProps {
  contactId?: string;
  dealId?: string;
  companyId?: string;
  onSubmit: (data: {
    type: string;
    title: string;
    description?: string;
    contactId?: string;
    dealId?: string;
    companyId?: string;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ActivityForm({
  contactId,
  dealId,
  companyId,
  onSubmit,
  onCancel,
  loading,
}: ActivityFormProps) {
  const [type, setType] = useState("NOTE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      contactId,
      dealId,
      companyId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="actType">Type</Label>
          <Select
            id="actType"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {activityTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="actTitle" required>
            Title
          </Label>
          <Input
            id="actTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Follow-up call re: proposal"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="actDesc">Notes</Label>
        <Textarea
          id="actDesc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details about this activity..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading} disabled={!title.trim()}>
          Log Activity
        </Button>
      </div>
    </form>
  );
}
