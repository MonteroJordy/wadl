import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/v5";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shift summary — WADL" };

interface PageProps {
  params: { id: string };
}

export default async function StaffSummaryPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/door/events/${params.id}/end-of-shift`);

  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select("name")
    .eq("id", params.id)
    .maybeSingle();
  if (!ev) notFound();

  // Pick the most relevant night (today, else most recent).
  const today = new Date().toISOString().slice(0, 10);
  const { data: nights } = await admin
    .from("event_nights")
    .select("id, night_date")
    .eq("event_id", params.id)
    .order("night_date", { ascending: false });
  const focus =
    nights?.find((n) => n.night_date === today) ?? nights?.[0] ?? null;

  let scanCount = 0;
  let manualCount = 0;
  let firstAt: string | null = null;
  let lastAt: string | null = null;

  if (focus) {
    const { data: rows } = await admin
      .from("check_ins")
      .select("scanned_at, method")
      .eq("event_night_id", focus.id)
      .eq("scanned_by", user.id)
      .order("scanned_at", { ascending: true });
    scanCount = rows?.length ?? 0;
    manualCount = (rows ?? []).filter(
      (r) => r.method === "manual" || r.method === "walk_in",
    ).length;
    firstAt = rows?.[0]?.scanned_at ?? null;
    lastAt = rows?.[rows.length - 1]?.scanned_at ?? null;
  }

  // Average seconds between scans (rough "speed").
  const spanSec =
    firstAt && lastAt && scanCount > 1
      ? Math.round(
          (new Date(lastAt).getTime() - new Date(firstAt).getTime()) /
            1000 /
            (scanCount - 1),
        )
      : null;

  // Resolve operator display name from profile.
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const first = (profile?.full_name ?? "").split(" ")[0] || "you";

  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header style={{ padding: "var(--s-5)" }}>
        <Logo size={20} />
      </header>

      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          padding: "var(--s-5)",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-5)",
        }}
      >
        <div>
          <span className="chip chip--ok">Shift complete</span>
          <h1
            className="t-display-sm"
            style={{ marginTop: "var(--s-3)", lineHeight: 1.15 }}
          >
            Thanks, {first}
          </h1>
          <p
            className="t-body-2"
            style={{ marginTop: "var(--s-2)", color: "var(--fg-2)" }}
          >
            {ev.name}
            {focus ? ` · ${focus.night_date}` : ""}
          </p>
        </div>

        <div className="card" style={{ padding: "var(--s-5)" }}>
          <div className="t-meta">YOUR NUMBERS</div>
          <div
            style={{
              marginTop: "var(--s-3)",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--s-3)",
            }}
          >
            <div>
              <div className="t-meta">Scans</div>
              <div
                className="t-display-sm"
                style={{ marginTop: "var(--s-1)" }}
              >
                {scanCount}
              </div>
            </div>
            <div>
              <div className="t-meta">Manual</div>
              <div
                className="t-display-sm"
                style={{ marginTop: "var(--s-1)" }}
              >
                {manualCount}
              </div>
            </div>
            <div>
              <div className="t-meta">Speed</div>
              <div
                className="t-display-sm"
                style={{ marginTop: "var(--s-1)" }}
              >
                {spanSec ? `${spanSec}s` : "—"}
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/door"
          className="btn btn--lg btn--block"
          style={{ textDecoration: "none" }}
        >
          Done
        </Link>
      </div>
    </main>
  );
}
