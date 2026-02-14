"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface BulkParams {
  entity: "contacts" | "deals";
  action: string;
  ids: string[];
  [key: string]: unknown;
}

async function executeBulk(params: BulkParams) {
  const res = await fetch("/api/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Bulk operation failed");
  }
  return res.json();
}

export function useBulkOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: executeBulk,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [variables.entity] });
    },
  });
}
