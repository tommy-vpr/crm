const BASE_URL = "/api/pipelines";

export const pipelinesService = {
  async list() {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error("Failed to fetch pipelines");
    return res.json();
  },

  async getById(id: string) {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error("Failed to fetch pipeline");
    return res.json();
  },

  async create(data: { name: string; stages?: any[] }) {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create pipeline");
    return res.json();
  },

  async update(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update pipeline");
    return res.json();
  },

  async reorderStages(pipelineId: string, stageIds: string[]) {
    const res = await fetch(`${BASE_URL}/${pipelineId}/stages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageIds }),
    });
    if (!res.ok) throw new Error("Failed to reorder stages");
    return res.json();
  },

  async addStage(pipelineId: string, data: { name: string; color?: string; probability?: number }) {
    const res = await fetch(`${BASE_URL}/${pipelineId}/stages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to add stage");
    return res.json();
  },

  async updateStage(pipelineId: string, stageId: string, data: Record<string, unknown>) {
    const res = await fetch(`${BASE_URL}/${pipelineId}/stages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, ...data }),
    });
    if (!res.ok) throw new Error("Failed to update stage");
    return res.json();
  },

  async deleteStage(pipelineId: string, stageId: string) {
    const res = await fetch(`${BASE_URL}/${pipelineId}/stages?stageId=${stageId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete stage");
    }
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete pipeline");
    }
    return res.json();
  },
};
