"use client";

let ablyClient: any = null;
let loading: Promise<any> | null = null;
let disabled = false;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Ably) return resolve();
    const s = document.createElement("script");
    s.src = "https://cdn.ably.com/lib/ably.min-2.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Ably SDK from CDN"));
    document.head.appendChild(s);
  });
}

function createAuthCallback() {
  return async (_tokenParams: any, callback: any) => {
    try {
      const res = await fetch("/api/ably-token");
      if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
      const tokenDetails = await res.json();
      callback(null, tokenDetails);
    } catch (err) {
      // Don't retry — mark as disabled
      disabled = true;
      callback(err, null);
    }
  };
}

export async function initAbly(): Promise<any> {
  if (typeof window === "undefined") return null;
  if (disabled) return null;
  if (ablyClient) return ablyClient;

  if (!loading) {
    loading = (async () => {
      // Pre-check: can we get a token?
      try {
        const check = await fetch("/api/ably-token");
        if (!check.ok) {
          console.warn(
            "[ably] Token endpoint returned",
            check.status,
            "— real-time disabled",
          );
          disabled = true;
          return null;
        }
      } catch {
        disabled = true;
        return null;
      }

      try {
        await loadScript();
        const Ably = (window as any).Ably;
        if (!Ably) return null;

        ablyClient = new Ably.Realtime({
          authCallback: createAuthCallback(),
          disconnectedRetryTimeout: 15000,
          suspendedRetryTimeout: 30000,
        });

        return ablyClient;
      } catch (err: any) {
        console.warn("[ably] Real-time disabled:", err.message);
        disabled = true;
        return null;
      }
    })();
  }

  return loading;
}
