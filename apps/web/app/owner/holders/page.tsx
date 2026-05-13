import Link from "next/link";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Avatar,
  Button,
  CapacityMeter,
  Chip,
  IconArrow,
} from "@/components/wadl";

export const dynamic = "force-dynamic";
export const metadata = { title: "Holders — WADL" };

interface AllocRow {
  id: string;
  holder_name: string;
  holder_phone: string | null;
  holder_email: string | null;
  cap: number;
  event_night: {
    night_date: string;
    doors_at: string;
    event: { id: string; name: string; account_id: string };
  };
  guests: Array<{
    status: string;
    plus_ones: number;
    check_ins: Array<{ state: string }>;
  }>;
}

interface HolderAgg {
  key: string;
  display_name: string;
  events: Set<string>;
  approved: number;
  scanned: number;
  cap_total: number;
  most_recent_at: string;
  phones: Set<string>;
  emails: Set<string>;
}

export default async function HoldersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const { account } = await requireOwnerContext();
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const admin = createAdminClient();

  const { data: rowsRaw } = await admin
    .from("allocations")
    .select(
      "id, holder_name, holder_phone, holder_email, cap, " +
        "event_night:event_nights!inner(night_date, doors_at, event:events!inner(id, name, account_id)), " +
        "guests(status, plus_ones, check_ins(state))",
    );
  const rows = ((rowsRaw ?? []) as unknown as AllocRow[]).filter(
    (r) => r.event_night.event.account_id === account.id,
  );

  const byKey = new Map<string, HolderAgg>();
  for (const r of rows) {
    const key = r.holder_name.toLowerCase().trim();
    if (q && !key.includes(q)) continue;
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        display_name: r.holder_name,
        events: new Set(),
        approved: 0,
        scanned: 0,
        cap_total: 0,
        most_recent_at: r.event_night.doors_at,
        phones: new Set(),
        emails: new Set(),
      });
    }
    const h = byKey.get(key)!;
    h.events.add(r.event_night.event.id);
    h.cap_total += r.cap;
    if (r.holder_phone) h.phones.add(r.holder_phone);
    if (r.holder_email) h.emails.add(r.holder_email);
    if (r.event_night.doors_at > h.most_recent_at)
      h.most_recent_at = r.event_night.doors_at;
    for (const g of r.guests ?? []) {
      if (g.status !== "approved") continue;
      const heads = 1 + (g.plus_ones ?? 0);
      h.approved += heads;
      if (g.check_ins.some((c) => c.state === "approved")) h.scanned += heads;
    }
  }

  const holders = [...byKey.values()].sort((a, b) =>
    a.most_recent_at < b.most_recent_at ? 1 : -1,
  );

  // Aggregate summary across visible holders
  const totalApproved = holders.reduce((s, h) => s + h.approved, 0);
  const totalScanned = holders.reduce((s, h) => s + h.scanned, 0);
  const totalCap = holders.reduce((s, h) => s + h.cap_total, 0);
  const aggShowRate =
    totalApproved === 0 ? 0 : Math.round((totalScanned / totalApproved) * 100);

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
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="w-type-meta">PEOPLE WHO BRING NIGHTS</div>
            <div className="w-type-display-md" style={{ marginTop: 8 }}>
              Promoters
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 8,
              }}
            >
              {holders.length} unique promoter
              {holders.length === 1 ? "" : "s"} across this account · ranked
              by show rate
            </p>
          </div>
          <Link href="/owner" style={{ textDecoration: "none" }}>
            <Button variant="ghost">← Events</Button>
          </Link>
        </div>

        {/* Aggregate KPI */}
        {holders.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginTop: 28,
            }}
          >
            <KPI
              eyebrow="HOLDERS"
              big={String(holders.length)}
              sub="active across this account"
            />
            <KPI
              eyebrow="HEADS DELIVERED"
              big={String(totalApproved)}
              sub={`of ${totalCap} cap`}
            />
            <KPI
              eyebrow="SHOW RATE"
              big={`${aggShowRate}%`}
              sub={`${totalScanned} scanned in`}
              accent
            />
          </div>
        )}

        {/* Search */}
        <form
          action="/owner/holders"
          method="get"
          style={{ marginTop: 28 }}
        >
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="search by holder name…"
            className="w-input"
          />
        </form>

        {/* List */}
        {holders.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
              marginTop: 28,
            }}
          >
            <div className="w-type-h1">No promoters yet</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 440,
                marginInline: "auto",
              }}
            >
              Open an event, hand a promoter a list, send them their magic
              link. Their show rate (how many of their RSVPs actually
              scanned in) starts ranking here after their first night.
            </p>
            <Link
              href="/owner"
              className="w-btn w-btn--primary"
              style={{
                marginTop: 24,
                textDecoration: "none",
                display: "inline-flex",
              }}
            >
              Back to events
            </Link>
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "20px 0 0",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {holders.map((h) => {
              const showRate =
                h.approved === 0
                  ? 0
                  : Math.round((h.scanned / h.approved) * 100);
              const showRateColor =
                showRate >= 80
                  ? "var(--w-ok)"
                  : showRate >= 60
                    ? "var(--w-fg)"
                    : "var(--w-warn)";
              return (
                <li key={h.key}>
                  <Link
                    href={`/owner/scorecards/${encodeURIComponent(h.key)}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      className="w-card"
                      style={{
                        padding: 18,
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <Avatar name={h.display_name} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 15,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h.display_name}
                        </div>
                        <div
                          className="w-type-meta"
                          style={{ marginTop: 4 }}
                        >
                          {h.events.size} EVENT
                          {h.events.size === 1 ? "" : "S"} · CAP {h.cap_total}{" "}
                          · LAST {fmtDate(h.most_recent_at).toUpperCase()}
                        </div>
                        {h.cap_total > 0 && (
                          <div
                            style={{
                              marginTop: 10,
                              maxWidth: 280,
                            }}
                          >
                            <CapacityMeter
                              current={h.scanned}
                              total={h.cap_total}
                              accent
                              label="DELIVERED"
                            />
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                          flexShrink: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--w-display)",
                            fontWeight: 700,
                            fontSize: 32,
                            letterSpacing: "-0.025em",
                            lineHeight: 1,
                            color: showRateColor,
                          }}
                        >
                          {showRate}%
                        </div>
                        <div className="w-type-meta">
                          {h.scanned}/{h.approved}
                        </div>
                        <Chip tone="ghost">
                          <IconArrow size={12} />
                        </Chip>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function KPI({
  eyebrow,
  big,
  sub,
  accent,
}: {
  eyebrow: string;
  big: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="w-card"
      style={{
        padding: 18,
        borderColor: accent ? "var(--w-acc)" : "var(--w-line)",
        background: accent ? "var(--w-acc-soft)" : "var(--w-surface-2)",
      }}
    >
      <div className="w-type-meta">{eyebrow}</div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontWeight: 700,
          fontSize: 32,
          letterSpacing: "-0.025em",
          marginTop: 6,
          lineHeight: 1,
        }}
      >
        {big}
      </div>
      {sub && (
        <div
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginTop: 8,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
