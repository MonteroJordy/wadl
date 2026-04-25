import { notFound } from "next/navigation";
import { requireDoorContext, resolveActiveNight } from "@/lib/door";
import Scanner from "./scanner";

export const dynamic = "force-dynamic";

export default async function ScanPage({
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
    searchParams.night
  );
  if (!active) notFound();

  return (
    <Scanner
      eventId={params.id}
      eventName={resolved.event.name}
      nightId={active.id}
      backHref={`/door/events/${params.id}?night=${active.id}`}
    />
  );
}
