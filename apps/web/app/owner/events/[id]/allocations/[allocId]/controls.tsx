"use client";

import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/confirm-dialog";
import {
  updateAllocationAction,
  regenerateTokenAction,
} from "./actions";

interface Props {
  eventId: string;
  allocId: string;
  initial: {
    cap: number;
    auto_approve: boolean;
    list_open: boolean;
    plus_ones_allowed: boolean;
  };
  holderUrl: string;
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--s-3)",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, accentColor: "var(--fg)" }}
      />
      <span className="t-body" style={{ fontWeight: 500 }}>
        {label}
      </span>
    </label>
  );
}

export default function AllocationControls({
  eventId,
  allocId,
  initial,
  holderUrl,
}: Props) {
  const [cap, setCap] = useState(String(initial.cap));
  const [autoApprove, setAutoApprove] = useState(initial.auto_approve);
  const [listOpen, setListOpen] = useState(initial.list_open);
  const [plusOnes, setPlusOnes] = useState(initial.plus_ones_allowed);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);

    const capNum = parseInt(cap, 10);
    if (!capNum || capNum < 1) return setError("Cap must be at least 1.");

    startTransition(async () => {
      const res = await updateAllocationAction(eventId, allocId, {
        cap: capNum,
        auto_approve: autoApprove,
        list_open: listOpen,
        plus_ones_allowed: plusOnes,
      });
      if (res?.error) setError(res.error);
      else setSaved("Saved.");
    });
  }

  function onRegenerate() {
    setRegenerateOpen(true);
  }

  function doRegenerate() {
    startTransition(async () => {
      const res = await regenerateTokenAction(eventId, allocId);
      if (res?.error) setError(res.error);
      else setSaved("Link rotated.");
      setRegenerateOpen(false);
    });
  }

  function onCopy() {
    navigator.clipboard.writeText(holderUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <section className="card" style={{ padding: "var(--s-5)" }}>
        <div className="t-meta" style={{ marginBottom: "var(--s-2)" }}>
          Magic link
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s-2)",
          }}
        >
          <input
            value={holderUrl}
            readOnly
            className="input"
            style={{ fontSize: "var(--ts-sm)", fontFamily: "var(--mono)" }}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCopy}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="t-meta"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--fg)",
            padding: 0,
            marginTop: "var(--s-3)",
          }}
        >
          Rotate link →
        </button>
      </section>

      <form
        onSubmit={onSave}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-5)",
          marginTop: "var(--s-5)",
        }}
      >
        <div>
          <label
            htmlFor="cap"
            className="t-meta"
            style={{ display: "block", marginBottom: "var(--s-2)" }}
          >
            Cap
          </label>
          <input
            id="cap"
            type="number"
            min={1}
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            className="input"
          />
        </div>

        <CheckboxRow
          label="Auto-approve"
          checked={autoApprove}
          onChange={setAutoApprove}
        />
        <CheckboxRow
          label="List open"
          checked={listOpen}
          onChange={setListOpen}
        />
        <CheckboxRow
          label="Allow +1s"
          checked={plusOnes}
          onChange={setPlusOnes}
        />

        {error && (
          <p className="t-body-2" style={{ color: "var(--err)" }}>
            {error}
          </p>
        )}
        {saved && (
          <p className="t-body-2" style={{ color: "var(--ok)" }}>
            {saved}
          </p>
        )}

        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
      <ConfirmDialog
        open={regenerateOpen}
        title="Rotate the magic link?"
        body="The current link stops working immediately. Anyone who already opened it stays signed in, but new visitors will get a 404 until you send the new link."
        confirmLabel="Rotate link"
        danger
        pending={pending}
        onConfirm={doRegenerate}
        onCancel={() => setRegenerateOpen(false)}
      />
    </>
  );
}
