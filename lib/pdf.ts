/**
 * Minimal PDF generator. Single-page or multi-page text + checkbox layout
 * using the built-in Helvetica core font (no font embedding required).
 *
 * This is intentionally hand-rolled to avoid pulling in the ~5MB react-pdf
 * dependency tree. The PDF spec is text-based and Helvetica is a "Standard
 * 14" font that every reader has built-in.
 */

interface Op {
  /** PDF content stream operator string (already PDF-encoded). */
  text: string;
}

interface Page {
  ops: Op[];
}

const PAGE_W = 612; // 8.5"
const PAGE_H = 792; // 11"
const MARGIN = 40;

function escPdfText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    // Crude latin-1 fallback: drop non-Latin1 to avoid garbled glyphs.
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

export interface PdfRow {
  /** "□" checkbox at start; pre-checked if scanned. */
  scanned: boolean;
  full_name: string;
  tier: string;
  plus_ones: number;
  flag_dna?: boolean;
  /** Optional night date column when printing all nights. */
  night_label?: string;
}

export interface PdfGroup {
  holder_name: string;
  rows: PdfRow[];
}

export interface PdfDoc {
  title: string;
  subtitle: string;
  groups: PdfGroup[];
}

/**
 * Generate a PDF as a Uint8Array. Helvetica + Helvetica-Bold core fonts.
 */
export function generateRosterPdf(doc: PdfDoc): Uint8Array {
  const pages: Page[] = [];
  let cur: Page = { ops: [] };
  pages.push(cur);

  let y = PAGE_H - MARGIN;

  function newPage() {
    cur = { ops: [] };
    pages.push(cur);
    y = PAGE_H - MARGIN;
  }

  function ensureSpace(h: number) {
    if (y - h < MARGIN) newPage();
  }

  function drawText(font: "F1" | "F2", size: number, x: number, yPos: number, s: string) {
    cur.ops.push({
      text: `BT /${font} ${size} Tf ${x} ${yPos} Td (${escPdfText(s)}) Tj ET`,
    });
  }

  function drawRect(x: number, yPos: number, w: number, h: number, fill: boolean) {
    cur.ops.push({
      text: fill
        ? `${x} ${yPos} ${w} ${h} re f`
        : `${x} ${yPos} ${w} ${h} re S`,
    });
  }

  function drawLine(x1: number, y1: number, x2: number, y2: number) {
    cur.ops.push({ text: `${x1} ${y1} m ${x2} ${y2} l S` });
  }

  // Header
  ensureSpace(40);
  drawText("F2", 18, MARGIN, y - 14, doc.title);
  y -= 22;
  drawText("F1", 10, MARGIN, y - 12, doc.subtitle);
  y -= 24;
  drawLine(MARGIN, y, PAGE_W - MARGIN, y);
  y -= 14;

  for (const g of doc.groups) {
    ensureSpace(36);
    // Group header.
    drawText("F2", 12, MARGIN, y - 12, g.holder_name);
    const subTotal = g.rows.reduce((s, r) => s + 1 + (r.plus_ones ?? 0), 0);
    drawText(
      "F1",
      9,
      PAGE_W - MARGIN - 80,
      y - 12,
      `${g.rows.length} | ${subTotal} heads`
    );
    y -= 18;
    drawLine(MARGIN, y, PAGE_W - MARGIN, y);
    y -= 14;

    for (const r of g.rows) {
      ensureSpace(18);
      // Checkbox at left.
      drawRect(MARGIN, y - 10, 10, 10, false);
      if (r.scanned) {
        // X mark inside.
        drawLine(MARGIN + 1, y - 9, MARGIN + 9, y - 1);
        drawLine(MARGIN + 9, y - 9, MARGIN + 1, y - 1);
      }
      const flag = r.flag_dna ? " [DNA]" : "";
      const plus = r.plus_ones > 0 ? ` (+${r.plus_ones})` : "";
      drawText(
        r.flag_dna ? "F2" : "F1",
        10,
        MARGIN + 18,
        y - 8,
        `${r.full_name}${plus}${flag}`
      );
      drawText(
        "F1",
        9,
        PAGE_W - MARGIN - 120,
        y - 8,
        r.tier.replace("_", " ").toUpperCase()
      );
      if (r.night_label) {
        drawText("F1", 9, PAGE_W - MARGIN - 50, y - 8, r.night_label);
      }
      y -= 14;
    }
    y -= 8;
  }

  // Build PDF objects.
  const objects: string[] = [];
  function addObj(body: string): number {
    objects.push(body);
    return objects.length;
  }

  const fontF1 = addObj(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
  );
  const fontF2 = addObj(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`
  );

  const pageObjects: number[] = [];
  const contentObjects: number[] = [];

  // Reserve catalog + pages tree references.
  const placeholderCatalog = addObj("<< placeholder >>");
  const placeholderPages = addObj("<< placeholder >>");

  for (const p of pages) {
    const stream = p.ops.map((o) => o.text).join("\n");
    const contentBody = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    const contentNum = addObj(contentBody);
    contentObjects.push(contentNum);
    const pageBody =
      `<< /Type /Page /Parent ${placeholderPages} 0 R ` +
      `/MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 ${fontF1} 0 R /F2 ${fontF2} 0 R >> >> ` +
      `/Contents ${contentNum} 0 R >>`;
    const pageNum = addObj(pageBody);
    pageObjects.push(pageNum);
  }

  // Replace placeholders.
  const kids = pageObjects.map((n) => `${n} 0 R`).join(" ");
  objects[placeholderPages - 1] =
    `<< /Type /Pages /Kids [${kids}] /Count ${pageObjects.length} >>`;
  objects[placeholderCatalog - 1] =
    `<< /Type /Catalog /Pages ${placeholderPages} 0 R >>`;

  // Serialize.
  const lines: string[] = [];
  lines.push("%PDF-1.4");
  lines.push("%\xE2\xE3\xCF\xD3"); // binary marker

  const offsets: number[] = [];
  let pos = lines.join("\n").length + 1;

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pos);
    const body = `${i + 1} 0 obj\n${objects[i]}\nendobj`;
    lines.push(body);
    pos += body.length + 1;
  }

  const xrefOffset = pos;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += off.toString().padStart(10, "0") + " 00000 n \n";
  }
  lines.push(xref);

  lines.push(
    `trailer\n<< /Size ${objects.length + 1} /Root ${placeholderCatalog} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  const out = lines.join("\n");
  return new TextEncoder().encode(out);
}
