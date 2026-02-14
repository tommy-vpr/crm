const BASE_URL = "/api/analytics";

export const analyticsService = {
  async getDashboard(days?: number) {
    const params = new URLSearchParams();
    if (days) params.set("days", String(days));

    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  },
};
