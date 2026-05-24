import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/otp",
  "/forgot-password",
  "/verify-email",
  "/onboarding",
  "/api/auth",
  "/api/health",
  "/api/wallet",
  "/api/events",
  "/api/webhooks",
  "/api/admin",
  "/api/og",
  "/api/cron",
  "/api/log/client-error",
  "/h",
  "/g",
  "/v",
  "/invite",
  "/role-picker",
  "/recognized",
  "/d",
  "/discover",
  "/e",
  "/t",
  "/mytickets",
  "/staff-invite",
  "/co-owner",
  "/referral",
  "/embed",
  "/pricing",
  "/privacy",
  "/terms",
  "/status",
  "/changelog",
  "/press",
  "/careers",
  "/about",
  "/shortcuts",
  "/reissue",
  "/docs",
  "/help",
  "/contact",
  "/sitemap.xml",
  "/robots.txt",
  "/holder/claim",
  "/demo-mode",
  "/manifest.json",
  "/icon.svg",
  "/service-worker.js",
  "/dev",
  // Preview-mode role dispatcher. The page + API route each enforce
  // their own NEXT_PUBLIC_PREVIEW_MODE gate (404 when disabled), so
  // it's safe to let unauthenticated visitors reach them.
  "/preview",
  "/api/preview",
];

type CookieToSet = { name: string; value: string; options: CookieOptions };

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
