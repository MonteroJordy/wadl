import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fetchGuestForDetail } from "@/lib/guest-query";
import GuestDetail from "@/components/guest-detail";

export const dynamic = "force-dynamic";

export default async function OwnerGuestDetailPage({
  params,
}: {
  params: { id: string; guestId: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  // Confirm the event belongs to this account.
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle<{ id: string }>();
  if (!event) notFound();

  const guest = await fetchGuestForDetail(params.guestId, params.id);
  if (!guest) notFound();

  return (
    <GuestDetail
      guest={guest}
      backHref={`/owner/events/${params.id}`}
      accent="coral"
      label="Guest"
    />
  );
}
