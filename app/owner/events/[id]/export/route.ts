import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface ExportGuest {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  plus_ones: number;
  tier: string;
  status: string;
  flag_dna: boolean;
  created_at: string;
  approved_at: string | null;
  allocation: { holder_name: string } | null;
  night: { night_date: string; doors_at: string };
  check_ins: Array<{ state: string; scanned_at: string }>;
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(",");
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify account owner for this event.
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, account:accounts!inner(owner_user_id)"
    )
    .eq("id", params.id)
    .maybeSingle<{
      id: string;
      name: string;
      account: { owner_user_id: string };
    }>();

  if (!event || event.account.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Fetch all guests across all nights of the event.
  const { data: nights } = await admin
    .from("event_nights")
    .select("id")
    .eq("event_id", event.id);
  const nightIds = ((nights ?? []) as Array<{ id: string }>).map((n) => n.id);

  let guests: ExportGuest[] = [];
  if (nightIds.length > 0) {
    const { data: g } = await admin
      .from("guests")
      .select(
        "id, full_name, phone, email, plus_ones, tier, status, flag_dna, created_at, approved_at, " +
          "allocation:allocations(holder_name), " +
          "night:event_nights!inner(night_date, doors_at), " +
          "check_ins(state, scanned_at)"
      )
      .in("event_night_id", nightIds)
      .order("created_at", { ascending: true });
    guests = (g ?? []) as unknown as ExportGuest[];
  }

  const header = [
    "full_name",
    "phone",
    "email",
    "tier",
    "status",
    "plus_ones",
    "allocation",
    "night_date",
    "checked_in",
    "checked_in_at",
    "flagged_dna",
    "rsvp_at",
    "approved_at",
  ];

  const lines: string[] = [csvRow(header)];

  for (const g of guests) {
    const approvedScan = g.check_ins.find((c) => c.state === "approved");
    lines.push(
      csvRow([
        g.full_name,
        g.phone,
        g.email,
        g.tier,
        g.status,
        g.plus_ones,
        g.allocation?.holder_name ?? "",
        g.night.night_date,
        approvedScan ? "yes" : "no",
        approvedScan?.scanned_at ?? "",
        g.flag_dna ? "yes" : "",
        g.created_at,
        g.approved_at ?? "",
      ])
    );
  }

  // Prepend a UTF-8 BOM so Excel opens names with accents correctly.
  const body = "﻿" + lines.join("\r\n") + "\r\n";

  const filename = `${event.name.replace(/[^a-z0-9-_]+/gi, "_")}_guests.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
