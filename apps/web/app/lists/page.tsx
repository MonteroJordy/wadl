import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "My lists — WADL" };

interface ListRow {
  token: string;
  label: string;
  eventName: string;
  nightDate: string;
  filled: number;
  cap: number;
  chipLabel: string;
  chipTone: "ok" | "warn" | "info";
}

export default async function MyListsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/lists");

  const admin = createAdminClient();
  const userPhone = (user.phone ?? "").trim();
  const userEmail = (user.email ?? "").trim();

  // Match allocations where the user's phone or email is on the holder fields.
  let q = admin
    .from("allocations")
    .select(
      "id, magic_link_token, holder_name, cap, list_open, event_night:event_nights ( night_date, doors_at, event:events ( id, name ) )",
    );

  if (userPhone && userEmail) {
    q = q.or(`holder_phone.eq.${userPhone},holder_email.eq.${userEmail}`);
  } else if (userPhone) {
    q = q.eq("holder_phone", userPhone);
  } else if (userEmail) {
    q = q.eq("holder_email", userEmail);
  } else {
    return <EmptyState />;
  }

  const { data: allocs } = await q;

  // For each allocation count filled guests in one batch.
  const tokens = (allocs ?? []).map((a) => a.magic_link_token);
  const filledByToken = new Map<string, number>();
  if (tokens.length > 0) {
    // Best-effort per-allocation count. (No grouping API; loop is fine for the
    // typical small N — most operators have a handful of lists.)
    for (const a of allocs ?? []) {
      const { count } = await admin
        .from("guests")
        .select("id", { count: "exact", head: true })
        .eq("allocation_id", a.id)
        .in("status", ["approved", "pending"]);
      filledByToken.set(a.magic_link_token, count ?? 0);
    }
  }

  const rows: ListRow[] = (allocs ?? []).map((a) => {
    const night = Array.isArray(a.event_night)
      ? a.event_night[0]
      : a.event_night;
    const ev = Array.isArray(night?.event) ? night?.event[0] : night?.event;
    const filled = filledByToken.get(a.magic_link_token) ?? 0;
    const cap = a.cap;
    const pct = cap === 0 ? 0 : filled / cap;
    const chipLabel = !a.list_open
      ? "Closed"
      : pct >= 1
        ? "Full"
        : pct >= 0.75
          ? "Almost full"
          : "Open";
    const chipTone: "ok" | "warn" | "info" =
      !a.list_open || pct >= 1 ? "warn" : pct >= 0.75 ? "warn" : "ok";
    return {
      token: a.magic_link_token,
      label: a.holder_name,
      eventName: ev?.name ?? "Event",
      nightDate: night?.night_date ?? "",
      filled,
      cap,
      chipLabel,
      chipTone,
    };
  });

  if (rows.length === 0) return <EmptyState />;

  const liveCount = rows.filter((r) => r.chipLabel === "Open" || r.chipLabel === "Almost full").length;

  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PageHeader
        eyebrow={`My lists · ${liveCount} active`}
        title="Lists"
        sub="Every list you own, across all events."
      />
      <div style={{ padding: "var(--s-8)", maxWidth: 1100, margin: "0 auto" }}>
        <div className="card">
          {rows.map((r, i) => (
            <Link
              key={r.token}
              href={`/h/${r.token}`}
              className="row"
              style={{
                gridTemplateColumns: "1.4fr 1fr 110px 100px 110px",
                cursor: "pointer",
                textDecoration: "none",
                color: "inherit",
                borderBottom:
                  i === rows.length - 1 ? "0" : "1px solid var(--line)",
              }}
            >
              <span className="t-h2 truncate">{r.label}</span>
              <span className="t-body-2 truncate">{r.eventName}</span>
              <span className="t-meta">{fmtDate(r.nightDate)}</span>
              <span className="t-num">
                {r.filled}/{r.cap}
              </span>
              <span
                className={`chip chip--${r.chipTone}`}
                style={{ justifySelf: "start" }}
              >
                {r.chipLabel}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PageHeader
        eyebrow="My lists"
        title="No lists yet"
        sub="When a venue invites you to hold a list, it shows up here."
      />
      <div
        style={{
          padding: "var(--s-16) var(--s-8)",
          textAlign: "center",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <p className="t-body-2" style={{ color: "var(--fg-2)" }}>
          Operators invite list-owners (promoters, DJs, friends) via SMS. The
          invite opens a magic link — no signup needed. Once you accept, the
          list shows up here whenever you&apos;re signed in with the same
          phone or email.
        </p>
        <Link
          href="/"
          className="btn btn--ghost"
          style={{ marginTop: "var(--s-6)", textDecoration: "none" }}
        >
          ← Home
        </Link>
      </div>
    </main>
  );
}
