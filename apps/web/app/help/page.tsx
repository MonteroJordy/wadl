import Link from "next/link";
import PublicShell from "@/components/public-shell";
import MarketingFooter from "@/components/marketing-footer";
import { Button, IconArrow } from "@/components/wadl";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Help — WADL",
  description:
    "How WADL works at the door, and how to get help when it doesn't.",
};

const FAQS = [
  {
    q: "I'm at the door and the scanner won't read a QR.",
    a: "Tap SEARCH and find the guest by name — that gets the line moving. Then check that the guest's phone brightness is up and the QR fills the camera. If a real guest's QR keeps refusing, check /owner/sms-log for that phone — the QR may not have been delivered. Last resort: have the door manager use Owner override on the daydash.",
  },
  {
    q: "A promoter says they sent a name but it's not on my list.",
    a: "Open /owner/events/[id]/audit and search the name. Every add (whether by the holder, you, or a co-owner) is logged with attribution. If it's truly missing, check the holder's allocation page — caps may be hit, or the list may have closed.",
  },
  {
    q: "I want to bump someone from GA to VIP at the door.",
    a: "Open the guest detail page from the queue or guest list and set Tier. The guest's Wallet pass / SMS confirmation refreshes on next view. Tier upgrades log to the audit trail.",
  },
  {
    q: "How do I close the list 30 minutes before doors?",
    a: "Open event settings and set the cutoff time per night. WADL stops accepting RSVPs at that timestamp. Existing names stay valid; only new ones are blocked.",
  },
  {
    q: "What happens at capacity?",
    a: "When approved heads cross the lockdown threshold (default 90%), WADL auto-flips the night to frozen — all allocations close, no new RSVPs, and a capacity-alert pushes to staff. You can override individual entries from the daydash.",
  },
  {
    q: "Wi-Fi died at the door.",
    a: "On mobile, every scan goes into an offline queue. The bouncer keeps scanning; the line keeps moving. When network returns the queue drains automatically. Web scanner does the same via localStorage.",
  },
  {
    q: "How do guests get their QR?",
    a: "Phone OTP confirms identity → SMS arrives with a /t/[token] link → the page renders a high-contrast QR. Add to Apple Wallet / Google Wallet works once the operator wires the cert. Email magic-link is a fallback if Twilio is down.",
  },
  {
    q: "Can I run two events on the same night?",
    a: "Yes — each is a separate event with its own door, its own scanner context, and its own staff invites. The owner dashboard groups by night so you can see both at once.",
  },
];

export default async function HelpPage() {
  return (
    <>
      <PublicShell maxWidth="4xl" ambient>
        <header style={{ marginBottom: 40 }}>
          <div className="w-type-meta">HELP</div>
          <h1
            className="w-type-display-lg"
            style={{ marginTop: 12, lineHeight: 0.94 }}
          >
            Stuck at the door
            <span style={{ color: "var(--w-acc)" }}>?</span>
          </h1>
          <p
            className="w-type-body"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 16,
              maxWidth: 640,
            }}
          >
            Eight things that fix 90% of door problems. Anything else, the
            founder reads every email — see Contact below.
          </p>
        </header>

        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 56,
          }}
        >
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="w-card"
              style={{
                padding: 18,
                cursor: "pointer",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  listStyle: "none",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    paddingRight: 8,
                  }}
                >
                  {f.q}
                </span>
                <span
                  style={{
                    fontFamily: "var(--w-display)",
                    fontSize: 22,
                    color: "var(--w-acc)",
                    flexShrink: 0,
                    fontWeight: 600,
                  }}
                >
                  +
                </span>
              </summary>
              <p
                className="w-type-body-sm"
                style={{
                  color: "var(--w-fg-muted)",
                  marginTop: 12,
                  lineHeight: 1.5,
                }}
              >
                {f.a}
              </p>
            </details>
          ))}
        </section>

        <section
          className="w-card"
          style={{
            padding: 24,
            textAlign: "center",
            borderColor: "var(--w-acc)",
            background: "var(--w-acc-soft)",
          }}
        >
          <div
            className="w-type-meta"
            style={{ color: "var(--w-acc)" }}
          >
            STILL STUCK
          </div>
          <h2
            className="w-type-h1"
            style={{ marginTop: 8 }}
          >
            Email the founder.
          </h2>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 8,
              maxWidth: 420,
              marginInline: "auto",
            }}
          >
            Jordy reads every message. Reply usually within an hour during a
            real night, same day otherwise.
          </p>
          <Link
            href="/contact"
            style={{
              display: "inline-flex",
              marginTop: 20,
              textDecoration: "none",
            }}
          >
            <Button variant="primary">
              Contact <IconArrow size={14} />
            </Button>
          </Link>
        </section>
      </PublicShell>
      <MarketingFooter />
    </>
  );
}
