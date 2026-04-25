import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export function GET() {
  const url = (() => {
    try {
      return getAppUrl();
    } catch {
      return "https://wadl-pearl.vercel.app";
    }
  })();

  const body = `# WADL — robots.txt
User-agent: *
Allow: /
Allow: /pricing
Allow: /privacy
Allow: /terms
Allow: /docs
Allow: /discover
Allow: /e/

# Private surfaces — owner / staff / guest-specific
Disallow: /api/
Disallow: /owner/
Disallow: /manager/
Disallow: /door/
Disallow: /admin/
Disallow: /staff-invite/
Disallow: /co-owner/
Disallow: /h/
Disallow: /t/
Disallow: /referral/
Disallow: /mytickets
Disallow: /entitysetup
Disallow: /venuesetup
Disallow: /signup
Disallow: /login
Disallow: /otp
Disallow: /photographer/
Disallow: /embed/

Sitemap: ${url}/sitemap.xml
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
