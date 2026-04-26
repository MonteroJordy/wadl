import type { AccountType, EventType } from "./types";

/**
 * Account-type differentiation helpers (Day 19 P1-3).
 *
 * The brief defines venue / brand / individual as meaningfully different
 * actor classes. These helpers translate that into product behavior so the
 * three types stop sharing identical UX after onboarding.
 */

/**
 * Default event_type for a freshly created event, by account_type.
 * - venue → venue_owned (their own night at their own room)
 * - brand → brand_takeover (their identity, someone else's room)
 * - individual → co_produced (collab with the venue)
 */
export function defaultEventType(accountType: AccountType): EventType {
  switch (accountType) {
    case "venue":
      return "venue_owned";
    case "brand":
      return "brand_takeover";
    case "individual":
      return "co_produced";
  }
}

/**
 * Whether this account type runs its own venue (and therefore needs the
 * venuesetup step + sees venue-management UI). Brands and individuals
 * piggyback on someone else's venue.
 */
export function ownsAVenue(accountType: AccountType): boolean {
  return accountType === "venue";
}

/**
 * The label for the entity this account type creates events for. Used in
 * onboarding copy + new-event placeholders.
 */
export function accountEntityLabel(accountType: AccountType): {
  noun: string;
  /** Placeholder for the entity-name field at signup. */
  placeholder: string;
  /** Placeholder for an event name. */
  eventPlaceholder: string;
} {
  switch (accountType) {
    case "venue":
      return {
        noun: "venue",
        placeholder: "Floyd Miami",
        eventPlaceholder: "Friday at the Patio",
      };
    case "brand":
      return {
        noun: "brand",
        placeholder: "Mainframe Agency",
        eventPlaceholder: "Mainframe x Wynwood Takeover",
      };
    case "individual":
      return {
        noun: "name or handle",
        placeholder: "DJ Name",
        eventPlaceholder: "DJ Name presents…",
      };
  }
}

/**
 * Onboarding copy for /welcome step 3. Venues set up a venue; brands +
 * individuals invite their first holder instead.
 */
export function welcomeStep3(accountType: AccountType): {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
} {
  if (accountType === "venue") {
    return {
      heading: "Your venue",
      body: "Add your room (name, address, capacity, default doors time).",
      ctaLabel: "Set up venue",
      ctaHref: "/venuesetup?return=/welcome",
    };
  }
  // brand + individual share the same step.
  return {
    heading: "Pick a venue partner",
    body:
      "Brands and solo promoters don't run a room — pick a venue you collab with when you create your first event. Skip this step for now and add holders later.",
    ctaLabel: "Continue",
    ctaHref: "/welcome?step=4",
  };
}
