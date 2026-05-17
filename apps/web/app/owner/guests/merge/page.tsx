import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import MergeForm from "./merge-form";

export const dynamic = "force-dynamic";

interface SideRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tags: string[] | null;
  status: string;
  created_at: string;
  night: {
    night_date: string;
    event: { id: string; name: string; account_id: string };
  };
  check_ins: Array<{ state: string }>;
}

function PageShell({ children }: { children: React.ReactNode }) {
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
      <div style={{ maxWidth: 720, margin: "0 auto" }}>{children}</div>
    </main>
  );
}

export default async function GuestMergePage({
  searchParams,
}: {
  searchParams: { ids?: string };
}) {
  const { account } = await requireOwnerContext();
  const ids = (searchParams.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length !== 2) {
    return (
      <PageShell>
        <div className="w-type-display-md" style={{ marginBottom: 16 }}>
          Merge guests
        </div>
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-fg-muted)", marginBottom: 8 }}
        >
          Pass two guest IDs in the URL like:{" "}
          <code
            style={{
              color: "var(--w-acc)",
              fontFamily: "var(--w-mono)",
              fontSize: 12,
            }}
          >
            /owner/guests/merge?ids=A,B
          </code>
          .
        </p>
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-fg-muted)" }}
        >
          Find guest IDs from the queue or guest detail page (last segment of
          the URL).
        </p>
        <Link
          href="/owner"
          style={{ display: "inline-block", marginTop: 24, textDecoration: "none" }}
        >
          <button type="button" className="btn btn--ghost">← Back</button>
        </Link>
      </PageShell>
    );
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("guests")
    .select(
      "id, full_name, phone, email, notes, tags, status, created_at, " +
        "night:event_nights!inner(night_date, event:events!inner(id, name, account_id)), " +
        "check_ins(state)",
    )
    .in("id", ids);
  const rows = ((data ?? []) as unknown as SideRow[]).filter(
    (r) => r.night.event.account_id === account.id,
  );
  if (rows.length !== 2) {
    return (
      <PageShell>
        <div className="w-type-display-md" style={{ marginBottom: 16 }}>
          Merge guests
        </div>
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)" }}
        >
          One or both guests not found, or not in your account.
        </p>
        <Link
          href="/owner"
          style={{ display: "inline-block", marginTop: 24, textDecoration: "none" }}
        >
          <button type="button" className="btn btn--ghost">← Back</button>
        </Link>
      </PageShell>
    );
  }

  const a = rows.find((r) => r.id === ids[0])!;
  const b = rows.find((r) => r.id === ids[1])!;

  function side(r: SideRow) {
    return {
      id: r.id,
      full_name: r.full_name,
      phone: r.phone,
      email: r.email,
      notes: r.notes,
      tags: r.tags ?? [],
      event_name: r.night.event.name,
      night_date: fmtDate(r.night.night_date),
      status: r.status,
      check_ins: r.check_ins.length,
      created_at: r.created_at,
    };
  }

  return (
    <PageShell>
      <Link
        href="/owner"
        className="w-type-meta"
        style={{
          color: "var(--w-fg-muted)",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: 12,
        }}
      >
        ← BACK
      </Link>
      <div
        style={{
          borderBottom: "1px solid var(--w-line)",
          paddingBottom: 24,
          marginBottom: 24,
        }}
      >
        <div className="w-type-meta">MERGE</div>
        <div className="w-type-display-md" style={{ marginTop: 8 }}>
          Merge guests
        </div>
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
        >
          The older record wins. The newer becomes a soft-deleted reference.
          Check-ins, tags, referrals carry over.
        </p>
      </div>

      <MergeForm a={side(a)} b={side(b)} />
    </PageShell>
  );
}
