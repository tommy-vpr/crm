const BASE_URL = "/api/companies";

export interface CompanyFilters {
  search?: string;
  industry?: string;
  size?: string;
  limit?: number;
  offset?: number;
}

export const companiesService = {
  async list(filters?: CompanyFilters) {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.industry) params.set("industry", filters.industry);
    if (filters?.size) params.set("size", filters.size);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));

    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) throw new Error("Failed to fetch companies");
    return res.json();
  },

  async getById(id: string) {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Failed to fetch company");
    return res.json();
  },

  async create(data: Record<string, unknown>) {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create company");
    return res.json();
  },

  async update(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update company");
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete company");
    return res.json();
  },
};
