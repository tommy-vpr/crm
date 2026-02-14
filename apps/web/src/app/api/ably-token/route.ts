import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-utils";
import { getUserTeamIds } from "@/lib/authorization";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Ably not configured" },
        { status: 503 },
      );
    }

    const [keyName, keySecret] = apiKey.split(":");
    if (!keyName || !keySecret) {
      return NextResponse.json(
        { error: "Invalid Ably key format" },
        { status: 500 },
      );
    }

    const teamIds = await getUserTeamIds(user.id);
    const capability: Record<string, string[]> = {
      [`user:${user.id}`]: ["subscribe"],
    };
    for (const teamId of teamIds) {
      capability[`team:${teamId}`] = ["subscribe"];
    }

    const auth = Buffer.from(`${keyName}:${keySecret}`).toString("base64");

    const res = await fetch(
      `https://rest.ably.io/keys/${encodeURIComponent(keyName)}/requestToken`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyName: keyName,
          clientId: user.id,
          capability: JSON.stringify(capability),
          ttl: 3600000,
          timestamp: Date.now(),
        }),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[ably-token] Token request failed:", res.status, text);
      return NextResponse.json(
        { error: "Failed to generate Ably token" },
        { status: 502 },
      );
    }

    const tokenDetails = await res.json();
    return NextResponse.json({
      ...tokenDetails,
      channels: Object.keys(capability), // ← add this
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[ably-token] Error:", err);
    return NextResponse.json(
      { error: "Ably token request failed" },
      { status: 500 },
    );
  }
}
