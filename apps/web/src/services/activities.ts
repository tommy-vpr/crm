const BASE_URL = "/api/activities";

export interface ActivityFilters {
  contactId?: string;
  dealId?: string;
  companyId?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export const activitiesService = {
  async list(filters?: ActivityFilters) {
    const params = new URLSearchParams();
    if (filters?.contactId) params.set("contactId", filters.contactId);
    if (filters?.dealId) params.set("dealId", filters.dealId);
    if (filters?.companyId) params.set("companyId", filters.companyId);
    if (filters?.type) params.set("type", filters.type);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));

    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) throw new Error("Failed to fetch activities");
    return res.json();
  },

  async create(data: Record<string, unknown>) {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create activity");
    return res.json();
  },
};
