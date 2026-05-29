/**
 * Shared formatting utilities. Use these for any date/time/number that
 * gets shown to the user — keeps the entire app on the same locale
 * conventions (en-US) and the same "look" (lowercase 10pm, abbreviated
 * weekday, etc).
 */

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
    .toLowerCase();
}

/** "Sat May 10 · 10:00pm" — both at once, suitable for headers. */
export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

/** "May 10, 2026" — long form with year, for archival/audit contexts. */
export function fmtLongDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * "in 2h", "3d ago", "just now" — compact relative time.
 * Returns null if `iso` is invalid.
 */
export function fmtRelative(
  iso: string,
  now: Date = new Date(),
): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - now.getTime();
  const absSec = Math.abs(diffMs) / 1000;
  const past = diffMs < 0;
  const prefix = past ? "" : "in ";
  const suffix = past ? " ago" : "";

  if (absSec < 45) return past ? "just now" : "now";
  if (absSec < 90) return `${prefix}1m${suffix}`;
  const mins = absSec / 60;
  if (mins < 60) return `${prefix}${Math.round(mins)}m${suffix}`;
  const hours = mins / 60;
  if (hours < 24) return `${prefix}${Math.round(hours)}h${suffix}`;
  const days = hours / 24;
  if (days < 7) return `${prefix}${Math.round(days)}d${suffix}`;
  const weeks = days / 7;
  if (weeks < 5) return `${prefix}${Math.round(weeks)}w${suffix}`;
  const months = days / 30;
  if (months < 12) return `${prefix}${Math.round(months)}mo${suffix}`;
  const years = days / 365;
  return `${prefix}${Math.round(years)}y${suffix}`;
}

/**
 * US phone in pretty form: 13057990518 → "+1 (305) 799-0518".
 * Passes through unrecognized formats unchanged.
 */
export function fmtPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return String(raw);
}

/** "$199", "$1,250" — whole-dollar currency from cents (no cents shown by default). */
export function fmtCurrency(
  cents: number | null | undefined,
  opts: { showCents?: boolean; currency?: string } = {},
): string {
  if (cents == null) return "—";
  const { showCents = false, currency = "USD" } = opts;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: showCents ? 2 : 0,
    minimumFractionDigits: showCents ? 2 : 0,
  }).format(cents / 100);
}

/** "1,250" — comma-grouped integer. */
export function fmtNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

/** "1 guest" / "5 guests" — pluralization with optional comma-grouping. */
export function fmtCount(
  n: number,
  singular: string,
  plural?: string,
): string {
  const word = n === 1 ? singular : plural ?? `${singular}s`;
  return `${fmtNumber(n)} ${word}`;
}

/** Initials from a full name: "Jordy Montero" → "JM". Falls back to "?". */
export function fmtInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
