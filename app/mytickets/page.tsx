import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import MyTicketsVerify from "./verify-form";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

interface TicketRow {
  id: string;
  full_name: string;
  plus_ones: number;
  status: string;
  tier: string;
  tier_upgraded_at: string | null;
  tier_upgrade_seen_at: string | null;
  check_in_token: string;
  created_at: string;
  night: {
    id: string;
    night_date: string;
    doors_at: string;
    event: { id: string; name: string; flyer_url: string | null };
  };
}

export default async function MyTicketsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.phone) {
    return (
      <main id="main-content" className="mobile-frame">
        <header className="flex items-center justify-between pt-6 pb-4">
          <Link href="/discover" className="label-mono hover:text-cream">
            ← Discover
          </Link>
        </header>

        <h1 className="display-lg mb-3">My tickets.</h1>
        <p className="text-muted text-sm">
          Verify your phone to pull up everything you&apos;ve RSVP&apos;d for.
        </p>

        <MyTicketsVerify />
      </main>
    );
  }

  const phoneWithPlus = user.phone.startsWith("+") ? user.phone : `+${user.phone}`;

  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("guests")
    .select(
      "id, full_name, plus_ones, status, tier, tier_upgraded_at, tier_upgrade_seen_at, check_in_token, created_at, night:event_nights!inner(id, night_date, doors_at, event:events!inner(id, name, flyer_url))"
    )
    .eq("phone", phoneWithPlus)
    .not("check_in_token", "is", null)
    .order("created_at", { ascending: false });

  const rows = (tickets ?? []) as unknown as TicketRow[];

  // Tier-upgrade banner: show for any guest where tier_upgraded_at is set
  // and tier_upgrade_seen_at is null. Mark them seen on this view so the
  // banner doesn't fire again.
  const newUpgrades = rows.filter(
    (t) => t.tier_upgraded_at && !t.tier_upgrade_seen_at
  );
  if (newUpgrades.length > 0) {
    const ids = newUpgrades.map((t) => t.id);
    await admin
      .from("guests")
      .update({ tier_upgrade_seen_at: new Date().toISOString() })
      .in("id", ids);
  }

  // Split upcoming vs past by doors_at.
  const now = Date.now();
  const upcoming: TicketRow[] = [];
  const past: TicketRow[] = [];
  for (const t of rows) {
    if (new Date(t.night.doors_at).getTime() >= now - 6 * 60 * 60_000) {
      upcoming.push(t);
    } else {
      past.push(t);
    }
  }

  return (
    <main id="main-content" className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href="/discover" className="label-mono hover:text-cream">
          ← Discover
        </Link>
        <form action="/api/auth/signout" method="post">
          <button type="submit" className="label-mono hover:text-cream transition">
            Sign out
          </button>
        </form>
      </header>

      <h1 className="display-lg mb-2">My tickets.</h1>
      <p className="label-mono mb-6">{phoneWithPlus}</p>

      {newUpgrades.length > 0 && (
        <section className="card border-coral mb-6">
          <p className="label-mono text-coral mb-2">Tier upgrade!</p>
          {newUpgrades.map((t) => (
            <p key={t.id} className="text-cream text-sm mb-1">
              You&apos;ve been bumped to{" "}
              <span className="font-sans font-semibold">
                {t.tier.replace("_", " ").toUpperCase()}
              </span>{" "}
              for{" "}
              <span className="font-sans font-semibold">
                {t.night.event.name}
              </span>
              .
            </p>
          ))}
        </section>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="RSVP to an event and your ticket will appear here."
          action={
            <Link href="/discover" className="btn-primary inline-block">
              Browse events
            </Link>
          }
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mb-6">
              <p className="label-mono mb-2">Upcoming</p>
              <div className="flex flex-col gap-2">
                {upcoming.map((t) => (
                  <TicketCard key={t.id} t={t} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <p className="label-mono mb-2">Past</p>
              <div className="flex flex-col gap-2 opacity-70">
                {past.map((t) => (
                  <TicketCard key={t.id} t={t} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function TicketCard({ t }: { t: TicketRow }) {
  return (
    <Link
      href={`/t/${t.check_in_token}`}
      className="card hover:border-coral transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-cream font-semibold truncate">
            {t.night.event.name}
          </p>
          <p className="label-mono mt-1">
            {fmtDate(t.night.night_date)} · Doors {fmtTime(t.night.doors_at)}
          </p>
          <p className="label-mono mt-1 truncate">
            {t.full_name}
            {t.plus_ones > 0 ? ` +${t.plus_ones}` : ""}
          </p>
        </div>
        <span
          className={`label-mono shrink-0 ${
            t.status === "approved"
              ? "text-mint"
              : t.status === "pending"
              ? "text-gold"
              : t.status === "rejected"
              ? "text-coral"
              : "text-muted"
          }`}
        >
          {t.status}
        </span>
      </div>
    </Link>
  );
}
