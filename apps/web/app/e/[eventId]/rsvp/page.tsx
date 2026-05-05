import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import RsvpForm from "./form";

export const dynamic = "force-dynamic";

type AllowedTier = "ga" | "vip" | "aaa";

function normalizeTier(raw: string | undefined): AllowedTier | null {
  if (!raw) return null;
  const t = raw.toLowerCase();
  if (t === "ga" || t === "vip" || t === "aaa") return t;
  return null;
}

export default async function RsvpPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams: {
    night?: string;
    tier?: string;
    allocation?: string;
    sub?: string;
  };
}) {
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, name, event_nights(id, night_date, doors_at, is_frozen)")
    .eq("id", params.eventId)
    .maybeSingle<{
      id: string;
      name: string;
      event_nights: Array<{
        id: string;
        night_date: string;
        doors_at: string;
        is_frozen: boolean;
      }>;
    }>();

  if (!event) notFound();

  const nights = [...event.event_nights].sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1,
  );
  if (nights.length === 0) redirect(`/e/${event.id}`);

  const selected =
    nights.find((n) => n.id === searchParams.night) ??
    nights.find((n) => new Date(n.doors_at).getTime() >= Date.now()) ??
    nights[0];

  // Day 50 wedge — tier sub-link entry. /d/[subToken] redirects here
  // with ?tier=GA&allocation=...&sub=... so the action can attach the
  // new guest to the right holder allocation at the right tier.
  const tier = normalizeTier(searchParams.tier);
  const allocationId =
    typeof searchParams.allocation === "string"
      ? searchParams.allocation
      : null;
  const subToken =
    typeof searchParams.sub === "string" ? searchParams.sub : null;

  return (
    <RsvpForm
      eventId={event.id}
      eventName={event.name}
      night={{
        id: selected.id,
        night_date: selected.night_date,
        doors_at: selected.doors_at,
      }}
      tier={tier}
      allocationId={allocationId}
      subToken={subToken}
    />
  );
}
