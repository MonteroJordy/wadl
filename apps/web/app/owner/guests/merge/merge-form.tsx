"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mergeGuestsAction, type MergeChoices } from "./actions";

interface SidePayload {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tags: string[];
  event_name: string;
  night_date: string;
  status: string;
  check_ins: number;
  created_at: string;
}

export default function MergeForm({
  a,
  b,
}: {
  a: SidePayload;
  b: SidePayload;
}) {
  const router = useRouter();
  const [choices, setChoices] = useState<MergeChoices>({
    full_name: "a",
    phone: a.phone ? "a" : b.phone ? "b" : "a",
    email: a.email ? "a" : b.email ? "b" : "a",
    notes: a.notes && b.notes ? "concat" : a.notes ? "a" : "b",
  });
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof MergeChoices>(k: K, v: MergeChoices[K]) {
    setChoices((c) => ({ ...c, [k]: v }));
  }

  function submit() {
    if (
      !confirm(
        "Merge these two guests? The older record wins. The other becomes a soft-deleted reference."
      )
    )
      return;
    startTransition(async () => {
      const res = await mergeGuestsAction(a.id, b.id, choices);
      if (res.ok) router.replace(`/owner/flags`);
      else setErr(res.error);
    });
  }

  function Picker<K extends keyof MergeChoices>({
    label,
    field,
    aVal,
    bVal,
    allowConcat,
  }: {
    label: string;
    field: K;
    aVal: string | null;
    bVal: string | null;
    allowConcat?: boolean;
  }) {
    return (
      <div className="card mb-3">
        <p className="label-mono mb-2">{label}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set(field, "a" as MergeChoices[K])}
            className={`text-left p-2 rounded border ${
              choices[field] === "a" ? "border-coral bg-s2" : "border-line"
            }`}
          >
            <p className="font-sans text-sm text-cream truncate">
              {aVal || <span className="text-muted">—</span>}
            </p>
            <p className="label-mono mt-1">A</p>
          </button>
          <button
            type="button"
            onClick={() => set(field, "b" as MergeChoices[K])}
            className={`text-left p-2 rounded border ${
              choices[field] === "b" ? "border-coral bg-s2" : "border-line"
            }`}
          >
            <p className="font-sans text-sm text-cream truncate">
              {bVal || <span className="text-muted">—</span>}
            </p>
            <p className="label-mono mt-1">B</p>
          </button>
          {allowConcat && (
            <button
              type="button"
              onClick={() => set(field, "concat" as MergeChoices[K])}
              className={`col-span-2 p-2 rounded border ${
                choices[field] === "concat"
                  ? "border-coral bg-s2"
                  : "border-line"
              }`}
            >
              <p className="label-mono">Combine both</p>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[a, b].map((g, i) => (
          <div
            key={g.id}
            className="card border-line"
          >
            <p className="label-mono mb-1">{i === 0 ? "A" : "B"}</p>
            <p className="font-sans text-cream font-semibold truncate">
              {g.full_name}
            </p>
            <p className="label-mono mt-1">
              {g.event_name} · {g.night_date}
            </p>
            <p className="label-mono mt-1">
              {g.status} · {g.check_ins} scan{g.check_ins === 1 ? "" : "s"}
            </p>
            {g.tags.length > 0 && (
              <p className="label-mono mt-2 text-cream">
                {g.tags.join(" · ")}
              </p>
            )}
          </div>
        ))}
      </div>

      <Picker
        label="Name"
        field="full_name"
        aVal={a.full_name}
        bVal={b.full_name}
      />
      <Picker label="Phone" field="phone" aVal={a.phone} bVal={b.phone} />
      <Picker label="Email" field="email" aVal={a.email} bVal={b.email} />
      <Picker
        label="Notes"
        field="notes"
        aVal={a.notes}
        bVal={b.notes}
        allowConcat
      />

      {err && <p className="text-coral text-sm mb-3">{err}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="btn-primary"
      >
        {pending ? "Merging…" : "Merge"}
      </button>
    </div>
  );
}
