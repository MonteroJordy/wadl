"use client";

import { useState, useTransition } from "react";
import SaveIndicator, { type SaveState } from "@/components/save-indicator";
import { saveAccountMetaAction } from "./actions";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

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
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    setErrorMsg("");
    startTransition(async () => {
      const res = await saveAccountMetaAction({
        handle: handle.trim().replace(/^@/, "") || null,
        city: city.trim() || null,
      });
      if (res.ok) {
        setSaveState("saved");
      } else {
        setErrorMsg(res.error ?? "Save failed.");
        setSaveState("error");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div>
        <label
          htmlFor="handle"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          HANDLE{" "}
          <span style={{ color: "var(--w-fg-muted)" }}>(WITHOUT @)</span>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--w-mono)",
              color: "var(--w-acc)",
              fontSize: 18,
            }}
          >
            @
          </span>
          <input
            id="handle"
            type="text"
            value={handle}
            onChange={(e) => {
              setHandle(
                e.target.value.replace(/^@/, "").replace(/\s/g, ""),
              );
              if (saveState !== "idle") setSaveState("idle");
            }}
            placeholder="mainframe"
            autoComplete="off"
            style={{ ...INPUT_STYLE, flex: 1 }}
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="city"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          CITY
        </label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            if (saveState !== "idle") setSaveState("idle");
          }}
          placeholder="Miami"
          autoComplete="address-level2"
          style={INPUT_STYLE}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 4,
        }}
      >
        <button
          type="submit"
          className="btn"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <SaveIndicator
          state={saveState}
          errorMessage={errorMsg}
          onAutoHide={() => setSaveState("idle")}
        />
      </div>
    </form>
  );
}
