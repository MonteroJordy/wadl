/**
 * Door scanner feedback — haptic vibration + a short Web Audio tone keyed
 * to the scan outcome. Both APIs are no-ops where unsupported (vibrate on
 * iOS Safari, AudioContext when sound is muted by the user agent).
 *
 * Outcome → cue mapping:
 *   approved        → short high beep + double tap                (go)
 *   already_used    → medium mid tone + one long buzz             (caution)
 *   sync_conflict   →   "      "
 *   anything else   → low descending tone + one long buzz         (stop)
 */

type Outcome =
  | "approved"
  | "already_used"
  | "sync_conflict"
  | "not_found"
  | "wrong_event"
  | "wrong_night"
  | "do_not_admit"
  | "error";

let _ctx: AudioContext | null = null;
function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  try {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC();
    return _ctx;
  } catch {
    return null;
  }
}

function beep(
  freq: number,
  durMs: number,
  ramp?: { to: number },
): void {
  const ctx = audioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = durMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, now);
  if (ramp) osc.frequency.exponentialRampToValueAtTime(ramp.to, now + dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur);
}

function vibe(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* iOS Safari — silently ignore */
  }
}

const MUTE_KEY = "wadl_door_feedback_muted";

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage?.getItem(MUTE_KEY) === "1";
}
export function setMuted(m: boolean): void {
  if (typeof window === "undefined") return;
  if (m) window.localStorage?.setItem(MUTE_KEY, "1");
  else window.localStorage?.removeItem(MUTE_KEY);
}

/**
 * Fire-and-forget feedback. Call once on every scan outcome.
 */
export function playFeedback(outcome: Outcome): void {
  if (isMuted()) return;
  switch (outcome) {
    case "approved":
      beep(880, 90);
      // brief gap, then second blip
      window.setTimeout(() => beep(1320, 90), 110);
      vibe([40, 40, 40]);
      return;
    case "already_used":
    case "sync_conflict":
      beep(440, 200);
      vibe(180);
      return;
    default:
      // hard stop — descending low tone + long buzz
      beep(330, 350, { to: 165 });
      vibe(420);
      return;
  }
}
