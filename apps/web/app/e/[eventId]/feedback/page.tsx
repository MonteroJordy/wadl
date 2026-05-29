import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/v5";
import FeedbackForm from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "How was your night? — WADL" };

interface EventRow {
  id: string;
  name: string;
  flyer_url: string | null;
  event_nights: Array<{ doors_at: string }>;
}

const SHELL_STYLE: React.CSSProperties = {
  marginInline: "auto",
  width: "100%",
  maxWidth: 420,
  minHeight: "100vh",
  background: "var(--bg)",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  paddingBottom: "var(--s-12)",
};

export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams: { token?: string; submitted?: string };
}) {
  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select("id, name, flyer_url, event_nights(doors_at)")
    .eq("id", params.eventId)
    .maybeSingle<EventRow>();
  if (!ev) notFound();

  const lastDoorsAt = ev.event_nights
    .map((n) => new Date(n.doors_at).getTime())
    .sort((a, b) => b - a)[0];
  const isPast = lastDoorsAt && lastDoorsAt < Date.now();

  if (!isPast) {
    return (
      <main id="main-content" className="v5">
        <div style={SHELL_STYLE}>
          <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
            <Logo size={18} />
          </div>
          <div style={{ padding: "var(--s-8) var(--s-6) 0" }}>
            <div className="t-meta">Feedback</div>
            <div
              className="t-display-md"
              style={{ marginTop: "var(--s-2)", lineHeight: 1.0 }}
            >
              {ev.name}
            </div>
          </div>
          <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
            <div className="card" style={{ padding: "var(--s-5)" }}>
              <span className="chip">Event not yet</span>
              <p
                className="t-body-2"
                style={{ marginTop: "var(--s-3)" }}
              >
                Come back after the night to share how it went.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const token = searchParams.token ?? "";
  let guestId: string | null = null;
  let guestName: string | null = null;
  let alreadySubmitted = false;
  if (token) {
    const { data: g } = await admin
      .from("guests")
      .select("id, full_name")
      .eq("check_in_token", token)
      .maybeSingle<{ id: string; full_name: string }>();
    if (g) {
      guestId = g.id;
      guestName = g.full_name;
      const { data: prior } = await admin
        .from("event_feedback")
        .select("id")
        .eq("event_id", ev.id)
        .eq("guest_id", g.id)
        .maybeSingle();
      alreadySubmitted = !!prior;
    }
  }

  if (searchParams.submitted === "1" || alreadySubmitted) {
    return (
      <main id="main-content" className="v5">
        <div style={SHELL_STYLE}>
          <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
            <Logo size={18} />
          </div>
          <div style={{ padding: "var(--s-8) var(--s-6) 0" }}>
            <div className="t-meta">Feedback</div>
            <div
              className="t-display-md"
              style={{ marginTop: "var(--s-2)", lineHeight: 1.0 }}
            >
              {ev.name}
            </div>
          </div>
          <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
            <div
              className="card"
              style={{ padding: "var(--s-5)", borderColor: "var(--ok)" }}
            >
              <span className="chip chip--ok">Thanks for letting us know</span>
              <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
                Your rating helps the venue book better nights. See you next
                time.
              </p>
            </div>
            <Link
              href="/discover"
              className="btn btn--ghost btn--lg btn--block"
              style={{
                textDecoration: "none",
                marginTop: "var(--s-4)",
              }}
            >
              Browse upcoming events
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="v5">
      <div style={SHELL_STYLE}>
        <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
          <Logo size={18} />
        </div>
        <div style={{ padding: "var(--s-8) var(--s-6) 0" }}>
          <div className="t-meta">How was your night?</div>
          <div
            className="t-display-md"
            style={{ marginTop: "var(--s-2)", lineHeight: 1.0 }}
          >
            {ev.name}
          </div>
          {guestName && (
            <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
              For {guestName}
            </div>
          )}
        </div>
        <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
          <FeedbackForm eventId={ev.id} guestId={guestId} token={token} />
        </div>
        <div
          className="t-meta"
          style={{
            marginTop: "auto",
            paddingTop: "var(--s-6)",
            paddingBottom: "var(--s-4)",
            textAlign: "center",
            color: "var(--fg-4)",
          }}
        >
          One rating per guest · stays private
        </div>
      </div>
    </main>
  );
}
