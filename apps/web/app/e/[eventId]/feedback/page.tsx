import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button, Chip, WFrame, Wordmark } from "@/components/wadl";
import FeedbackForm from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "How was your night? — WADL" };

interface EventRow {
  id: string;
  name: string;
  flyer_url: string | null;
  event_nights: Array<{ doors_at: string }>;
}

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
      <main id="main-content">
        <WFrame style={{ paddingBottom: 48 }}>
          <div style={{ padding: "20px 24px 0" }}>
            <Wordmark variant="monogrid" size={18} />
          </div>
          <div style={{ padding: "32px 24px 0" }}>
            <div className="w-type-meta">FEEDBACK</div>
            <div
              className="w-type-display-md"
              style={{ marginTop: 6, lineHeight: 1.0 }}
            >
              {ev.name}
            </div>
          </div>
          <div style={{ padding: "24px 24px 0" }}>
            <div className="w-card" style={{ padding: 18 }}>
              <Chip tone="ghost">EVENT NOT YET</Chip>
              <p
                className="w-type-body-sm"
                style={{
                  color: "var(--w-fg-muted)",
                  marginTop: 12,
                }}
              >
                Come back after the night to share how it went.
              </p>
            </div>
          </div>
        </WFrame>
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
      <main id="main-content">
        <WFrame style={{ paddingBottom: 48 }}>
          <div style={{ padding: "20px 24px 0" }}>
            <Wordmark variant="monogrid" size={18} />
          </div>
          <div style={{ padding: "32px 24px 0" }}>
            <div className="w-type-meta">FEEDBACK</div>
            <div
              className="w-type-display-md"
              style={{ marginTop: 6, lineHeight: 1.0 }}
            >
              {ev.name}
            </div>
          </div>
          <div style={{ padding: "24px 24px 0" }}>
            <div
              className="w-card"
              style={{
                padding: 18,
                borderColor: "var(--w-ok)",
                background: "oklch(0.86 0.18 145 / 0.06)",
              }}
            >
              <Chip tone="ok">✓ THANKS FOR LETTING US KNOW</Chip>
              <p
                className="w-type-body-sm"
                style={{ marginTop: 12 }}
              >
                Your rating helps the venue book better nights. See you next
                time.
              </p>
            </div>
            <Link
              href="/discover"
              style={{
                textDecoration: "none",
                marginTop: 16,
                display: "inline-flex",
                width: "100%",
              }}
            >
              <Button variant="ghost" size="lg" block>
                Browse upcoming events
              </Button>
            </Link>
          </div>
        </WFrame>
      </main>
    );
  }

  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div style={{ padding: "20px 24px 0" }}>
          <Wordmark variant="monogrid" size={18} />
        </div>
        <div style={{ padding: "32px 24px 0" }}>
          <div className="w-type-meta">HOW WAS YOUR NIGHT?</div>
          <div
            className="w-type-display-md"
            style={{ marginTop: 6, lineHeight: 1.0 }}
          >
            {ev.name}
          </div>
          {guestName && (
            <div
              className="w-type-meta"
              style={{ marginTop: 8 }}
            >
              FOR {guestName.toUpperCase()}
            </div>
          )}
        </div>
        <div style={{ padding: "24px 24px 0" }}>
          <FeedbackForm eventId={ev.id} guestId={guestId} token={token} />
        </div>
        <div
          className="w-type-meta"
          style={{
            marginTop: "auto",
            paddingTop: 24,
            paddingBottom: 16,
            textAlign: "center",
            color: "var(--w-fg-dim)",
          }}
        >
          ONE RATING PER GUEST · STAYS PRIVATE
        </div>
      </WFrame>
    </main>
  );
}
