import type { DealFilters } from "@cultivated-crm/shared";

const BASE_URL = "/api/deals";

export const dealsService = {
  async list(filters?: DealFilters) {
    const params = new URLSearchParams();
    if (filters?.pipelineId) params.set("pipelineId", filters.pipelineId);
    if (filters?.stageId) params.set("stageId", filters.stageId);
    if (filters?.ownerId) params.set("ownerId", filters.ownerId);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));

    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) throw new Error("Failed to fetch deals");
    return res.json();
  },

  async getById(id: string) {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Failed to fetch deal");
    return res.json();
  },

  async create(data: Record<string, unknown>) {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create deal");
    return res.json();
  },

  async update(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update deal");
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete deal");
    return res.json();
  },

  async moveStage(dealId: string, stageId: string, position?: number) {
    const res = await fetch(`${BASE_URL}/${dealId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, position }),
    });
    if (!res.ok) throw new Error("Failed to move deal");
    return res.json();
  },

  async addContact(dealId: string, contactId: string, role?: string) {
    const res = await fetch(`${BASE_URL}/${dealId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, role }),
    });
    if (!res.ok) throw new Error("Failed to add contact");
    return res.json();
  },

  async removeContact(dealId: string, contactId: string) {
    const res = await fetch(`${BASE_URL}/${dealId}/contacts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    if (!res.ok) throw new Error("Failed to remove contact");
    return res.json();
  },
};
