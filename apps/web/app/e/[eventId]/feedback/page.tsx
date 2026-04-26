import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Only show the survey for events whose latest night is in the past.
  const lastDoorsAt = ev.event_nights
    .map((n) => new Date(n.doors_at).getTime())
    .sort((a, b) => b - a)[0];
  const isPast = lastDoorsAt && lastDoorsAt < Date.now();
  if (!isPast) {
    return (
      <main id="main-content" className="mobile-frame">
        <header className="pt-6 pb-4">
          <p className="label-mono">Feedback</p>
          <h1 className="display-lg leading-[0.95]">{ev.name}</h1>
        </header>
        <div className="card">
          <p className="font-sans text-cream font-semibold mb-1">
            Event hasn&apos;t happened yet
          </p>
          <p className="text-muted text-sm">
            Come back after the night to share how it went.
          </p>
        </div>
      </main>
    );
  }

  // Validate token if provided — it pre-fills the guest_id link so the
  // submission gets attributed (still anonymous to the venue's view).
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
      <main id="main-content" className="mobile-frame">
        <header className="pt-6 pb-4">
          <p className="label-mono">Feedback</p>
          <h1 className="display-lg leading-[0.95]">{ev.name}</h1>
        </header>
        <div className="card border-mint bg-s2">
          <p className="label-mono text-mint mb-2">Thanks for letting us know</p>
          <p className="text-cream text-sm leading-relaxed">
            Your rating helps the venue book better nights. See you next time.
          </p>
        </div>
        <Link href="/discover" className="btn-ghost block text-center mt-4">
          Browse upcoming events
        </Link>
      </main>
    );
  }

  return (
    <main id="main-content" className="mobile-frame">
      <header className="pt-6 pb-4">
        <p className="label-mono">How was your night?</p>
        <h1 className="display-lg leading-[0.95]">{ev.name}</h1>
        {guestName && (
          <p className="label-mono mt-2">For {guestName}</p>
        )}
      </header>
      <FeedbackForm eventId={ev.id} guestId={guestId} token={token} />
      <p className="label-mono mt-4 text-center">
        One rating per guest · stays private
      </p>
    </main>
  );
}
