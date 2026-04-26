import Link from "next/link";
import { isDemoMode } from "@/lib/demo-mode";
import { enableDemoModeAction, disableDemoModeAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demo mode — WADL" };

export default function DemoModePage() {
  const on = isDemoMode();

  return (
    <main
      id="main-content"
      className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12"
    >
      <header className="mb-6">
        <p className="label-mono mb-1">Sales tool</p>
        <h1 className="display-lg leading-[0.95] mb-3">Demo mode</h1>
        <p className="text-muted text-sm leading-relaxed">
          Pin a coral banner across the top of every screen so anyone watching
          knows the data on screen is sample data. Useful for screenshots,
          pitches, and walking a venue manager through the product without
          firing real SMS.
        </p>
      </header>

      <section className="card mb-4">
        <p className="label-mono mb-2">Status</p>
        <p className="font-display text-3xl leading-none mb-4">
          <span className={on ? "text-coral" : "text-muted"}>
            {on ? "ON" : "OFF"}
          </span>
        </p>
        {on ? (
          <form action={disableDemoModeAction}>
            <button type="submit" className="btn-ghost">
              Turn demo mode off
            </button>
          </form>
        ) : (
          <form action={enableDemoModeAction}>
            <button type="submit" className="btn-primary">
              Turn demo mode on
            </button>
          </form>
        )}
        <p className="label-mono mt-3">
          Cookie-scoped to this browser. Doesn&apos;t modify your data.
        </p>
      </section>

      <section className="card mb-4">
        <p className="label-mono mb-2">Sample dataset</p>
        <p className="text-cream/80 text-sm mb-3">
          Already an owner? Load 4 events + 12 promoters + ~200 guests into your
          account from the welcome wizard. Great for pitches.
        </p>
        <Link href="/welcome" className="btn-ghost inline-block">
          Open welcome wizard
        </Link>
      </section>

      <section className="card">
        <p className="label-mono mb-2">What&apos;s muted in demo mode</p>
        <ul className="text-muted text-sm space-y-1 list-disc list-inside">
          <li>SMS sends still fire — toggle DEV_MODE=true in env to silence</li>
          <li>Push notifications still fire</li>
          <li>Stripe writes still fire</li>
        </ul>
        <p className="label-mono mt-3 text-coral">
          Demo mode is a visual indicator only — handle live integrations from env.
        </p>
      </section>
    </main>
  );
}
