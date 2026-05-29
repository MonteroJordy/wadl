/**
 * Transactional email via Resend (resend.com).
 *
 * If RESEND_API_KEY is unset, no-ops with a console.log so dev still sees
 * the body. Production sends via the Resend REST API directly — no SDK.
 *
 * Default From: WADL <noreply@wadl.app>. Override per-send if you want
 * branded sender per account (Pro tier).
 */

import { isDevMode } from "@/lib/app-url";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export type SendEmailResult =
  | { ok: true; provider: "dev" | "resend"; id?: string }
  | { ok: false; error: string };

const DEFAULT_FROM =
  process.env.RESEND_FROM_EMAIL ?? "WADL <noreply@wadl.app>";

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key || isDevMode()) {
    // eslint-disable-next-line no-console
    console.log(
      `[EMAIL:dev] → ${Array.isArray(input.to) ? input.to.join(",") : input.to}\n` +
        `Subject: ${input.subject}\n${input.text ?? input.html.slice(0, 400)}`
    );
    return { ok: true, provider: "dev" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from ?? DEFAULT_FROM,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${t.slice(0, 200)}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, provider: "resend", id: data.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Tiny HTML helper. Returns a dark-themed minimal email body wrapping a
 * heading + body paragraph + optional CTA. Inline-styled — no email-client
 * stylesheet dependency.
 */
export function renderEmail(opts: {
  preheader?: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  footer?: string;
}): { html: string; text: string } {
  const text =
    `${opts.heading}\n\n${opts.body}` +
    (opts.ctaHref ? `\n\n${opts.ctaLabel ?? "Open"} → ${opts.ctaHref}` : "") +
    (opts.footer ? `\n\n${opts.footer}` : "");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(opts.heading)}</title></head>
<body style="margin:0;padding:24px;background:#0a0a0a;font-family:system-ui,sans-serif;color:#f3f1ec;">
${
  opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;">${escapeHtml(opts.preheader)}</div>`
    : ""
}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:8px;">
<tr><td style="padding:24px;">
<p style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:oklch(0.7 0.24 260);margin:0 0 4px;">WADL</p>
<h1 style="font-size:22px;color:#f3f1ec;margin:0 0 12px;font-weight:700;">${escapeHtml(opts.heading)}</h1>
<p style="font-size:14px;line-height:1.5;color:#f3f1ec;margin:0 0 20px;">${escapeHtml(opts.body).replace(/\n/g, "<br>")}</p>
${
  opts.ctaHref
    ? `<p style="margin:0 0 16px;"><a href="${escapeAttr(opts.ctaHref)}" style="display:inline-block;background:oklch(0.7 0.24 260);color:#0a0a0a;padding:12px 20px;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;border-radius:6px;">${escapeHtml(opts.ctaLabel ?? "Open")}</a></p>`
    : ""
}
${
  opts.footer
    ? `<p style="font-family:ui-monospace,monospace;font-size:10px;color:oklch(0.94 0.005 90 / 0.5);margin:24px 0 0;">${escapeHtml(opts.footer)}</p>`
    : ""
}
</td></tr>
</table>
</body></html>`;
  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
