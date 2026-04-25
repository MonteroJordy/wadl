import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtTime } from "@/lib/format";
import ClaimForm from "./claim-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Claim allocation — WADL" };

interface TokenRow {
  token: string;
  allocation: {
    id: string;
    holder_name: string;
    cap: number;
    event_night: {
      night_date: string;
      doors_at: string;
      event: { name: string };
    };
  };
  revoked_at: string | null;
  expires_at: string | null;
}

function ErrorFrame({ title, body }: { title: string; body: string }) {
  return (
    <main id="main-content" className="mobile-frame">
      <div className="pt-12 text-center">
        <p className="label-mono mb-3">WADL</p>
        <h1 className="display-lg mb-3">{title}</h1>
        <p className="text-muted text-sm">{body}</p>
      </div>
    </main>
  );
}

export default async function HolderClaimPage({
  params,
}: {
  params: { token: string };
}) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("allocation_tokens")
    .select(
      "token, revoked_at, expires_at, allocation:allocations!inner(id, holder_name, cap, event_night:event_nights!inner(night_date, doors_at, event:events!inner(name)))"
    )
    .eq("token", params.token)
    .maybeSingle<TokenRow>();

  if (!data) return <ErrorFrame title="Link not found." body="Check the link." />;
  if (data.revoked_at)
    return <ErrorFrame title="Link rotated." body="Ask the host for a new one." />;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return <ErrorFrame title="Link expired." body="Ask the host for a fresh one." />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main id="main-content" className="mobile-frame">
      <header className="pt-6 pb-4">
        <p className="label-mono text-coral mb-2">Claim your allocation</p>
        <h1 className="display-lg">{data.allocation.event_night.event.name}</h1>
        <p className="label-mono mt-2">
          {fmtDate(data.allocation.event_night.night_date)} · Doors{" "}
          {fmtTime(data.allocation.event_night.doors_at)}
        </p>
      </header>

      <section className="card mb-6">
        <p className="label-mono mb-1">Allocation</p>
        <p className="font-sans text-cream font-semibold">
          {data.allocation.holder_name}
        </p>
        <p className="label-mono mt-1">Cap {data.allocation.cap}</p>
      </section>

      <p className="text-cream/80 text-sm leading-relaxed mb-6">
        Claiming links this allocation to your phone so you can manage your
        list, see arrivals, and track your show rate over time at <a className="text-coral underline" href="/holder">/holder</a>.
        The host gets notified.
      </p>

      <ClaimForm token={params.token} signedIn={!!user} />
    </main>
  );
}
