import { notFound } from "next/navigation";
import { requireDoorContext } from "@/lib/door";
import { fetchGuestForDetail } from "@/lib/guest-query";
import GuestDetail from "@/components/guest-detail";

export const dynamic = "force-dynamic";

export default async function ManagerGuestDetailPage({
  params,
}: {
  params: { id: string; guestId: string };
}) {
  const { resolved } = await requireDoorContext({
    eventId: params.id,
    requireRole: "door_manager",
  });
  if (!resolved) notFound();

  const guest = await fetchGuestForDetail(params.guestId, params.id);
  if (!guest) notFound();

  return (
    <GuestDetail
      guest={guest}
      backHref={`/manager/events/${params.id}`}
      accent="gold"
      label="Guest"
    />
  );
}
