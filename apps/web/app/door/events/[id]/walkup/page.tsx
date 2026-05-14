import { notFound } from "next/navigation";
import { requireDoorContext, resolveActiveNight } from "@/lib/door";
import WalkUpForm from "./walkup-form";

export const dynamic = "force-dynamic";

export default async function DoorWalkUpPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { night?: string };
}) {
  const { admin, resolved } = await requireDoorContext({ eventId: params.id });
  if (!resolved) notFound();

  const { active } = await resolveActiveNight(
    admin,
    params.id,
    searchParams.night,
  );
  if (!active) notFound();

  // Live GA headcount for the cap-check card.
  const { count: inCount } = await admin
    .from("check_ins")
    .select("id", { count: "exact", head: true })
    .eq("event_night_id", active.id)
    .eq("state", "approved");

  return (
    <WalkUpForm
      eventId={params.id}
      eventName={resolved.event.name}
      nightId={active.id}
      capacity={active.capacity_cap ?? 0}
      checkedIn={inCount ?? 0}
      backHref={`/door/events/${params.id}?night=${active.id}`}
    />
  );
}
