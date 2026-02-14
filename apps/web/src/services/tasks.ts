import type { TaskFilters } from "@cultivated-crm/shared";

const BASE_URL = "/api/tasks";

export const tasksService = {
  async list(filters?: TaskFilters & { search?: string; mine?: string }) {
    const params = new URLSearchParams();
    if (filters?.assigneeId) params.set("assigneeId", filters.assigneeId);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.priority) params.set("priority", filters.priority);
    if (filters?.dealId) params.set("dealId", filters.dealId);
    if (filters?.contactId) params.set("contactId", filters.contactId);
    if (filters?.overdue) params.set("overdue", "true");
    if (filters?.mine) params.set("mine", filters.mine);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));

    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
  },

  async getById(id: string) {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Failed to fetch task");
    return res.json();
  },

  async create(data: Record<string, unknown>) {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create task");
    return res.json();
  },

  async update(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update task");
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete task");
    return res.json();
  },
};
