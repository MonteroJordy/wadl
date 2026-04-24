import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/owner";
import HolderAddForm from "./form";

export const dynamic = "force-dynamic";

interface TokenData {
  token: string;
  revoked_at: string | null;
  expires_at: string | null;
  allocation: {
    id: string;
    event_night_id: string;
    holder_name: string;
    cap: number;
    auto_approve: boolean;
    list_open: boolean;
    plus_ones_allowed: boolean;
  };
}

function ErrorFrame({ title, body }: { title: string; body: string }) {
  return (
    <main className="mobile-frame">
      <div className="pt-12 text-center">
        <p className="label-mono mb-3">WADL</p>
        <h1 className="display-lg mb-4">{title}</h1>
        <p className="text-muted text-sm">{body}</p>
      </div>
    </main>
  );
}

export default async function HolderPage({
  params,
}: {
  params: { token: string };
}) {
  const admin = createAdminClient();

  const { data: tokenRow } = await admin
    .from("allocation_tokens")
    .select(
      "token, revoked_at, expires_at, allocation:allocations!inner(id, event_night_id, holder_name, cap, auto_approve, list_open, plus_ones_allowed)"
    )
    .eq("token", params.token)
    .maybeSingle<TokenData>();

  if (!tokenRow) {
    return <ErrorFrame title="Link not found." body="Check the link you were sent." />;
  }
  if (tokenRow.revoked_at) {
    return <ErrorFrame title="Link rotated." body="Ask the host for the current link." />;
  }
  if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return <ErrorFrame title="Link expired." body="Ask the host for a fresh one." />;
  }

  const alloc = tokenRow.allocation;

  const [nightRes, guestsRes] = await Promise.all([
    admin
      .from("event_nights")
      .select("id, night_date, doors_at, is_frozen, event:events!inner(id, name, flyer_url)")
      .eq("id", alloc.event_night_id)
      .maybeSingle<{
        id: string;
        night_date: string;
        doors_at: string;
        is_frozen: boolean;
        event: { id: string; name: string; flyer_url: string | null };
      }>(),
    admin
      .from("guests")
      .select("full_name, plus_ones, status")
      .eq("allocation_id", alloc.id)
      .in("status", ["approved", "pending"]),
  ]);

  const night = nightRes.data;
  if (!night) {
    return <ErrorFrame title="Night not found." body="The event setup may have changed." />;
  }

  const guests = guestsRes.data ?? [];
  const used = guests.reduce((sum, g) => sum + 1 + (g.plus_ones ?? 0), 0);
  const remaining = Math.max(0, alloc.cap - used);
  const listOpen = alloc.list_open && !night.is_frozen && remaining > 0;

  return (
    <main className="mobile-frame">
      <header className="pt-6 pb-4">
        <p className="label-mono mb-2">Holder list</p>
        <h1 className="display-lg">{night.event.name}</h1>
        <p className="label-mono mt-2">
          {fmtDate(night.night_date)} · Doors {fmtTime(night.doors_at)}
        </p>
      </header>

      {night.event.flyer_url ? (
        <div
          className="w-full rounded-lg overflow-hidden mb-4 border border-line"
          style={{ aspectRatio: "4 / 5" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={night.event.flyer_url}
            alt={night.event.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}

      <section className="card mb-5">
        <p className="label-mono mb-1">Your list</p>
        <p className="font-display text-4xl text-cream leading-none">
          {used}
          <span className="text-muted">/{alloc.cap}</span>
        </p>
        <p className="label-mono mt-2">
          {alloc.holder_name} · {alloc.auto_approve ? "Auto-approve" : "Host approves"}
          {night.is_frozen ? " · NIGHT FROZEN" : ""}
        </p>
      </section>

      <HolderAddForm
        token={params.token}
        plusOnesAllowed={alloc.plus_ones_allowed}
        listOpen={listOpen}
      />

      {guests.length > 0 && (
        <section className="mt-8">
          <p className="label-mono mb-3">Your names</p>
          <div className="flex flex-col gap-2">
            {guests.map((g, idx) => (
              <div
                key={idx}
                className="card flex items-center justify-between"
              >
                <div>
                  <p className="font-sans text-cream">{g.full_name}</p>
                  {g.plus_ones > 0 && (
                    <p className="label-mono">+{g.plus_ones}</p>
                  )}
                </div>
                <span
                  className={`label-mono ${
                    g.status === "approved" ? "text-mint" : "text-gold"
                  }`}
                >
                  {g.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="label-mono mt-auto pt-8 text-center">
        Powered by WADL
      </p>
    </main>
  );
}
