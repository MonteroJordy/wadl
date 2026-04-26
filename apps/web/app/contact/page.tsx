import PublicShell from "@/components/public-shell";
import MarketingFooter from "@/components/marketing-footer";

export const metadata = {
  title: "Contact — WADL",
  description: "Reach the founder of WADL. Reply usually within an hour during a real night.",
};

export default async function ContactPage() {
  return (
    <>
      <PublicShell maxWidth="4xl" ambient>
        <header className="mb-10">
          <p className="label-mono mb-2">Contact</p>
          <h1 className="font-display text-5xl md:text-6xl text-cream uppercase tracking-wide leading-[0.95]">
            One person<br />reads every message.
          </h1>
          <p className="text-cream/70 text-base leading-relaxed mt-4 max-w-2xl">
            That person is Jordy. He runs nights in Miami and built WADL because
            he was tired of the WhatsApp door. If you&apos;re working a real
            night and something&apos;s broken, reply usually lands within an
            hour — same day otherwise.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-4 mb-10">
          <a
            href="mailto:jmontero@mainframeagency.com"
            className="card hover:border-coral transition group"
          >
            <p className="label-mono text-coral mb-2">Email</p>
            <p className="font-sans font-semibold text-cream text-lg group-hover:text-coral transition">
              jmontero@mainframeagency.com
            </p>
            <p className="text-muted text-sm mt-2">
              Best for ops issues, billing, real-night fires.
            </p>
          </a>
          <a
            href="sms:+13057990518"
            className="card hover:border-coral transition group"
          >
            <p className="label-mono text-coral mb-2">SMS</p>
            <p className="font-sans font-semibold text-cream text-lg group-hover:text-coral transition">
              (305) 799 0518
            </p>
            <p className="text-muted text-sm mt-2">
              Text only. For during-the-night urgencies.
            </p>
          </a>
        </div>

        <section className="card mb-6">
          <p className="label-mono mb-2">Before you write</p>
          <ul className="text-cream/80 text-sm leading-relaxed space-y-2">
            <li>
              · If the door is down, send a screenshot or the event ID
              (URL after <code className="text-coral">/owner/events/</code>).
            </li>
            <li>· If a single guest&apos;s scan failed, include their phone or check_in_token.</li>
            <li>· For billing, include the email on your account.</li>
            <li>
              · For feature requests, include what venue / brand / role you&apos;re
              writing from. Helps prioritize.
            </li>
          </ul>
        </section>

        <section className="card text-center">
          <p className="label-mono mb-2">Looking for self-serve</p>
          <p className="text-cream/80 text-sm mb-4">
            The 8 most common door issues are answered on the help page.
          </p>
          <a
            href="/help"
            className="inline-flex items-center gap-2 bg-s2 border border-line text-cream font-sans font-semibold text-xs uppercase tracking-[0.16em] px-5 py-3 rounded-full hover:border-coral transition"
          >
            Read help →
          </a>
        </section>
      </PublicShell>
      <MarketingFooter />
    </>
  );
}
