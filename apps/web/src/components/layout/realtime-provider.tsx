"use client";

import { useSession } from "next-auth/react";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

/**
 * Mounts the global Ably sync hook. Rendered as a sibling
 * (not a wrapper) so that ssr:false doesn't blank the page.
 */
export function RealtimeSync() {
  const { data: session } = useSession();
  useRealtimeSync(session?.user?.id);
  return null;
}
