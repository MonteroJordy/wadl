import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

interface PublicEvent {
  id: string;
  updated_at: string;
  event_nights: Array<{ doors_at: string }>;
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const baseUrl = (() => {
    try {
      return getAppUrl();
    } catch {
      return "https://wadl-pearl.vercel.app";
    }
  })();

  // Public marketing + utility URLs.
  const staticUrls: Array<{ loc: string; priority: number; changefreq: string }> = [
    { loc: "/", priority: 1.0, changefreq: "weekly" },
    { loc: "/pricing", priority: 0.9, changefreq: "monthly" },
    { loc: "/discover", priority: 0.9, changefreq: "daily" },
    { loc: "/docs", priority: 0.6, changefreq: "monthly" },
    { loc: "/docs/embed", priority: 0.5, changefreq: "monthly" },
    { loc: "/privacy", priority: 0.3, changefreq: "yearly" },
    { loc: "/terms", priority: 0.3, changefreq: "yearly" },
  ];

  // Public event detail pages — only events with at least one upcoming-or-recent night.
  let events: PublicEvent[] = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("events")
      .select("id, updated_at, event_nights(doors_at)")
      .order("updated_at", { ascending: false })
      .limit(2000);
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // last 7 days OR upcoming
    events = ((data ?? []) as PublicEvent[]).filter((e) =>
      (e.event_nights ?? []).some((n) => new Date(n.doors_at).getTime() >= cutoff)
    );
  } catch {
    // If DB is unavailable, fall back to just static.
  }

  const urls = [
    ...staticUrls.map((s) => ({
      loc: `${baseUrl}${s.loc}`,
      lastmod: new Date().toISOString(),
      priority: s.priority.toFixed(1),
      changefreq: s.changefreq,
    })),
    ...events.map((e) => ({
      loc: `${baseUrl}/e/${e.id}`,
      lastmod: e.updated_at,
      priority: "0.7",
      changefreq: "daily",
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escXml(u.loc)}</loc>
    <lastmod>${escXml(u.lastmod)}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
