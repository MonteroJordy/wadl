"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseCsv, toE164 } from "@/lib/csv";
import { commitImportAction, type ImportRow } from "./actions";

interface NightOpt {
  id: string;
  label: string;
}
interface AllocOpt {
  id: string;
  night_id: string;
  label: string;
}

interface PreviewRow extends ImportRow {
  phone_raw: string;
  phone_valid: boolean;
}

const TIER_VALUES = new Set(["ga", "vip", "all_access"]);

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

const PILL = (active: boolean): React.CSSProperties => ({
  padding: 12,
  border: `1px solid ${active ? "var(--w-acc)" : "var(--w-line)"}`,
  background: active ? "var(--w-acc-soft)" : "var(--w-surface-1)",
  color: active ? "var(--w-acc-ink)" : "var(--w-fg-muted)",
  fontFamily: "var(--w-mono)",
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
});

export default function CsvImportForm({
  eventId,
  nights,
  allocations,
}: {
  eventId: string;
  nights: NightOpt[];
  allocations: AllocOpt[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [headerMap, setHeaderMap] = useState<{
    name: number;
    phone: number;
    email: number;
    plus_ones: number;
    tier: number;
  } | null>(null);
  const [nightId, setNightId] = useState(nights[0]?.id ?? "");
  const [allocationId, setAllocationId] = useState<string>("");
  const [status, setStatus] = useState<"approved" | "pending">("approved");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{
    inserted: number;
    skipped_dupe_phone: number;
    skipped_invalid_phone: number;
    skipped_missing_name: number;
  } | null>(null);

  const filteredAllocs = allocations.filter((a) => a.night_id === nightId);

  function detectColumn(header: string[], names: string[]): number {
    const lower = header.map((h) => h.toLowerCase().trim());
    for (const n of names) {
      const idx = lower.indexOf(n);
      if (idx >= 0) return idx;
    }
    return -1;
  }

  function onPreview(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setDone(null);
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setErr("Need a header row and at least one data row.");
      return;
    }
    const header = rows[0];
    const map = {
      name: detectColumn(header, ["name", "full_name", "fullname"]),
      phone: detectColumn(header, ["phone", "mobile", "cell"]),
      email: detectColumn(header, ["email"]),
      plus_ones: detectColumn(header, ["plus_ones", "+1", "plus1", "plus_one"]),
      tier: detectColumn(header, ["tier", "type"]),
    };
    if (map.name < 0) {
      setErr("Could not find a 'name' or 'full_name' column in the header.");
      return;
    }
    setHeaderMap(map);
    const data = rows.slice(1);
    const out: PreviewRow[] = data.map((r) => {
      const rawPhone = map.phone >= 0 ? (r[map.phone] ?? "").trim() : "";
      const norm = rawPhone ? toE164(rawPhone) : null;
      const tierRaw =
        map.tier >= 0 ? (r[map.tier] ?? "").toLowerCase().trim() : "ga";
      const tier = (
        tierRaw === "vip"
          ? "vip"
          : tierRaw === "aa" || tierRaw === "all" || tierRaw === "all_access"
            ? "all_access"
            : "ga"
      ) as ImportRow["tier"];
      return {
        full_name: r[map.name] ?? "",
        phone: norm,
        phone_raw: rawPhone,
        phone_valid: rawPhone === "" || !!norm,
        email: map.email >= 0 ? (r[map.email] ?? null) : null,
        plus_ones:
          map.plus_ones >= 0 ? parseInt(r[map.plus_ones] ?? "0", 10) || 0 : 0,
        tier,
      };
    });
    setPreview(out);
  }

  function onCommit() {
    if (!preview || !headerMap || !nightId) return;
    setErr(null);
    startTransition(async () => {
      const rows: ImportRow[] = preview.map((p) => ({
        full_name: p.full_name,
        phone: p.phone,
        email: p.email,
        plus_ones: p.plus_ones,
        tier: p.tier,
      }));
      const res = await commitImportAction(
        eventId,
        nightId,
        allocationId || null,
        status,
        rows,
      );
      if (res.ok) {
        setDone(res.result);
        setPreview(null);
        setText("");
        setTimeout(() => router.refresh(), 1500);
      } else setErr(res.error);
    });
  }

  if (done) {
    return (
      <div
        className="w-card"
        style={{ padding: 16, borderColor: "var(--w-ok)" }}
      >
        <div
          className="w-type-meta"
          style={{ color: "var(--w-ok)", marginBottom: 8 }}
        >
          DONE
        </div>
        <p style={{ color: "var(--w-fg)" }}>
          Inserted {done.inserted}. Skipped: {done.skipped_dupe_phone} dupe
          phones, {done.skipped_invalid_phone} invalid phones,{" "}
          {done.skipped_missing_name} no name.
        </p>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setDone(null)}
          style={{ marginTop: 12 }}
        >
          Import more
        </button>
      </div>
    );
  }

  if (preview) {
    const validCount = preview.length;
    return (
      <div>
        <div
          className="w-card"
          style={{ padding: 18, marginBottom: 12 }}
        >
          <div className="w-type-meta" style={{ marginBottom: 8 }}>
            PREVIEW · {validCount} ROWS
          </div>
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <div className="w-type-meta">NIGHT</div>
            <select
              value={nightId}
              onChange={(e) => {
                setNightId(e.target.value);
                setAllocationId("");
              }}
              style={INPUT_STYLE}
            >
              {nights.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
            <div className="w-type-meta">ALLOCATION</div>
            <select
              value={allocationId}
              onChange={(e) => setAllocationId(e.target.value)}
              style={INPUT_STYLE}
            >
              <option value="">— Direct (no allocation) —</option>
              {filteredAllocs.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            <div className="w-type-meta">STATUS</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              {(["approved", "pending"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  style={PILL(status === s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className="w-card"
          style={{
            padding: 16,
            maxHeight: 400,
            overflowY: "auto",
            marginBottom: 12,
          }}
        >
          <table style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                {["NAME", "PHONE", "TIER", "+1"].map((h) => (
                  <th
                    key={h}
                    className="w-type-meta"
                    style={{
                      textAlign: h === "+1" ? "right" : "left",
                      paddingBottom: 4,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 100).map((r, i) => (
                <tr
                  key={i}
                  style={{ borderTop: "1px solid var(--w-line)" }}
                >
                  <td style={{ padding: "4px 0", color: "var(--w-fg)" }}>
                    {r.full_name || "—"}
                  </td>
                  <td
                    style={{
                      padding: "4px 0",
                      fontFamily: "var(--w-mono)",
                    }}
                  >
                    {r.phone_raw ? (
                      r.phone_valid ? (
                        <span style={{ color: "var(--w-ok)" }}>
                          {r.phone}
                        </span>
                      ) : (
                        <span style={{ color: "var(--w-err)" }}>
                          ⚠ {r.phone_raw}
                        </span>
                      )
                    ) : (
                      <span style={{ color: "var(--w-fg-muted)" }}>—</span>
                    )}
                  </td>
                  <td
                    className="w-type-meta"
                    style={{ padding: "4px 0" }}
                  >
                    {r.tier}
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>
                    {r.plus_ones || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 100 && (
            <div className="w-type-meta" style={{ marginTop: 8 }}>
              + {preview.length - 100} MORE…
            </div>
          )}
        </div>

        {err && (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-err)", marginBottom: 8 }}
          >
            {err}
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setPreview(null)}
          >
            Back
          </button>
          <button
            type="button"
            className="btn btn--accent"
            onClick={onCommit}
            disabled={pending}
          >
            {pending ? "Importing…" : `Import ${validCount}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onPreview}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <div className="w-type-meta" style={{ marginBottom: 6 }}>
          CSV TEXT
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            ...INPUT_STYLE,
            minHeight: 240,
            fontFamily: "var(--w-mono)",
            fontSize: 14,
          }}
          placeholder={`name,phone,tier,plus_ones\nAlice Smith,+13055551111,vip,1\nBob,3055552222,,0`}
          required
        />
        <div className="w-type-meta" style={{ marginTop: 8 }}>
          HEADERS: <span style={{ color: "var(--w-fg)" }}>NAME</span>{" "}
          REQUIRED. <span style={{ color: "var(--w-fg)" }}>PHONE</span>,{" "}
          <span style={{ color: "var(--w-fg)" }}>EMAIL</span>,{" "}
          <span style={{ color: "var(--w-fg)" }}>TIER</span>,{" "}
          <span style={{ color: "var(--w-fg)" }}>PLUS_ONES</span> OPTIONAL.
        </div>
      </div>
      {err && (
        <p className="w-type-body-sm" style={{ color: "var(--w-err)" }}>
          {err}
        </p>
      )}
      <button type="submit" className="btn btn--accent">
        Preview
      </button>
    </form>
  );
}

export const _TIER_VALUES = TIER_VALUES;
