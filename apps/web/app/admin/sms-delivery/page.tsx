import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "SMS delivery — WADL" };

const PLATFORM_OWNER_EMAIL = "jmontero@mainframeagency.com";

interface Row {
  id: string;
  to_phone: string;
  body: string;
  template_key: string | null;
  provider: string;
  provider_sid: string | null;
  status: string;
  twilio_status: string | null;
  twilio_error_code: string | null;
  status_updated_at: string | null;
  error: string | null;
  segments: number | null;
  cost_estimate_usd: number | null;
  created_at: string;
  account: { display_name: string | null } | null;
  event: { name: string | null } | null;
  guest: { full_name: string | null } | null;
}

const STATUS_TONE: Record<string, string> = {
  delivered: "text-mint",
  sent: "text-mint",
  queued: "text-muted",
  sending: "text-muted",
  accepted: "text-muted",
  failed: "text-coral",
  undelivered: "text-coral",
  opted_out: "text-coral",
  config_error: "text-coral",
};

function effective(r: Row): string {
  return r.twilio_status ?? r.status;
}

export default async function AdminSmsDeliveryPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const { profile } = await requireOwnerContext();
  if (profile.email !== PLATFORM_OWNER_EMAIL) redirect("/owner");

  const status = (searchParams.status ?? "").trim();
  const q = (searchParams.q ?? "").trim();
  const admin = createAdminClient();

  let query = admin
    .from("sms_log")
    .select(
      "id, to_phone, body, template_key, provider, provider_sid, status, twilio_status, twilio_error_code, status_updated_at, error, segments, cost_estimate_usd, created_at, account:accounts(display_name), event:events(name), guest:guests(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) {
    if (["delivered", "failed", "undelivered"].includes(status)) {
      query = query.or(`status.eq.${status},twilio_status.eq.${status}`);
    } else {
      query = query.eq("status", status);
    }
  }
  if (q) query = query.ilike("to_phone", `%${q}%`);

  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];

  const totals = {
    all: rows.length,
    delivered: rows.filter((r) => effective(r) === "delivered").length,
    failed: rows.filter((r) =>
      ["failed", "undelivered"].includes(effective(r))
    ).length,
    cost: rows.reduce((s, r) => s + (r.cost_estimate_usd ?? 0), 0),
  };

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 md:px-8 pt-6 pb-16"
    >
      <header className="mb-6">
        <Link
          href="/admin"
          className="label-mono hover:text-cream transition mb-2 inline-block"
        >
          ← Admin
        </Link>
        <h1 className="font-display text-4xl md:text-5xl text-cream uppercase tracking-wide leading-[0.9]">
          SMS delivery
        </h1>
        <p className="label-mono mt-2">
          Last 200 outbound messages across the platform · {totals.delivered} delivered ·{" "}
          {totals.failed} failed · ${totals.cost.toFixed(2)} estimated cost
        </p>
      </header>

      <form action="/admin/sms-delivery" method="get" className="mb-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Filter by phone…"
          className="w-full bg-s2 border border-line text-cream px-4 py-2.5 rounded-md font-sans text-sm placeholder:text-muted focus:border-coral focus:outline-none transition-colors"
        />
        {status && <input type="hidden" name="status" value={status} />}
      </form>

      <div className="flex flex-wrap gap-1 mb-6">
        {[
          "",
          "delivered",
          "sent",
          "queued",
          "failed",
          "undelivered",
          "opted_out",
        ].map((s) => {
          const active = status === s;
          const sp = new URLSearchParams();
          if (s) sp.set("status", s);
          if (q) sp.set("q", q);
          const href = `/admin/sms-delivery${sp.toString() ? `?${sp}` : ""}`;
          return (
            <Link
              key={s || "all"}
              href={href}
              className={`shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-wider transition ${
                active
                  ? "border-coral bg-coral/10 text-cream"
                  : "border-line bg-s1 text-muted hover:text-cream"
              }`}
            >
              {s.replace("_", " ") || "all"}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No outbound SMS"
          body="When OTPs, RSVP confirmations, broadcasts, escalations, and tier upgrades go out, every send lands here with delivery status."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id} className="card">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <p className="font-mono text-cream">{r.to_phone}</p>
                <span
                  className={`label-mono ${
                    STATUS_TONE[effective(r)] ?? "text-muted"
                  }`}
                  title={
                    r.status_updated_at
                      ? `Updated ${new Date(r.status_updated_at).toLocaleString()}`
                      : undefined
                  }
                >
                  {effective(r).replace("_", " ")}
                  {r.twilio_error_code && ` · ${r.twilio_error_code}`}
                </span>
              </div>
              <p className="text-cream/80 text-sm leading-relaxed mb-2 line-clamp-2">
                {r.body}
              </p>
              <p className="label-mono">
                {new Date(r.created_at).toLocaleString()} · {r.provider}
                {r.template_key ? ` · ${r.template_key}` : ""} ·{" "}
                {r.segments ?? 1} seg · ${(r.cost_estimate_usd ?? 0).toFixed(4)}
              </p>
              <p className="label-mono mt-1 truncate">
                {r.account?.display_name ?? "—"}
                {r.event?.name && (
                  <>
                    {" · "}
                    <span className="text-cream">{r.event.name}</span>
                  </>
                )}
                {r.guest?.full_name && (
                  <>
                    {" · "}
                    <span className="text-cream">{r.guest.full_name}</span>
                  </>
                )}
                {r.provider_sid && <> · {r.provider_sid}</>}
              </p>
              {r.error && (
                <p className="label-mono mt-1 text-coral">{r.error}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
