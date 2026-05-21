import { requireOwnerContext } from "@/lib/owner";
import { SettingsShell } from "@/components/v5/settings-shell";

export const dynamic = "force-dynamic";

export default async function VenueSettingsPage() {
  const { supabase, account } = await requireOwnerContext();
  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, city, address, default_capacity")
    .eq("account_id", account.id)
    .order("created_at", { ascending: true });
  const venue = venues?.[0] ?? null;

  const fields: Array<[string, string | number | null]> = venue
    ? [
        ["Venue name", venue.name],
        ["Handle", `@${venue.name.toLowerCase().replace(/[^a-z0-9]+/g, ".").slice(0, 24)}`],
        ["City", venue.city ?? ""],
        ["Address", venue.address ?? ""],
        ["Default capacity", venue.default_capacity ?? 0],
      ]
    : [];

  return (
    <SettingsShell
      active="venue"
      eyebrow={`Venue · ${venue?.name ?? account.display_name}`}
      title="Settings"
      sub="Defaults all new events inherit."
    >
      <div className="t-h1" style={{ marginBottom: "var(--s-6)" }}>
        {venue?.name ?? account.display_name}
      </div>
      {fields.length === 0 ? (
        <p className="t-body-2" style={{ color: "var(--fg-3)" }}>
          No venue yet. Add one from <a href="/venuesetup" style={{ color: "var(--fg)" }}>Venue setup</a>.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "var(--s-5)",
            maxWidth: 720,
          }}
        >
          {fields.map(([label, val]) => (
            <div key={label}>
              <div className="t-meta">{label}</div>
              <input
                className="input"
                defaultValue={String(val ?? "")}
                style={{ marginTop: "var(--s-2)" }}
                readOnly
              />
            </div>
          ))}
        </div>
      )}
      <p className="t-meta" style={{ marginTop: "var(--s-8)", color: "var(--fg-3)" }}>
        Edit lives on the per-venue page · see Events.
      </p>
    </SettingsShell>
  );
}
