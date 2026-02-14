import type { ContactFilters } from "@cultivated-crm/shared";

const BASE_URL = "/api/contacts";

export const contactsService = {
  async list(filters?: ContactFilters) {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.ownerId) params.set("ownerId", filters.ownerId);
    if (filters?.companyId) params.set("companyId", filters.companyId);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));

    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) throw new Error("Failed to fetch contacts");
    return res.json();
  },

  async getById(id: string) {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Failed to fetch contact");
    return res.json();
  },

  async search(query: string) {
    const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Failed to search contacts");
    return res.json();
  },

  async create(data: Record<string, unknown>) {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create contact");
    return res.json();
  },

  async update(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update contact");
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete contact");
    return res.json();
  },
};
