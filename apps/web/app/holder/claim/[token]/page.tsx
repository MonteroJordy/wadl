import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtTime } from "@/lib/format";
import { Button, Chip, IconCheck, WFrame, Wordmark } from "@/components/wadl";
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
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div style={{ padding: "20px 24px 0" }}>
          <Wordmark variant="monogrid" size={18} />
        </div>
        <div style={{ padding: "96px 24px 0", textAlign: "center" }}>
          <div className="w-type-meta">CLAIM</div>
          <div className="w-type-display-md" style={{ marginTop: 12 }}>
            {title}
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 12 }}
          >
            {body}
          </p>
          <div
            style={{
              marginTop: 32,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxWidth: 280,
              marginInline: "auto",
            }}
          >
            <Link href="/holder" style={{ textDecoration: "none" }}>
              <Button variant="primary" block>
                Your allocations
              </Button>
            </Link>
            <Link href="/discover" style={{ textDecoration: "none" }}>
              <Button variant="ghost" block>
                Browse events
              </Button>
            </Link>
          </div>
        </div>
      </WFrame>
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
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Wordmark variant="monogrid" size={18} />
          <Chip tone="acc">CLAIM YOUR ALLOCATION</Chip>
        </div>

        <div style={{ padding: "32px 24px 0" }}>
          <div className="w-type-meta">
            {fmtDate(data.allocation.event_night.night_date).toUpperCase()} ·
            DOORS {fmtTime(data.allocation.event_night.doors_at).toUpperCase()}
          </div>
          <div
            className="w-type-display-md"
            style={{ marginTop: 6, lineHeight: 1.0 }}
          >
            {data.allocation.event_night.event.name}
          </div>
        </div>

        <div style={{ padding: "24px 24px 0" }}>
          <div className="w-card" style={{ padding: 18 }}>
            <div className="w-type-meta">YOUR ALLOCATION</div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 17,
                marginTop: 6,
              }}
            >
              {data.allocation.holder_name}
            </div>
            <div className="w-type-meta" style={{ marginTop: 8 }}>
              CAP {data.allocation.cap}
            </div>
          </div>
        </div>

        <div style={{ padding: "24px 24px 0" }}>
          <div
            className="w-card"
            style={{
              padding: 18,
              borderColor: "var(--w-acc)",
              background: "var(--w-acc-soft)",
            }}
          >
            <div
              className="w-type-meta"
              style={{ color: "var(--w-acc-ink)" }}
            >
              WHAT YOU GET WHEN YOU CLAIM
            </div>
            <ul
              style={{
                marginTop: 12,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                fontSize: 14,
                lineHeight: 1.5,
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
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: "var(--w-acc-ink)",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <IconCheck size={14} />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            padding: "24px 24px 0",
            lineHeight: 1.55,
          }}
        >
          The host gets a notification when you claim. From there, you manage
          your list at{" "}
          <a
            href="/holder"
            style={{ color: "var(--w-acc)", textDecoration: "underline" }}
          >
            /holder
          </a>
          .
        </div>

        <div style={{ padding: "24px 24px 0" }}>
          <ClaimForm token={params.token} signedIn={!!user} />
        </div>
      </WFrame>
    </main>
  );
}
