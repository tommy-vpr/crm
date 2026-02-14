import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@cultivated-crm/db";
import { apiHandler, requirePermission, parseSearchParams } from "@/lib/api-utils";
import { scopeWhere } from "@/lib/authorization";

export const runtime = "nodejs";

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(","));
  }
  return lines.join("\n");
}

// GET /api/export?type=contacts|deals (SCOPED)
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requirePermission("read", "contact");
  const params = parseSearchParams(req.url);
  const type = params.type;
  const scope = await scopeWhere(user);

  if (type === "contacts") {
    const contacts = await prisma.contact.findMany({
      where: scope.contact,
      include: {
        company: { select: { name: true } },
        owner: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const headers = [
      "First Name", "Last Name", "Email", "Phone", "Title",
      "Company", "Status", "Source", "Owner", "Created",
    ];
    const rows = contacts.map((c: any) => [
      c.firstName,
      c.lastName,
      c.email ?? "",
      c.phone ?? "",
      c.title ?? "",
      c.company?.name ?? "",
      c.status,
      c.source ?? "",
      c.owner?.name ?? "",
      new Date(c.createdAt).toISOString().slice(0, 10),
    ]);

    const csv = toCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="contacts-${Date.now()}.csv"`,
      },
    });
  }

  if (type === "deals") {
    const deals = await prisma.deal.findMany({
      where: scope.deal,
      include: {
        stage: { select: { name: true } },
        company: { select: { name: true } },
        owner: { select: { name: true } },
        pipeline: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const headers = [
      "Title", "Value", "Stage", "Priority", "Pipeline",
      "Company", "Owner", "Expected Close", "Actual Close", "Created",
    ];
    const rows = deals.map((d: any) => [
      d.title,
      d.value?.toString() ?? "",
      d.stage?.name ?? "",
      d.priority,
      d.pipeline?.name ?? "",
      d.company?.name ?? "",
      d.owner?.name ?? "",
      d.expectedCloseDate ? new Date(d.expectedCloseDate).toISOString().slice(0, 10) : "",
      d.actualCloseDate ? new Date(d.actualCloseDate).toISOString().slice(0, 10) : "",
      new Date(d.createdAt).toISOString().slice(0, 10),
    ]);

    const csv = toCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="deals-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid type. Use ?type=contacts or ?type=deals" }, { status: 400 });
}, { rateLimit: "export" });
