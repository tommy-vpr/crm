const BASE = "/api/notifications";

export const notificationsService = {
  async list(opts?: { unread?: boolean; limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (opts?.unread) params.set("unread", "true");
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const res = await fetch(`${BASE}?${params}`);
    if (!res.ok) throw new Error("Failed to fetch notifications");
    return res.json();
  },

  async markRead(id: string) {
    const res = await fetch(`${BASE}/${id}`, { method: "PATCH" });
    if (!res.ok) throw new Error("Failed to mark notification");
    return res.json();
  },

  async markAllRead() {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    if (!res.ok) throw new Error("Failed to mark all read");
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete notification");
    return res.json();
  },
};
