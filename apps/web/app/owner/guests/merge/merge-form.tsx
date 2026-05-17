"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/confirm-dialog";
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
  const [open, setOpen] = useState(false);

  function set<K extends keyof MergeChoices>(k: K, v: MergeChoices[K]) {
    setChoices((c) => ({ ...c, [k]: v }));
  }

  function submit() {
    setOpen(true);
  }

  function doMerge() {
    startTransition(async () => {
      const res = await mergeGuestsAction(a.id, b.id, choices);
      if (res.ok) router.replace(`/owner/flags`);
      else setErr(res.error);
      setOpen(false);
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
    const optStyle = (active: boolean): React.CSSProperties => ({
      textAlign: "left",
      padding: 10,
      border: `1px solid ${active ? "var(--w-acc)" : "var(--w-line)"}`,
      background: active ? "var(--w-acc-soft)" : "var(--w-surface-1)",
      cursor: "pointer",
      color: "inherit",
    });
    return (
      <div className="w-card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="w-type-meta" style={{ marginBottom: 8 }}>
          {label.toUpperCase()}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => set(field, "a" as MergeChoices[K])}
            style={optStyle(choices[field] === "a")}
          >
            <p
              style={{
                color: "var(--w-fg)",
                fontSize: 14,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {aVal || <span style={{ color: "var(--w-fg-muted)" }}>—</span>}
            </p>
            <div className="w-type-meta" style={{ marginTop: 4 }}>
              A
            </div>
          </button>
          <button
            type="button"
            onClick={() => set(field, "b" as MergeChoices[K])}
            style={optStyle(choices[field] === "b")}
          >
            <p
              style={{
                color: "var(--w-fg)",
                fontSize: 14,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {bVal || <span style={{ color: "var(--w-fg-muted)" }}>—</span>}
            </p>
            <div className="w-type-meta" style={{ marginTop: 4 }}>
              B
            </div>
          </button>
          {allowConcat && (
            <button
              type="button"
              onClick={() => set(field, "concat" as MergeChoices[K])}
              style={{
                ...optStyle(choices[field] === "concat"),
                gridColumn: "1 / -1",
              }}
            >
              <div className="w-type-meta">COMBINE BOTH</div>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {[a, b].map((g, i) => (
          <div key={g.id} className="w-card" style={{ padding: 14 }}>
            <div className="w-type-meta" style={{ marginBottom: 4 }}>
              {i === 0 ? "A" : "B"}
            </div>
            <p
              style={{
                color: "var(--w-fg)",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {g.full_name}
            </p>
            <div className="w-type-meta" style={{ marginTop: 4 }}>
              {g.event_name.toUpperCase()} · {g.night_date.toUpperCase()}
            </div>
            <div className="w-type-meta" style={{ marginTop: 4 }}>
              {g.status.toUpperCase()} · {g.check_ins} SCAN
              {g.check_ins === 1 ? "" : "S"}
            </div>
            {g.tags.length > 0 && (
              <div
                className="w-type-meta"
                style={{ marginTop: 8, color: "var(--w-fg)" }}
              >
                {g.tags.join(" · ").toUpperCase()}
              </div>
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

      {err && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)", marginBottom: 12 }}
        >
          {err}
        </p>
      )}

      <button
        type="button"
        className="btn"
        onClick={submit}
        disabled={pending}
      >
        {pending ? "Merging…" : "Merge"}
      </button>
      <ConfirmDialog
        open={open}
        title="Merge these two guests?"
        body="The older record wins. The other becomes a soft-deleted reference — its scan history stays in the audit log, but the duplicate row stops showing in lists."
        confirmLabel="Merge"
        pending={pending}
        onConfirm={doMerge}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
