"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
        router.replace("/owner/dashboard");
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

    router.push("/owner/dashboard");
  }

  return (
    <main className="mobile-frame">
      <div className="pt-8">
        <p className="label-mono mb-3">03 / Venue</p>
        <h1 className="display-xl mb-2">Your<br/>room.</h1>
        <p className="text-muted text-sm mt-4">
          Basics for the first event. You can add more venues later.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-5">
        <div>
          <label htmlFor="name" className="label-mono block mb-2">
            Venue name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-dark"
            placeholder="Floyd Miami"
            required
          />
        </div>

        <div>
          <label htmlFor="address" className="label-mono block mb-2">
            Address
          </label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input-dark"
            placeholder="34 NE 11th St"
          />
        </div>

        <div>
          <label htmlFor="city" className="label-mono block mb-2">
            City
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="input-dark"
            placeholder="Miami"
          />
        </div>

        <div>
          <label htmlFor="timezone" className="label-mono block mb-2">
            Timezone
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="input-dark"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="capacity" className="label-mono block mb-2">
            Default capacity
          </label>
          <input
            id="capacity"
            type="number"
            inputMode="numeric"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="input-dark"
            placeholder="400"
          />
        </div>

        {error && <p className="text-coral text-sm">{error}</p>}

        <button type="submit" className="btn-primary mt-2" disabled={loading}>
          {loading ? "Saving…" : "Finish setup"}
        </button>
      </form>
    </main>
  );
}
