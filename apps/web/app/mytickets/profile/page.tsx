import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile — WADL" };

interface PastRow {
  id: string;
  full_name: string;
  plus_ones: number;
  status: string;
  night: {
    night_date: string;
    doors_at: string;
    event: { id: string; name: string };
  };
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
      "id, full_name, plus_ones, status, night:event_nights!inner(night_date, doors_at, event:events!inner(id, name)), check_ins(state)",
    )
    .eq("phone", phone);
  const rows = (rowsRaw ?? []) as unknown as PastRow[];

  const now = Date.now();
  const past = rows.filter(
    (r) => new Date(r.night.doors_at).getTime() < now - 6 * 60 * 60 * 1000,
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
  const noShowRate = approvedPast === 0 ? 0 : 1 - attended / approvedPast;

  const { count: referralsCount } = await admin
    .from("guests")
    .select("id", { count: "exact", head: true })
    .in(
      "referred_by_guest_id",
      rows.map((r) => r.id),
    );

  past.sort((a, b) => (a.night.doors_at < b.night.doors_at ? 1 : -1));

  return (
    <main
      id="main-content"
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "var(--s-8) var(--s-6) var(--s-24)",
      }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--s-4)",
          }}
        >
          <Link
            href="/mytickets"
            className="t-meta"
            style={{ color: "var(--fg-3)", textDecoration: "none" }}
          >
            ← Tickets
          </Link>
          <div className="t-meta">Profile</div>
        </div>

        <div className="t-display-md" style={{ marginBottom: "var(--s-1)" }}>
          {profileRow?.full_name ?? "Guest"}
        </div>
        <div className="t-meta">{phone}</div>
        {profileRow?.email && (
          <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
            <span>Email</span>{" "}
            <span style={{ color: "var(--fg)" }}>{profileRow.email}</span>
          </div>
        )}

        <section
          className="card"
          style={{ padding: "var(--s-5)", marginTop: "var(--s-6)" }}
        >
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Lifetime
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--s-3)",
            }}
          >
            <Stat label="Events attended" value={attended} />
            <Stat
              label="No-show rate"
              value={`${Math.round(noShowRate * 100)}%`}
              tone={noShowRate > 0.3 ? "err" : "ok"}
            />
            <Stat label="+1s brought" value={plusOnesBrought} />
            <Stat label="Friends referred" value={referralsCount ?? 0} />
          </div>
        </section>

        <section style={{ marginTop: "var(--s-6)" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-2)" }}>
            Past events
          </div>
          {past.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "var(--s-12) var(--s-8)",
                textAlign: "center",
              }}
            >
              <div className="t-h1">No history yet</div>
              <p
                className="t-body-2"
                style={{
                  marginTop: "var(--s-3)",
                  maxWidth: 380,
                  marginInline: "auto",
                  lineHeight: 1.5,
                }}
              >
                Once you&apos;ve been to an event, it&apos;ll show up here.
              </p>
            </div>
          ) : (
            <ul
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-2)",
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {past.slice(0, 30).map((r) => {
                const scanned = r.check_ins.some(
                  (c) => c.state === "approved",
                );
                const chipClass = scanned
                  ? "chip chip--ok"
                  : r.status === "cancelled"
                    ? "chip"
                    : "chip chip--warn";
                return (
                  <li
                    key={r.id}
                    className="card"
                    style={{ padding: "var(--s-4)" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: "var(--s-3)",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p className="t-body truncate">
                          {r.night.event.name}
                        </p>
                        <div
                          className="t-meta"
                          style={{ marginTop: "var(--s-1)" }}
                        >
                          {fmtDate(r.night.night_date)}
                        </div>
                      </div>
                      <span className={chipClass}>
                        {scanned ? "Attended" : r.status}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div
          className="t-meta"
          style={{ marginTop: "var(--s-8)", textAlign: "center" }}
        >
          <a
            href="/api/auth/signout"
            style={{ color: "var(--fg-3)", textDecoration: "none" }}
          >
            Sign out
          </a>
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "ok" | "err";
}) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "err"
        ? "var(--err)"
        : "var(--fg)";
  return (
    <div>
      <div className="t-meta">{label}</div>
      <div
        className="t-display-sm t-num"
        style={{ marginTop: "var(--s-1)", color }}
      >
        {value}
      </div>
    </div>
  );
}
