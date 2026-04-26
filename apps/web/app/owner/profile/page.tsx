import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";
import { getVapidPublicKey } from "@/lib/push";
import PushSubscribeButton from "@/components/push-subscribe";
import EmptyState from "@/components/empty-state";
import AccountMetaForm from "./account-meta-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user, profile, account } = await requireOwnerContext();
  const admin = createAdminClient();

  const [venuesRes, staffRes] = await Promise.all([
    admin
      .from("venues")
      .select("id, name, city, default_capacity, created_at")
      .eq("account_id", account.id)
      .order("created_at", { ascending: true }),
    admin
      .from("event_staff")
      .select(
        "user_id, role, event:events!inner(id, name, account_id), profile:profiles!inner(full_name, phone)"
      )
      .eq("event.account_id", account.id),
  ]);

  const venues = venuesRes.data ?? [];
  const staff = (staffRes.data ?? []) as unknown as Array<{
    user_id: string;
    role: string;
    event: { id: string; name: string };
    profile: { full_name: string | null; phone: string | null };
  }>;

  // Dedupe staff by user — same person may help on multiple events.
  const teamMap = new Map<string, {
    user_id: string;
    name: string;
    phone: string | null;
    role: string;
    events: string[];
  }>();
  for (const s of staff) {
    const existing = teamMap.get(s.user_id);
    if (existing) {
      existing.events.push(s.event.name);
    } else {
      teamMap.set(s.user_id, {
        user_id: s.user_id,
        name: s.profile.full_name ?? "Unnamed",
        phone: s.profile.phone,
        role: s.role,
        events: [s.event.name],
      });
    }
  }
  const team = [...teamMap.values()];

  const accountTypeLabel = account.account_type === "venue" ? "Venue" : account.account_type === "brand" ? "Brand" : "Individual";

  return (
    <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 py-8 md:py-12">
      <header className="pb-6">
        <p className="label-mono mb-1">Profile</p>
        <h1 className="display-lg leading-[0.95]">{profile.full_name ?? "Owner"}</h1>
        <p className="label-mono mt-2">{profile.phone}</p>
      </header>

      <section className="card mb-4">
        <p className="label-mono mb-2">Account</p>
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-sans text-cream font-semibold text-lg truncate">
            {account.display_name}
          </p>
          <span className={`label-mono px-2 py-1 rounded-full border ${
            account.account_type === "venue"
              ? "text-coral border-coral/40"
              : account.account_type === "brand"
              ? "text-gold border-gold/40"
              : "text-mint border-mint/40"
          }`}>
            {accountTypeLabel}
          </span>
        </div>
        {profile.email && (
          <p className="label-mono mt-2 truncate">
            <span className="text-muted">Email</span>{" "}
            <span className="text-cream">{profile.email}</span>
          </p>
        )}
        {(account.handle || account.city) && (
          <p className="label-mono mt-2 truncate">
            {account.handle && (
              <>
                <span className="text-muted">@</span>
                <span className="text-cream">{account.handle}</span>
              </>
            )}
            {account.handle && account.city && " · "}
            {account.city && (
              <>
                <span className="text-muted">in</span>{" "}
                <span className="text-cream">{account.city}</span>
              </>
            )}
          </p>
        )}
      </section>

      <section className="card mb-4">
        <p className="label-mono mb-3">Edit handle + city</p>
        <AccountMetaForm
          initialHandle={account.handle ?? null}
          initialCity={account.city ?? null}
        />
      </section>

      <section className="card mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <p className="label-mono">Venues</p>
          <Link
            href="/venuesetup"
            className="label-mono text-coral hover:brightness-125"
          >
            + Add
          </Link>
        </div>
        {venues.length === 0 ? (
          <p className="text-muted text-sm">
            No venue yet — add one to start scheduling events.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {venues.map((v) => (
              <li key={v.id} className="flex items-baseline justify-between">
                <div>
                  <p className="font-sans text-cream">{v.name}</p>
                  <p className="label-mono">
                    {v.city || "—"}
                    {v.default_capacity && ` · cap ${v.default_capacity}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mb-4">
        <p className="label-mono mb-2">Team — door staff &amp; managers</p>
        {team.length === 0 ? (
          <p className="text-muted text-sm">
            No staff invited yet. Add staff per-event from any event&apos;s Staff page.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {team.map((m) => (
              <li key={m.user_id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-cream truncate">{m.name}</p>
                  <p className="label-mono truncate">
                    {m.phone ?? "no phone"} ·{" "}
                    <span className={m.role === "door_manager" ? "text-gold" : "text-mint"}>
                      {m.role === "door_manager" ? "Manager" : "Staff"}
                    </span>
                  </p>
                </div>
                <p className="label-mono text-right shrink-0 max-w-[40%] truncate">
                  {m.events.length === 1
                    ? m.events[0]
                    : `${m.events.length} events`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-4">
        <PushSubscribeButton vapidPublicKey={getVapidPublicKey()} />
      </section>

      <section className="card mb-4">
        <p className="label-mono mb-2">Share with venues</p>
        <p className="text-muted text-sm mb-2">
          Send this link to anyone you want to invite to the platform:
        </p>
        <input
          readOnly
          value={getAppUrl()}
          onFocus={(e) => e.currentTarget.select()}
          className="input-dark text-xs font-mono"
        />
      </section>

      <section className="card border-coral/40 mb-4">
        <p className="label-mono text-coral mb-2">Danger zone</p>
        <p className="text-muted text-sm mb-3">
          Deleting your account is permanent and removes all events, allocations, and guest data.
          Contact <a href="mailto:jmontero@mainframeagency.com" className="text-cream underline">support</a> to request deletion.
        </p>
        <button
          type="button"
          disabled
          className="btn-ghost border-coral/60 text-coral disabled:opacity-50"
          title="Stub — contact support"
        >
          Delete account (request)
        </button>
      </section>

      <form action="/api/auth/signout" method="post">
        <button type="submit" className="btn-ghost">
          Sign out
        </button>
      </form>

      {!profile.full_name && (
        <div className="mt-4">
          <EmptyState
            title="Profile incomplete"
            body="Finish onboarding to unlock the rest of the dashboard."
            action={
              <Link href="/signup" className="btn-primary inline-block">
                Complete signup
              </Link>
            }
          />
        </div>
      )}
    </main>
  );
}
