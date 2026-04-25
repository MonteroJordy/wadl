/**
 * Chat Hub line parser.
 *
 * Two backends:
 *   - Claude API (when ANTHROPIC_API_KEY is set). Uses haiku-4-5 — fast,
 *     cheap, more than capable for free-text name parsing.
 *   - Regex fallback (always available). Handles common shorthand:
 *     "Name VIP", "Name +2", "Name w/ Diplo VIP", "Alice all access".
 *
 * Returned shape is identical from both backends so the rest of the flow
 * doesn't care which path produced the rows.
 */

export interface ParsedLine {
  raw_line: string;
  name: string;
  tier: "ga" | "vip" | "all_access";
  plus_ones: number;
  attributed_to_holder_name: string | null;
  confidence: number; // 0..1
}

function classifyTier(s: string): "ga" | "vip" | "all_access" {
  const lc = s.toLowerCase();
  if (/(all.?access|aa\b|backstage|btsg)/.test(lc)) return "all_access";
  if (/\bvip\b/.test(lc)) return "vip";
  return "ga";
}

function parsePlusOnes(s: string): number {
  // "+2", "+ 2", "plus 2", "and 2 more", "& 2"
  const re = /(?:\+\s*|plus\s+|and\s+|&\s*)(\d+)\b/i;
  const m = s.match(re);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function parseHolder(s: string): string | null {
  // "w/ Diplo", "with Diplo", "for Diplo", "via Diplo", " - Diplo"
  const re = /(?:\bw\/\s*|\bwith\s+|\bfor\s+|\bvia\s+|\s-\s+)([A-Z][\w'.\- ]{1,40})/;
  const m = s.match(re);
  return m ? m[1].trim() : null;
}

function stripDirectives(s: string): string {
  return s
    // remove +N / plus N / and N more
    .replace(/\b(?:\+\s*|plus\s+|and\s+|&\s*)\d+\s*(more)?\b/gi, "")
    // remove tier tokens
    .replace(/\b(vip|ga|all.?access|aa|backstage|btsg)\b/gi, "")
    // remove "w/ Holder" / "with Holder"
    .replace(/(?:\bw\/\s*|\bwith\s+|\bfor\s+|\bvia\s+|\s-\s+)[A-Z][\w'.\- ]{1,40}/g, "")
    // collapse whitespace + punctuation tails
    .replace(/[,;.\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function regexParse(input: string, defaultHolder: string | null = null): ParsedLine[] {
  return input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((raw) => {
      const tier = classifyTier(raw);
      const plus_ones = parsePlusOnes(raw);
      const holder = parseHolder(raw) ?? defaultHolder;
      const name = stripDirectives(raw);
      return {
        raw_line: raw,
        name: name || raw,
        tier,
        plus_ones,
        attributed_to_holder_name: holder,
        confidence: name ? 0.7 : 0.4,
      };
    });
}

const PROMPT = `You are a parser for nightclub guest-list paste dumps.
Each line is one guest entry, written by a promoter / brand / staff member.
Convert each line into a structured row.

Rules:
- name: the person's display name. Strip any tier / plus-one / holder tokens.
- tier: one of "ga" (default), "vip", "all_access".
- plus_ones: integer 0..10. "+2", "plus 2", "and 2 more", "& 2" → 2.
- attributed_to_holder_name: the promoter / artist / brand the guest is "w/" or "with" or "for" or "via". Null if not specified.
- confidence: 0..1, your confidence the parse is correct.

Return ONLY a valid JSON array — no prose, no markdown fences. One object per non-blank input line, in the same order. Keys: raw_line, name, tier, plus_ones, attributed_to_holder_name, confidence.

Input lines:
`;

export async function claudeParse(
  input: string,
  defaultHolder: string | null = null
): Promise<ParsedLine[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content:
              PROMPT +
              lines.map((l) => `- ${l}`).join("\n") +
              (defaultHolder
                ? `\n\nIf no holder is specified on a line, attribute to: ${defaultHolder}`
                : ""),
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = json.content?.[0]?.text ?? "";
    // Strip markdown fences if model used them anyway.
    const cleaned = text
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    const parsed = JSON.parse(cleaned) as ParsedLine[];
    return parsed.map((p) => ({
      raw_line: String(p.raw_line ?? ""),
      name: String(p.name ?? "").trim(),
      tier: ["ga", "vip", "all_access"].includes(p.tier) ? p.tier : "ga",
      plus_ones: Math.max(0, Math.min(10, parseInt(String(p.plus_ones ?? 0), 10) || 0)),
      attributed_to_holder_name: p.attributed_to_holder_name
        ? String(p.attributed_to_holder_name)
        : defaultHolder,
      confidence:
        typeof p.confidence === "number"
          ? Math.max(0, Math.min(1, p.confidence))
          : 0.7,
    }));
  } catch {
    return null;
  }
}

export async function parseChatHub(
  input: string,
  defaultHolder: string | null = null
): Promise<{ rows: ParsedLine[]; backend: "claude" | "regex" }> {
  const claude = await claudeParse(input, defaultHolder);
  if (claude) return { rows: claude, backend: "claude" };
  return { rows: regexParse(input, defaultHolder), backend: "regex" };
}
