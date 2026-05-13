import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import DryRunControls from "./controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dry run — WADL" };

export default async function DryRunPage({
  params,
}: {
  params: { id: string };
}) {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, name, account_id, event_nights(id, capacity_cap)")
    .eq("id", params.id)
    .maybeSingle<{
      id: string;
      name: string;
      account_id: string;
      event_nights: Array<{ id: string; capacity_cap: number | null }>;
    }>();
  if (!event || event.account_id !== account.id) notFound();

  const nightIds = event.event_nights.map((n) => n.id);
  const totalCap = event.event_nights.reduce(
    (s, n) => s + (n.capacity_cap ?? 0),
    0,
  );

  let existingCount = 0;
  if (nightIds.length > 0) {
    const { count } = await admin
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("notes", "DRYRUN")
      .in("event_night_id", nightIds);
    existingCount = count ?? 0;
  }

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
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <Link
          href={`/owner/events/${event.id}`}
          className="w-type-meta"
          style={{
            color: "var(--w-fg-muted)",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 12,
          }}
        >
          ← {event.name.toUpperCase()}
        </Link>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">DRY RUN</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Dry run
          </div>
          <p
            style={{
              color: "var(--w-fg)",
              opacity: 0.7,
              fontSize: 14,
              lineHeight: 1.6,
              marginTop: 12,
              maxWidth: 640,
            }}
          >
            Stress-test the daydash, queue, recap, and SMS log without burning
            a real Friday. Seeds DRYRUN-flagged guests with realistic
            distribution (mix of approved + pending + waitlisted, plus-ones,
            tier mix). Optional check-in simulation jitters scans across the
            2h after doors so the arrival-velocity chart populates.
          </p>
        </div>

        <section
          className="w-card"
          style={{ padding: 20, marginBottom: 12 }}
        >
          <div className="w-type-meta" style={{ marginBottom: 14 }}>
            CURRENT STATE
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            <DryStat label="DRYRUN GUESTS" value={existingCount} />
            <DryStat
              label={`NIGHT${event.event_nights.length === 1 ? "" : "S"}`}
              value={event.event_nights.length}
            />
            <DryStat label="TOTAL CAP" value={totalCap || "—"} />
          </div>
        </section>

        <DryRunControls eventId={event.id} existingCount={existingCount} />

        <section className="w-card" style={{ padding: 20, marginTop: 12 }}>
          <div className="w-type-meta" style={{ marginBottom: 12 }}>
            WHAT THIS POPULATES
          </div>
          <ul
            style={{
              color: "var(--w-fg)",
              opacity: 0.85,
              fontSize: 14,
              lineHeight: 1.7,
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <Bullet>
              <span style={{ color: "var(--w-acc)" }}>Daydash hero stats</span>{" "}
              — In/Pending/RSVPs counters move with realistic numbers.
            </Bullet>
            <Bullet>
              <span style={{ color: "var(--w-acc)" }}>Capacity ETA</span> —
              recent-30-minute scan rate becomes nonzero, the projected-at-cap
              pill activates.
            </Bullet>
            <Bullet>
              <span style={{ color: "var(--w-acc)" }}>Approval queue</span> —
              the pending bucket has things to approve.
            </Bullet>
            <Bullet>
              <span style={{ color: "var(--w-acc)" }}>Top holders</span> — if
              you have allocations, simulated guests roll up to them.
            </Bullet>
            <Bullet>
              <span style={{ color: "var(--w-acc)" }}>Recap</span> — show rate,
              tier breakdown, top-holder ranking all populate.
            </Bullet>
            <Bullet>
              <span style={{ color: "var(--w-acc)" }}>
                Hour velocity chart
              </span>{" "}
              — arrival distribution renders properly.
            </Bullet>
          </ul>
        </section>

        <section
          className="w-card"
          style={{
            padding: 20,
            marginTop: 12,
            borderColor: "var(--w-err)",
            background: "var(--w-surface-2)",
          }}
        >
          <div
            className="w-type-meta"
            style={{ color: "var(--w-err)", marginBottom: 12 }}
          >
            WHAT IT DOESN&apos;T DO
          </div>
          <ul
            style={{
              color: "var(--w-fg)",
              opacity: 0.85,
              fontSize: 14,
              lineHeight: 1.7,
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <Bullet>
              No real SMS goes out — phones are +1555 placeholder numbers.
            </Bullet>
            <Bullet>No webhooks fire to integrations.</Bullet>
            <Bullet>
              No notifications get pushed (the Supabase Realtime bell stays
              quiet).
            </Bullet>
            <Bullet>
              Cleanup deletes every guest tagged{" "}
              <code
                style={{
                  color: "var(--w-acc)",
                  fontFamily: "var(--w-mono)",
                  fontSize: 12,
                }}
              >
                notes = &quot;DRYRUN&quot;
              </code>{" "}
              on this event&apos;s nights — leaves real guests intact.
            </Bullet>
          </ul>
        </section>
      </div>
    </main>
  );
}

function DryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          color: "var(--w-fg)",
        }}
      >
        {value}
      </div>
      <div className="w-type-meta" style={{ marginTop: 6 }}>
        {label}
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        paddingLeft: 18,
        position: "relative",
        marginBottom: 6,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          color: "var(--w-fg-dim)",
        }}
      >
        ·
      </span>
      {children}
    </li>
  );
}
