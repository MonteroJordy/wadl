"use client";

import { useState, useTransition } from "react";
import { joinWaitlistAction } from "./actions";

export default function WaitlistForm({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !phone.trim()) {
      return setError("Name + phone — both required.");
    }
    startTransition(async () => {
      const res = await joinWaitlistAction({
        token,
        name: name.trim(),
        phone: phone.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="card" style={{ padding: "var(--s-5)", textAlign: "center" }}>
        <span className="chip chip--accent">On the list</span>
        <p
          className="t-body-2"
          style={{ marginTop: "var(--s-3)", color: "var(--fg-2)" }}
        >
          We&apos;ll text you if a spot opens.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-3)",
      }}
    >
      <div>
        <label
          htmlFor="wl-name"
          className="t-meta"
          style={{ display: "block", marginBottom: "var(--s-1)" }}
        >
          Full name
        </label>
        <input
          id="wl-name"
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
          htmlFor="wl-phone"
          className="t-meta"
          style={{ display: "block", marginBottom: "var(--s-1)" }}
        >
          Mobile
        </label>
        <input
          id="wl-phone"
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
        className="btn btn--lg btn--accent btn--block"
        disabled={pending}
      >
        {pending ? "Joining…" : "Join waitlist"}
      </button>
    </form>
  );
}
