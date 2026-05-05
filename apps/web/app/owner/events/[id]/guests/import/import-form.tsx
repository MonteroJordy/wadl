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
      const tierRaw = map.tier >= 0 ? (r[map.tier] ?? "").toLowerCase().trim() : "ga";
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
        email: map.email >= 0 ? r[map.email] ?? null : null,
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
        rows
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
      <div className="card border-mint/40">
        <p className="label-mono text-mint mb-2">Done</p>
        <p className="text-cream">
          Inserted {done.inserted}. Skipped: {done.skipped_dupe_phone} dupe phones,{" "}
          {done.skipped_invalid_phone} invalid phones, {done.skipped_missing_name} no name.
        </p>
        <button
          type="button"
          onClick={() => setDone(null)}
          className="btn-ghost mt-3"
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
        <div className="card mb-3">
          <p className="label-mono mb-2">Preview · {validCount} rows</p>
          <div className="grid gap-2 mb-3">
            <label className="label-mono">Night</label>
            <select
              value={nightId}
              onChange={(e) => {
                setNightId(e.target.value);
                setAllocationId("");
              }}
              className="input-dark"
            >
              {nights.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
            <label className="label-mono">Allocation</label>
            <select
              value={allocationId}
              onChange={(e) => setAllocationId(e.target.value)}
              className="input-dark"
            >
              <option value="">— Direct (no allocation) —</option>
              {filteredAllocs.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            <label className="label-mono">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(["approved", "pending"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`p-3 rounded border ${
                    status === s
                      ? "border-coral bg-s2 text-cream"
                      : "border-line text-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card max-h-96 overflow-y-auto mb-3">
          <table className="w-full text-xs">
            <thead className="label-mono text-left">
              <tr>
                <th className="pb-1">Name</th>
                <th>Phone</th>
                <th>Tier</th>
                <th>+1</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 100).map((r, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1 text-cream">{r.full_name || "—"}</td>
                  <td className="py-1 font-mono">
                    {r.phone_raw ? (
                      r.phone_valid ? (
                        <span className="text-mint">{r.phone}</span>
                      ) : (
                        <span className="text-coral">⚠ {r.phone_raw}</span>
                      )
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="py-1 label-mono">{r.tier}</td>
                  <td className="py-1 text-right">{r.plus_ones || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 100 && (
            <p className="label-mono mt-2">+ {preview.length - 100} more…</p>
          )}
        </div>

        {err && <p className="text-err text-sm mb-2">{err}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="btn-ghost"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onCommit}
            disabled={pending}
            className="btn-primary"
          >
            {pending ? "Importing…" : `Import ${validCount}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onPreview} className="flex flex-col gap-4">
      <div>
        <label className="label-mono block mb-2">CSV text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input-dark min-h-[240px] font-mono text-sm"
          placeholder={`name,phone,tier,plus_ones\nAlice Smith,+13055551111,vip,1\nBob,3055552222,,0`}
          required
        />
        <p className="label-mono mt-2">
          Headers: <span className="text-cream">name</span> required.{" "}
          <span className="text-cream">phone</span>,{" "}
          <span className="text-cream">email</span>,{" "}
          <span className="text-cream">tier</span>,{" "}
          <span className="text-cream">plus_ones</span> optional.
        </p>
      </div>
      {err && <p className="text-err text-sm">{err}</p>}
      <button type="submit" className="btn-primary">
        Preview
      </button>
    </form>
  );
}

export const _TIER_VALUES = TIER_VALUES;
