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
  if (!profile || !profile.full_name) return "/signup";
  if (!profile.account_id || !account) return "/entitysetup";
  if (account.account_type === "venue" && !hasVenue) return "/venuesetup";
  return "/owner/dashboard";
}

/** Normalize user-entered US phone numbers to E.164 for Supabase. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (input.startsWith("+") && digits.length >= 8) return `+${digits}`;
  return null;
}
