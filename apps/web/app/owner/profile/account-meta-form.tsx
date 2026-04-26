"use client";

import { useState, useTransition } from "react";
import { saveAccountMetaAction } from "./actions";

export default function AccountMetaForm({
  initialHandle,
  initialCity,
}: {
  initialHandle: string | null;
  initialCity: string | null;
}) {
  const [handle, setHandle] = useState(initialHandle ?? "");
  const [city, setCity] = useState(initialCity ?? "");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await saveAccountMetaAction({
        handle: handle.trim().replace(/^@/, "") || null,
        city: city.trim() || null,
      });
      if (res.ok) {
        setMsg({ kind: "ok", text: "Saved." });
      } else {
        setMsg({ kind: "err", text: res.error ?? "Save failed." });
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label htmlFor="handle" className="label-mono block mb-2">
          Handle <span className="text-muted">(without @)</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-coral text-lg">@</span>
          <input
            id="handle"
            type="text"
            value={handle}
            onChange={(e) =>
              setHandle(e.target.value.replace(/^@/, "").replace(/\s/g, ""))
            }
            placeholder="mainframe"
            className="input-dark flex-1"
          />
        </div>
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
          placeholder="Miami"
          className="input-dark"
        />
      </div>
      <div className="flex items-center gap-3 mt-2">
        <button
          type="submit"
          className="bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.16em] px-5 py-3 rounded-full hover:brightness-110 transition disabled:opacity-50"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {msg && (
          <p
            className={`label-mono ${
              msg.kind === "ok" ? "text-mint" : "text-coral"
            }`}
          >
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}
