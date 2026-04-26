import Link from "next/link";
import PublicShell from "@/components/public-shell";
import MarketingFooter from "@/components/marketing-footer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Help — WADL",
  description: "How WADL works at the door, and how to get help when it doesn't.",
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
    a: "When approved heads cross the lockdown threshold (default 90%), WADL auto-flips the night to frozen — all allocations close, no new RSVPs, and a coral capacity-alert pushes to staff. You can override individual entries from the daydash.",
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
        <header className="mb-8">
          <p className="label-mono mb-2">Help</p>
          <h1 className="font-display text-5xl md:text-6xl text-cream uppercase tracking-wide leading-[0.95]">
            Stuck at the door<span className="text-coral">?</span>
          </h1>
          <p className="text-cream/70 text-base leading-relaxed mt-3 max-w-2xl">
            Eight things that fix 90% of door problems. Anything else, the
            founder reads every email — see Contact below.
          </p>
        </header>

        <section className="flex flex-col gap-3 mb-12">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="card group hover:border-coral/40 transition"
            >
              <summary className="cursor-pointer flex items-start justify-between gap-4 list-none">
                <p className="font-sans font-semibold text-cream pr-2">{f.q}</p>
                <span className="font-display text-2xl text-coral shrink-0 group-open:rotate-45 transition">
                  +
                </span>
              </summary>
              <p className="text-cream/80 text-sm leading-relaxed mt-3">{f.a}</p>
            </details>
          ))}
        </section>

        <section className="card border-coral/40 bg-s2 text-center">
          <p className="label-mono text-coral mb-2">Still stuck</p>
          <p className="font-display text-3xl text-cream uppercase tracking-wide mb-3">
            Email the founder.
          </p>
          <p className="text-cream/70 text-sm mb-5 max-w-md mx-auto">
            Jordy reads every message. Reply usually within an hour during a
            real night, same day otherwise.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.16em] px-5 py-3 rounded-full hover:brightness-110 transition"
          >
            Contact →
          </Link>
        </section>
      </PublicShell>
      <MarketingFooter />
    </>
  );
}
