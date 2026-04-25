import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function fmtUtc(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}${mo}${da}T${h}${mi}00Z`;
}

function escIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select(
      "id, name, description, event_nights(id, doors_at, cutoff_at, night_date), venue:venues(name, city, address)"
    )
    .eq("id", params.id)
    .maybeSingle<{
      id: string;
      name: string;
      description: string | null;
      event_nights: Array<{
        id: string;
        doors_at: string;
        cutoff_at: string | null;
        night_date: string;
      }>;
      venue: { name: string | null; city: string | null; address: string | null } | null;
    }>();

  if (!event) {
    return new NextResponse("Not found", { status: 404 });
  }

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//WADL//Door//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");

  const location = [event.venue?.name, event.venue?.address, event.venue?.city]
    .filter(Boolean)
    .join(", ");

  for (const n of event.event_nights ?? []) {
    const start = new Date(n.doors_at);
    const end = n.cutoff_at
      ? new Date(n.cutoff_at)
      : new Date(start.getTime() + 4 * 60 * 60 * 1000);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:wadl-${event.id}-${n.id}@wadl`);
    lines.push(`DTSTAMP:${fmtUtc(new Date().toISOString())}`);
    lines.push(`DTSTART:${fmtUtc(start.toISOString())}`);
    lines.push(`DTEND:${fmtUtc(end.toISOString())}`);
    lines.push(`SUMMARY:${escIcs(event.name)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escIcs(event.description)}`);
    }
    if (location) lines.push(`LOCATION:${escIcs(location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const filename = `${event.name.replace(/[^a-z0-9-_]+/gi, "_")}.ics`;
  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
