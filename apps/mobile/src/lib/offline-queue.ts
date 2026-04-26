/**
 * Offline scan queue (Day 27).
 *
 * When the door has flaky cell signal — which is most clubs — we don't want
 * scans to fail silently. We persist every offline scan to AsyncStorage, fire
 * a synced event when network returns, and reconcile against Supabase.
 *
 * Storage key: `wadl:scan-queue:v1` → JSON-serialized array of QueuedScan.
 *
 * The web version of this lives in apps/web's localStorage scanner (Day 14);
 * mobile mirrors the contract: same row shape, same idempotency on token+ts.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "wadl:scan-queue:v1";

export interface QueuedScan {
  /** Local-generated id; not the DB row id. */
  id: string;
  token: string;
  scanned_at: string; // ISO timestamp captured at scan time
  scanned_by: string; // user id of the staff member
  event_night_id: string | null; // null when we couldn't resolve offline
  state: "approved" | "do_not_admit" | "already_used" | "not_found";
  /** Set true once successfully synced. We don't delete — keep for the
   * post-event audit trail until a manual purge. */
  synced: boolean;
  /** Last sync error, if any. */
  error?: string | null;
}

async function readAll(): Promise<QueuedScan[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedScan[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(rows: QueuedScan[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* swallow — quota or disk error */
  }
}

export async function enqueue(scan: Omit<QueuedScan, "synced">): Promise<void> {
  const all = await readAll();
  // Idempotent on (token, scanned_at).
  if (all.some((s) => s.token === scan.token && s.scanned_at === scan.scanned_at)) {
    return;
  }
  all.push({ ...scan, synced: false });
  await writeAll(all);
}

export async function pending(): Promise<QueuedScan[]> {
  const all = await readAll();
  return all.filter((s) => !s.synced);
}

export async function pendingCount(): Promise<number> {
  return (await pending()).length;
}

export async function markSynced(id: string): Promise<void> {
  const all = await readAll();
  const next = all.map((s) => (s.id === id ? { ...s, synced: true, error: null } : s));
  await writeAll(next);
}

export async function markError(id: string, err: string): Promise<void> {
  const all = await readAll();
  const next = all.map((s) =>
    s.id === id ? { ...s, error: err.slice(0, 200) } : s
  );
  await writeAll(next);
}

/**
 * Drain pending scans through the provided sender. Caller is responsible for
 * the actual Supabase insert. We keep this lib transport-agnostic.
 *
 * Returns counts so the UI can toast "synced X / failed Y".
 */
export async function syncPending(
  send: (s: QueuedScan) => Promise<{ ok: boolean; error?: string }>
): Promise<{ synced: number; failed: number }> {
  const list = await pending();
  let synced = 0;
  let failed = 0;
  for (const s of list) {
    try {
      const r = await send(s);
      if (r.ok) {
        await markSynced(s.id);
        synced++;
      } else {
        await markError(s.id, r.error ?? "unknown");
        failed++;
      }
    } catch (e) {
      await markError(s.id, e instanceof Error ? e.message : String(e));
      failed++;
    }
  }
  return { synced, failed };
}

export async function clear(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
