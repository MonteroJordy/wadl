/**
 * Demo Mode (Day 28).
 *
 * Sales-call indicator. When the `wadl_demo_mode` cookie is "1", the chrome
 * shows a sticky coral banner across the top of every authed page warning
 * that any data shown is sample data and any actions taken won't fire real
 * SMS/push.
 *
 * This is intentionally just a flag — we don't swap accounts or rewrite
 * data. The bigger "demo dataset" lives in lib/demo-seed.ts; this lets you
 * present that dataset honestly during a pitch.
 */

import { cookies } from "next/headers";

export const DEMO_COOKIE = "wadl_demo_mode";

export function isDemoMode(): boolean {
  try {
    return cookies().get(DEMO_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}
