import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtTime } from "@/lib/format";
import { Logo } from "@/components/v5";
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
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <Logo size={18} />
      </div>
      <div
        style={{
          padding: "var(--s-24) var(--s-6) 0",
          textAlign: "center",
          maxWidth: 420,
          margin: "0 auto",
        }}
      >
        <div className="t-meta">Claim</div>
        <div className="t-display-md" style={{ marginTop: "var(--s-3)" }}>
          {title}
        </div>
        <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
          {body}
        </p>
        <div
          style={{
            marginTop: "var(--s-8)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-3)",
            maxWidth: 280,
            marginInline: "auto",
          }}
        >
          <Link
            href="/holder"
            className="btn btn--accent btn--block"
            style={{ textDecoration: "none" }}
          >
            Your allocations
          </Link>
          <Link
            href="/discover"
            className="btn btn--ghost btn--block"
            style={{ textDecoration: "none" }}
          >
            Browse events
          </Link>
        </div>
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
      "token, revoked_at, expires_at, allocation:allocations!inner(id, holder_name, cap, event_night:event_nights!inner(night_date, doors_at, event:events!inner(name)))",
    )
    .eq("token", params.token)
    .maybeSingle<TokenRow>();

  if (!data)
    return (
      <ErrorFrame title="Link not found." body="Check the link you were sent." />
    );
  if (data.revoked_at)
    return (
      <ErrorFrame
        title="Link rotated."
        body="Ask the host for the current link."
      />
    );
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return (
      <ErrorFrame
        title="Link expired."
        body="Ask the host for a fresh one."
      />
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <div
        style={{
          padding: "var(--s-6) var(--s-6) 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo size={18} />
        <span className="chip chip--solid">Claim your allocation</span>
      </div>

      <div style={{ padding: "var(--s-8) var(--s-6) 0" }}>
        <div className="t-meta">
          {fmtDate(data.allocation.event_night.night_date)} · Doors{" "}
          {fmtTime(data.allocation.event_night.doors_at)}
        </div>
        <div className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
          {data.allocation.event_night.event.name}
        </div>
      </div>

      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <div className="card" style={{ padding: "var(--s-5)" }}>
          <div className="t-meta">Your allocation</div>
          <div className="t-h1" style={{ marginTop: "var(--s-2)" }}>
            {data.allocation.holder_name}
          </div>
          <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
            Cap {data.allocation.cap}
          </div>
        </div>
      </div>

      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <div
          className="card"
          style={{ padding: "var(--s-5)", borderColor: "var(--fg)" }}
        >
          <div className="t-meta">What you get when you claim</div>
          <ul
            style={{
              marginTop: "var(--s-3)",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-3)",
            }}
          >
            {[
              "A holder dashboard — every event you've been allocated, your show rate per event, lifetime stats.",
              "One sign-in (phone OTP) — no app, no password, no account creation per venue.",
              "Push when an RSVP needs review, when capacity hits 90%, when the host upgrades a tier.",
              "Stay attributed across every venue you ever work — your scorecard travels.",
            ].map((line) => (
              <li
                key={line}
                className="t-body-2"
                style={{
                  display: "flex",
                  gap: "var(--s-2)",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    color: "var(--fg)",
                    flexShrink: 0,
                  }}
                >
                  →
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p
        className="t-body-2"
        style={{ padding: "var(--s-6) var(--s-6) 0" }}
      >
        The host gets a notification when you claim. From there, you manage
        your list at{" "}
        <a
          href="/holder"
          style={{ color: "var(--fg)", textDecoration: "underline" }}
        >
          /holder
        </a>
        .
      </p>

      <div style={{ padding: "var(--s-6) var(--s-6) var(--s-12)" }}>
        <ClaimForm token={params.token} signedIn={!!user} />
      </div>
    </main>
  );
}
