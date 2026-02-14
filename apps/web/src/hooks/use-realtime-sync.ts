"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { initAbly } from "@/lib/ably";
import type { CRMEvent } from "@cultivated-crm/shared";

/**
 * Master real-time sync hook. Mount once at the app root.
 */
export function useRealtimeSync(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const channels: any[] = [];

    const handler = (message: any) => {
      const event = message.data as CRMEvent;
      handleEvent(queryClient, event, userId);
    };

    // Fetch scoped channels from the token endpoint
    fetch("/api/ably-token")
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        if (!data?.channels || cancelled) return;
        const ably = await initAbly();
        if (!ably || cancelled) return;

        for (const name of data.channels as string[]) {
          const ch = ably.channels.get(name);
          ch.subscribe(handler);
          channels.push(ch);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      channels.forEach((ch) => ch?.unsubscribe(handler));
    };
  }, [userId, queryClient]);
}

/**
 * Entity-specific hook. Mount when viewing a deal detail page.
 */
export function useDealRealtime(dealId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let channel: any;

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      queryClient.invalidateQueries({ queryKey: ["activities", dealId] });
    };

    initAbly().then((ably) => {
      if (!ably || cancelled) return;
      channel = ably.channels.get(`deal:${dealId}`);
      channel.subscribe(handler);
    });

    return () => {
      cancelled = true;
      channel?.unsubscribe(handler);
    };
  }, [dealId, queryClient]);
}

/**
 * Pipeline board hook. Mount when viewing the Kanban board.
 */
export function usePipelineRealtime(pipelineId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let channel: any;

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stats"] });
    };

    initAbly().then((ably) => {
      if (!ably || cancelled) return;
      channel = ably.channels.get(`pipeline:${pipelineId}`);
      channel.subscribe(handler);
    });

    return () => {
      cancelled = true;
      channel?.unsubscribe(handler);
    };
  }, [pipelineId, queryClient]);
}

// ─── EVENT HANDLER ────────────────────────────────────────────

function handleEvent(
  queryClient: ReturnType<typeof useQueryClient>,
  event: CRMEvent,
  currentUserId: string,
) {
  // Skip self-originated events (already handled by optimistic update)
  if (event.userId === currentUserId) return;

  const { entityType, entityId } = event;

  // Invalidation map — surgical cache updates
  const invalidations: Record<string, string[][]> = {
    deal: [
      ["deals"],
      ["deal", entityId],
      ["pipeline-stats"],
      ["dashboard-stats"],
    ],
    contact: [["contacts"], ["contact", entityId]],
    activity: [
      ["activities", entityId],
      ["deal", entityId],
      ["contact", entityId],
    ],
    task: [["tasks"], ["my-tasks"]],
    notification: [["notifications"], ["notification-count"]],
  };

  const queriesToInvalidate = invalidations[entityType] || [];
  queriesToInvalidate.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
}
