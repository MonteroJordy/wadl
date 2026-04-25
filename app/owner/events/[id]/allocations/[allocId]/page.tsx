import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { getAppUrl } from "@/lib/app-url";
import AllocationControls from "./controls";

export const dynamic = "force-dynamic";

export default async function AllocationDetailPage({
  params,
}: {
  params: { id: string; allocId: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, account_id")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const { data: alloc } = await supabase
    .from("allocations")
    .select("id, event_night_id, holder_name, holder_phone, holder_email, cap, auto_approve, list_open, plus_ones_allowed, event_nights(night_date, doors_at, event_id)")
    .eq("id", params.allocId)
    .maybeSingle();
  if (!alloc || (alloc.event_nights as unknown as { event_id: string }).event_id !== event.id) {
    notFound();
  }

  const night = alloc.event_nights as unknown as {
    night_date: string;
    doors_at: string;
    event_id: string;
  };

  const { data: tokenRow } = await supabase
    .from("allocation_tokens")
    .select("token, created_at")
    .eq("allocation_id", alloc.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ token: string; created_at: string }>();

  const holderUrl = tokenRow ? `${getAppUrl()}/h/${tokenRow.token}` : "";

  const { data: guests } = await supabase
    .from("guests")
    .select("id, full_name, plus_ones, status, created_at")
    .eq("allocation_id", alloc.id)
    .order("created_at", { ascending: false });

  const guestsList =
    (guests ?? []) as Array<{
      id: string;
      full_name: string;
      plus_ones: number;
      status: string;
      created_at: string;
    }>;

  const used = guestsList
    .filter((g) => g.status === "approved" || g.status === "pending")
    .reduce((sum, g) => sum + 1 + (g.plus_ones ?? 0), 0);

  return (
    <main className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link
          href={`/owner/events/${event.id}/allocations`}
          className="label-mono hover:text-cream"
        >
          ← Back
        </Link>
        <p className="label-mono">Allocation</p>
      </header>

      <h1 className="display-lg mb-1">{alloc.holder_name}</h1>
      <p className="label-mono mb-2">
        {event.name} · {fmtDate(night.night_date)}
      </p>
      <p className="label-mono mb-6">
        <span className="text-cream">{used}</span>/{alloc.cap} used
      </p>

      <AllocationControls
        eventId={event.id}
        allocId={alloc.id}
        initial={{
          cap: alloc.cap,
          auto_approve: alloc.auto_approve,
          list_open: alloc.list_open,
          plus_ones_allowed: alloc.plus_ones_allowed,
        }}
        holderUrl={holderUrl}
      />

      <div className="mt-8">
        <p className="label-mono mb-3">Guests on this list</p>
        {guestsList.length === 0 ? (
          <p className="label-mono text-center text-mint">
            None yet — share the magic link and names will land here.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {guestsList.map((g) => (
              <Link
                key={g.id}
                href={`/owner/events/${event.id}/guests/${g.id}`}
                className="card flex items-center justify-between hover:border-coral/60 transition"
              >
                <div>
                  <p className="font-sans text-cream">{g.full_name}</p>
                  {g.plus_ones > 0 && (
                    <p className="label-mono">+{g.plus_ones}</p>
                  )}
                </div>
                <span
                  className={`label-mono ${
                    g.status === "approved"
                      ? "text-mint"
                      : g.status === "pending"
                      ? "text-gold"
                      : g.status === "rejected"
                      ? "text-coral"
                      : "text-muted"
                  }`}
                >
                  {g.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
