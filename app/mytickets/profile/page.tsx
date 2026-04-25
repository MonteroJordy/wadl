import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile — WADL" };

interface PastRow {
  id: string;
  full_name: string;
  plus_ones: number;
  status: string;
  night: { night_date: string; doors_at: string; event: { id: string; name: string } };
  check_ins: Array<{ state: string }>;
}

export default async function GuestProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.phone) redirect("/mytickets");

  const phone = user.phone.startsWith("+") ? user.phone : `+${user.phone}`;
  const admin = createAdminClient();

  const { data: profileRow } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null; email: string | null }>();

  const { data: rowsRaw } = await admin
    .from("guests")
    .select(
      "id, full_name, plus_ones, status, night:event_nights!inner(night_date, doors_at, event:events!inner(id, name)), check_ins(state)"
    )
    .eq("phone", phone);
  const rows = (rowsRaw ?? []) as unknown as PastRow[];

  const now = Date.now();
  const past = rows.filter(
    (r) => new Date(r.night.doors_at).getTime() < now - 6 * 60 * 60 * 1000
  );

  let attended = 0;
  let approvedPast = 0;
  let plusOnesBrought = 0;
  for (const r of past) {
    if (r.status === "approved") {
      approvedPast++;
      plusOnesBrought += r.plus_ones ?? 0;
      if (r.check_ins.some((c) => c.state === "approved")) attended++;
    }
  }
  const noShowRate =
    approvedPast === 0 ? 0 : 1 - attended / approvedPast;

  // Referrals.
  const { count: referralsCount } = await admin
    .from("guests")
    .select("id", { count: "exact", head: true })
    .in("referred_by_guest_id", rows.map((r) => r.id));

  past.sort((a, b) => (a.night.doors_at < b.night.doors_at ? 1 : -1));

  return (
    <main id="main-content" className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href="/mytickets" className="label-mono hover:text-cream">
          ← Tickets
        </Link>
        <p className="label-mono">Profile</p>
      </header>

      <h1 className="display-lg leading-[0.95] mb-1">
        {profileRow?.full_name ?? "Guest"}
      </h1>
      <p className="label-mono">{phone}</p>
      {profileRow?.email && (
        <p className="label-mono mt-1">
          <span className="text-muted">Email</span>{" "}
          <span className="text-cream">{profileRow.email}</span>
        </p>
      )}

      <section className="card mt-6">
        <p className="label-mono mb-3">Lifetime</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="label-mono">Events attended</p>
            <p className="font-display text-3xl text-cream leading-none">
              {attended}
            </p>
          </div>
          <div>
            <p className="label-mono">No-show rate</p>
            <p className={`font-display text-3xl leading-none ${
              noShowRate > 0.3 ? "text-coral" : "text-mint"
            }`}>
              {Math.round(noShowRate * 100)}%
            </p>
          </div>
          <div>
            <p className="label-mono">+1s brought</p>
            <p className="font-display text-3xl text-cream leading-none">
              {plusOnesBrought}
            </p>
          </div>
          <div>
            <p className="label-mono">Friends referred</p>
            <p className="font-display text-3xl text-cream leading-none">
              {referralsCount ?? 0}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <p className="label-mono mb-2">Past events</p>
        {past.length === 0 ? (
          <EmptyState
            title="No history yet"
            body="Once you've been to an event, it'll show up here."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {past.slice(0, 30).map((r) => {
              const scanned = r.check_ins.some((c) => c.state === "approved");
              return (
                <li key={r.id} className="card">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sans text-cream truncate">
                        {r.night.event.name}
                      </p>
                      <p className="label-mono mt-1">
                        {fmtDate(r.night.night_date)}
                      </p>
                    </div>
                    <span
                      className={`label-mono px-2 py-0.5 rounded-full border ${
                        scanned
                          ? "border-mint/40 text-mint"
                          : r.status === "cancelled"
                          ? "border-line text-muted"
                          : "border-gold/40 text-gold"
                      }`}
                    >
                      {scanned ? "attended" : r.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="label-mono mt-auto pt-8 text-center">
        <a href="/api/auth/signout" className="hover:text-cream">
          Sign out
        </a>
      </p>
    </main>
  );
}
