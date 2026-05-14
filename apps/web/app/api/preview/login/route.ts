import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/**
 * Preview-mode one-click sign-in. **Env-gated** — returns 404 unless
 * NEXT_PUBLIC_PREVIEW_MODE === "1". On Vercel this should only be set
 * for preview/staging deployments, never production.
 *
 * Flow:
 *   1. POST /api/preview/login with ?role=owner|holder|staff|guest
 *   2. Server resolves the role to a demo auth.users email
 *   3. admin.generateLink() returns a magic-link URL
 *   4. We 302 the browser to that URL
 *   5. Supabase's /auth/v1/verify endpoint sets the session cookie
 *      and redirects to the role's home page
 *
 * No password, no OTP, no user input. Demo users are seeded by the
 * 20260513000001_demo_accounts migration.
 */

type Role = "owner" | "holder" | "staff" | "guest";

const DEMO: Record<Role, { email: string; redirect: string; label: string }> = {
  owner: {
    email: "demo-owner@wadl.test",
    redirect: "/owner",
    label: "Demo Owner",
  },
  holder: {
    email: "demo-holder@wadl.test",
    // The holder's main view is their magic link — drop them on the
    // claimed allocation page or their wallet, depending on what they've
    // verified. /holder lists all claimed allocations.
    redirect: "/holder",
    label: "Demo Promoter",
  },
  staff: {
    email: "demo-staff@wadl.test",
    // /door auto-redirects to the right event's scanner.
    redirect: "/door",
    label: "Demo Door Staff",
  },
  guest: {
    email: "demo-guest@wadl.test",
    redirect: "/mytickets",
    label: "Demo Guest",
  },
};

function previewEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PREVIEW_MODE === "1";
}

async function handle(req: NextRequest) {
  if (!previewEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Preview mode disabled." },
      { status: 404 },
    );
  }
  const role = (req.nextUrl.searchParams.get("role") ?? "").toLowerCase() as Role;
  if (!DEMO[role]) {
    return NextResponse.json(
      { ok: false, error: "Unknown role." },
      { status: 400 },
    );
  }
  const { email, redirect } = DEMO[role];

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Service-role key missing — see /preview docs.",
      },
      { status: 500 },
    );
  }

  // Generate a one-shot magic link for the demo user. Supabase handles
  // session cookie setup on the redirect.
  const redirectTo = `${getAppUrl()}${redirect}`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (error || !data.properties?.action_link) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ??
          `Demo user ${email} not found. Run the demo_accounts migration.`,
      },
      { status: 500 },
    );
  }

  // 302 → Supabase verify endpoint → role home page (cookies set on the way).
  return NextResponse.redirect(data.properties.action_link, { status: 302 });
}

export const GET = handle;
export const POST = handle;
