import { notFound } from "next/navigation";
import {
  requireDoorContext,
  resolveActiveNight,
} from "@/lib/door";
import ManagerAddForm from "./form";

export const dynamic = "force-dynamic";

interface AllocRow {
  id: string;
  holder_name: string;
  cap: number;
  guests: Array<{ plus_ones: number; status: string }>;
}

export default async function ManagerAddPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { night?: string };
}) {
  const { admin, resolved } = await requireDoorContext({
    eventId: params.id,
    requireRole: "door_manager",
  });
  if (!resolved) notFound();

  const { active } = await resolveActiveNight(
    admin,
    params.id,
    searchParams.night
  );
  if (!active) notFound();

  const { data: allocData } = await admin
    .from("allocations")
    .select(
      "id, holder_name, cap, guests(plus_ones, status)"
    )
    .eq("event_night_id", active.id)
    .order("holder_name");

  const allocations = ((allocData ?? []) as unknown as AllocRow[]).map((a) => {
    const used = (a.guests ?? [])
      .filter((g) => g.status === "approved" || g.status === "pending")
      .reduce((sum, g) => sum + 1 + (g.plus_ones ?? 0), 0);
    return { id: a.id, holder_name: a.holder_name, cap: a.cap, used };
  });

  return (
    <ManagerAddForm
      eventId={params.id}
      eventName={resolved.event.name}
      nightId={active.id}
      allocations={allocations}
      backHref={`/manager/events/${params.id}?night=${active.id}`}
    />
  );
}
