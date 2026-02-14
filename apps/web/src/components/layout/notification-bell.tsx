"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllRead } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: countData } = useUnreadCount();
  const { data } = useNotifications({ limit: 15 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const unread = countData ?? 0;
  const notifications = data?.notifications ?? [];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = (n: any) => {
    if (!n.isRead) markRead.mutate(n.id);
    setOpen(false);
  };

  const getHref = (n: any) => {
    if (n.entityType === "deal" && n.entityId) return `/deals/${n.entityId}`;
    if (n.entityType === "contact" && n.entityId) return `/contacts/${n.entityId}`;
    if (n.entityType === "task" && n.entityId) return `/tasks`;
    return "#";
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 overflow-hidden rounded-lg border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No notifications</p>
            ) : (
              notifications.map((n: any) => {
                const href = getHref(n);
                return (
                  <Link
                    key={n.id}
                    href={href}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex gap-3 border-b px-4 py-3 transition last:border-0 hover:bg-slate-50",
                      !n.isRead && "bg-primary/5"
                    )}
                  >
                    {!n.isRead && (
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                    )}
                    <div className={cn("min-w-0 flex-1", n.isRead && "ml-5")}>
                      <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                      <p className="text-xs text-slate-500 truncate">{n.body}</p>
                    </div>
                    <span className="flex-shrink-0 text-[10px] text-slate-400">
                      {timeAgo(n.createdAt)}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
