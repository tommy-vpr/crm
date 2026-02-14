"use client";

import dynamic from "next/dynamic";
import { CommandPalette } from "@/components/layout/command-palette";

// Load Ably realtime only on client — prevents ably-node.js from entering SSR bundle
const RealtimeSync = dynamic(
  () => import("@/components/layout/realtime-provider").then((m) => m.RealtimeSync),
  { ssr: false }
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RealtimeSync />
      {children}
      <CommandPalette />
    </>
  );
}
