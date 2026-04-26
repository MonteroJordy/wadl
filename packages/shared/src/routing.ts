import type { Account, Profile } from "./types";

/**
 * Next-step router for onboarding. Decides where a signed-in user should land
 * based on how complete their profile + account setup is.
 */
export function nextOnboardingStep(
  profile: Profile | null,
  account: Account | null,
  hasVenue: boolean
): string {
  // Day 32 — single unified setup screen replaces signup → entitysetup →
  // venuesetup. Until profile + account + (venue if venue-type) are all
  // present, send them to /setup.
  if (!profile || !profile.full_name) return "/setup";
  if (!profile.account_id || !account) return "/setup";
  if (account.account_type === "venue" && !hasVenue) return "/setup";
  // First-time owners see the 5-step welcome wizard before the dashboard.
  if (!profile.onboarding_completed_at) return "/welcome";
  return "/owner";
}

/** Normalize user-entered US phone numbers to E.164 for Supabase. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (input.startsWith("+") && digits.length >= 8) return `+${digits}`;
  return null;
}
