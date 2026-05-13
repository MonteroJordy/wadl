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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Link
            href="/mytickets"
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            ← TICKETS
          </Link>
          <div className="w-type-meta">PROFILE</div>
        </div>

        <div className="w-type-display-md" style={{ marginBottom: 4 }}>
          {profileRow?.full_name ?? "Guest"}
        </div>
        <div className="w-type-meta">{phone}</div>
        {profileRow?.email && (
          <div className="w-type-meta" style={{ marginTop: 4 }}>
            <span style={{ color: "var(--w-fg-muted)" }}>EMAIL</span>{" "}
            <span style={{ color: "var(--w-fg)" }}>{profileRow.email}</span>
          </div>
        )}

        <section
          className="w-card"
          style={{ padding: 18, marginTop: 24 }}
        >
          <div className="w-type-meta" style={{ marginBottom: 12 }}>
            LIFETIME
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <Stat label="EVENTS ATTENDED" value={attended} />
            <Stat
              label="NO-SHOW RATE"
              value={`${Math.round(noShowRate * 100)}%`}
              tone={noShowRate > 0.3 ? "err" : "ok"}
            />
            <Stat label="+1S BROUGHT" value={plusOnesBrought} />
            <Stat label="FRIENDS REFERRED" value={referralsCount ?? 0} />
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <div className="w-type-meta" style={{ marginBottom: 8 }}>
            PAST EVENTS
          </div>
          {past.length === 0 ? (
            <div
              className="w-card"
              style={{
                padding: "48px 32px",
                textAlign: "center",
              }}
            >
              <div className="w-type-h1">No history yet</div>
              <p
                className="w-type-body-sm"
                style={{
                  color: "var(--w-fg-muted)",
                  marginTop: 12,
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
                gap: 8,
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {past.slice(0, 30).map((r) => {
                const scanned = r.check_ins.some(
                  (c) => c.state === "approved",
                );
                const tone = scanned
                  ? "var(--w-ok)"
                  : r.status === "cancelled"
                    ? "var(--w-fg-muted)"
                    : "var(--w-warn)";
                return (
                  <li key={r.id} className="w-card" style={{ padding: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            color: "var(--w-fg)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {r.night.event.name}
                        </p>
                        <div
                          className="w-type-meta"
                          style={{ marginTop: 4 }}
                        >
                          {fmtDate(r.night.night_date).toUpperCase()}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: "2px 10px",
                          border: `1px solid ${tone}`,
                          color: tone,
                          fontFamily: "var(--w-mono)",
                          fontSize: 11,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {scanned ? "ATTENDED" : r.status.toUpperCase()}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div
          className="w-type-meta"
          style={{ marginTop: 32, textAlign: "center" }}
        >
          <a
            href="/api/auth/signout"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            SIGN OUT
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
      ? "var(--w-ok)"
      : tone === "err"
        ? "var(--w-err)"
        : "var(--w-fg)";
  return (
    <div>
      <div className="w-type-meta">{label}</div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          marginTop: 6,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}
