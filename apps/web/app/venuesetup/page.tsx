"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/v5";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export default function VenueSetupPage() {
  const router = useRouter();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id, accounts(account_type)")
        .eq("id", user.id)
        .maybeSingle<{
          account_id: string | null;
          accounts: { account_type: string } | null;
        }>();

      if (!profile?.account_id) {
        router.replace("/entitysetup");
        return;
      }
      if (profile.accounts?.account_type !== "venue") {
        router.replace("/");
        return;
      }
      setAccountId(profile.account_id);
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accountId) return;
    if (!name.trim()) return setError("Enter a venue name.");

    setLoading(true);
    const supabase = createClient();

    const cap = capacity.trim() ? parseInt(capacity.trim(), 10) : null;
    if (cap !== null && (Number.isNaN(cap) || cap < 1)) {
      setLoading(false);
      setError("Capacity must be a positive number.");
      return;
    }

    const { error: venueErr } = await supabase.from("venues").insert({
      account_id: accountId,
      name: name.trim(),
      address: address.trim() || null,
      city: city.trim() || null,
      timezone,
      default_capacity: cap,
    });

    setLoading(false);
    if (venueErr) {
      setError(venueErr.message);
      return;
    }

    router.push("/welcome");
  }

  return (
    <main id="main-content">
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          maxWidth: 960,
          marginInline: "auto",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          paddingBottom: 48,
        }}
      >
        <div style={{ padding: "20px 24px 0" }}>
          <Logo size={20} />
        </div>

        <div style={{ padding: "48px 24px 0" }}>
          <div className="w-type-meta">03 / VENUE</div>
          <div
            className="w-type-display-lg"
            style={{ marginTop: 12, lineHeight: 0.94 }}
          >
            Your
            <br />
            room.
          </div>
          <p
            className="w-type-body"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 16,
              maxWidth: 320,
            }}
          >
            Basics for the first event. You can add more venues later.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          style={{
            padding: "32px 24px 0",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <label htmlFor="name" className="w-label">
              VENUE NAME
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-input"
              placeholder="Floyd Miami"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="address" className="w-label">
              ADDRESS
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-input"
              placeholder="34 NE 11th St"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <label htmlFor="city" className="w-label">
                CITY
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-input"
                placeholder="Miami"
              />
            </div>
            <div>
              <label htmlFor="capacity" className="w-label">
                CAPACITY
              </label>
              <input
                id="capacity"
                type="number"
                inputMode="numeric"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-input"
                placeholder="400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="timezone" className="w-label">
              TIMEZONE
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-input"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-err)" }}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn--lg btn--accent btn--block"
            disabled={loading}
          >
            {loading ? "Saving…" : "Finish setup →"}
          </button>
        </form>

        <div
          className="w-type-meta"
          style={{
            marginTop: "auto",
            paddingTop: 32,
            paddingBottom: 16,
            textAlign: "center",
            color: "var(--w-fg-dim)",
          }}
        >
          STEP 03 · 03
        </div>
      </div>
    </main>
  );
}
