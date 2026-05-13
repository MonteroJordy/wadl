"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
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

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

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
        gap: 12,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 20, height: 20, accentColor: "var(--w-acc)" }}
      />
      <span
        style={{
          color: "var(--w-fg)",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
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
      <section
        className="w-card"
        style={{ padding: 16, marginBottom: 20 }}
      >
        <div className="w-type-meta" style={{ marginBottom: 8 }}>
          MAGIC LINK
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={holderUrl}
            readOnly
            style={{
              ...INPUT_STYLE,
              fontSize: 12,
              fontFamily: "var(--w-mono)",
            }}
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            variant="ghost"
            type="button"
            onClick={onCopy}
            style={{ padding: "0 18px" }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="w-type-meta"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--w-acc)",
            padding: 0,
            marginTop: 12,
          }}
        >
          ROTATE LINK →
        </button>
      </section>

      <form
        onSubmit={onSave}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <div>
          <label
            htmlFor="cap"
            className="w-type-meta"
            style={{ display: "block", marginBottom: 6 }}
          >
            CAP
          </label>
          <input
            id="cap"
            type="number"
            min={1}
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            style={INPUT_STYLE}
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
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-err)" }}
          >
            {error}
          </p>
        )}
        {saved && (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-ok)" }}
          >
            {saved}
          </p>
        )}

        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
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
