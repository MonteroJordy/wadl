"use client";

import { useState, useTransition } from "react";
import { submitGuestlessRsvpAction } from "./actions";

export default function GuestlessRsvpForm({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Your name.");
    if (!phone.trim()) return setError("Your phone — for your pass + door updates.");
    startTransition(async () => {
      const res = await submitGuestlessRsvpAction({
        token,
        name: name.trim(),
        phone: phone.trim(),
      });
      if (!res.ok) setError(res.error);
      // On success the action redirects to /g/{token}/pass?g=...
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        marginTop: "var(--s-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-3)",
      }}
    >
      <div>
        <label
          htmlFor="g-name"
          className="t-meta"
          style={{ display: "block", marginBottom: "var(--s-1)" }}
        >
          Full name
        </label>
        <input
          id="g-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className="input"
          required
        />
      </div>
      <div>
        <label
          htmlFor="g-phone"
          className="t-meta"
          style={{ display: "block", marginBottom: "var(--s-1)" }}
        >
          Mobile
        </label>
        <input
          id="g-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          inputMode="tel"
          placeholder="+1 305 555 0199"
          className="input"
          required
        />
      </div>
      {error && (
        <p className="t-body-2" style={{ color: "var(--err)" }} role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="btn btn--lg btn--block"
        disabled={pending}
      >
        {pending ? "Saving…" : "Get my pass →"}
      </button>
      <p
        className="t-meta"
        style={{ color: "var(--fg-3)", textAlign: "center" }}
      >
        By tapping continue you agree to receive door updates via SMS.
      </p>
    </form>
  );
}
