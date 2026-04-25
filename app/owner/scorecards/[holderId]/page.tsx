import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { computeScorecards } from "@/lib/scorecards";

export const dynamic = "force-dynamic";

export default async function HolderDetailPage({
  params,
}: {
  params: { holderId: string };
}) {
  const { account } = await requireOwnerContext();
  const cards = await computeScorecards(account.id);
  const holderKey = decodeURIComponent(params.holderId);
  const card = cards.find((c) => c.key === holderKey);
  if (!card) notFound();

  const total =
    card.tier_mix.ga + card.tier_mix.vip + card.tier_mix.all_access;

  return (
    <main className="mx-auto max-w-frame md:max-w-2xl px-6 py-12">
      <header className="flex items-center justify-between pb-4">
        <Link
          href="/owner/scorecards"
          className="label-mono hover:text-cream transition"
        >
          ← Leaderboard
        </Link>
      </header>

      <p className="label-mono mb-1">Holder</p>
      <h1 className="display-lg leading-[0.95] mb-2">{card.display_name}</h1>
      <p className="label-mono mb-6">
        {card.events_played} event{card.events_played === 1 ? "" : "s"} ·{" "}
        Grade <span className="text-cream">{card.grade}</span>
      </p>

      <section className="card mb-4">
        <p className="label-mono mb-1">Show rate</p>
        <p className="font-display text-7xl leading-none text-coral">
          {Math.round(card.show_rate * 100)}%
        </p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="label-mono">Approved</p>
            <p className="font-display text-2xl text-cream">{card.approved}</p>
          </div>
          <div>
            <p className="label-mono">Scanned in</p>
            <p className="font-display text-2xl text-mint">{card.scanned}</p>
          </div>
        </div>
      </section>

      {total > 0 && (
        <section className="card mb-4">
          <p className="label-mono mb-3">Tier mix</p>
          <div className="flex flex-col gap-3">
            {(
              [
                { id: "ga", label: "GA", color: "muted" },
                { id: "vip", label: "VIP", color: "gold" },
                { id: "all_access", label: "All access", color: "lav" },
              ] as const
            ).map((t) => {
              const v = card.tier_mix[t.id];
              const pct = total === 0 ? 0 : (v / total) * 100;
              const colorClass =
                t.color === "gold"
                  ? "bg-gold"
                  : t.color === "lav"
                  ? "bg-lav"
                  : "bg-muted";
              return (
                <div key={t.id}>
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="font-sans text-cream">{t.label}</p>
                    <p className="label-mono">{v}</p>
                  </div>
                  <div className="h-1.5 bg-s3 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colorClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {card.trend && (
        <section className="card">
          <p className="label-mono mb-1">Trend</p>
          <p className="font-display text-3xl leading-none">
            {card.trend === "up" && (
              <span className="text-mint">↑ Improving</span>
            )}
            {card.trend === "down" && (
              <span className="text-coral">↓ Slipping</span>
            )}
            {card.trend === "flat" && (
              <span className="text-muted">→ Steady</span>
            )}
          </p>
          <p className="label-mono mt-2">vs. their previous event</p>
        </section>
      )}
    </main>
  );
}
