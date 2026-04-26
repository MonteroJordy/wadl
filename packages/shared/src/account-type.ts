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

/**
 * Day 41 — fuller per-type product framing. Each helper here drives a
 * different surface so venue/brand/individual stop reading like the same
 * product with three labels.
 */

/** Dashboard headline + subline. Replaces the generic "THIS WEEK · accountname" header. */
export function dashboardFraming(accountType: AccountType): {
  heroLabel: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCtaLabel: string;
} {
  switch (accountType) {
    case "venue":
      return {
        heroLabel: "Your venue · this week",
        emptyTitle: "No nights this week",
        emptyBody:
          "Drop a flyer, set doors, invite your promoters. Two minutes to a real list on a real door.",
        emptyCtaLabel: "+ Create your first night",
      };
    case "brand":
      return {
        heroLabel: "Your takeovers · this week",
        emptyTitle: "No takeovers booked",
        emptyBody:
          "Brands take over rooms. Pick the venue partner, name the night, drop the flyer. The list builds itself.",
        emptyCtaLabel: "+ Schedule a takeover",
      };
    case "individual":
      return {
        heroLabel: "Your nights · this week",
        emptyTitle: "Nothing booked yet",
        emptyBody:
          "Solo promoter, artist, host. Throw your own night with a venue partner, or wait for a magic link from someone who already has the room.",
        emptyCtaLabel: "+ Book a night",
      };
  }
}

/**
 * What sidebar items make sense for this account type. Returned as a set of
 * "hide" hrefs so the layout can filter the standard nav.
 */
export function hiddenNavHrefs(accountType: AccountType): Set<string> {
  // Venues see everything. Brands + individuals don't run venues, so
  // venue-management is irrelevant. (We still show "Profile + venues" so the
  // user can flip account_type later.)
  if (accountType === "venue") return new Set();
  if (accountType === "brand") {
    // Brands skip:  payouts (until they have promoters), webhooks (advanced).
    return new Set(["/owner/webhooks"]);
  }
  // individual
  return new Set([
    "/owner/webhooks",
    "/owner/sms-templates",
  ]);
}

/**
 * Welcome wizard step 1 — opening line varies per type so the brand voice
 * matches who's reading it.
 */
export function welcomeStep1Pitch(accountType: AccountType): {
  headline: string;
  blurb: string;
  steps: string[];
} {
  switch (accountType) {
    case "venue":
      return {
        headline: "Welcome to your door.",
        blurb:
          "Your venue, your room, your list. We'll walk you through setup, then get out of the way so you can run the night.",
        steps: [
          "Pick your role",
          "Set up your venue",
          "Create your first event",
          "Invite your first promoter",
          "Run the door",
        ],
      };
    case "brand":
      return {
        headline: "Welcome to your takeovers.",
        blurb:
          "You don't own a room — you bring the brand. We'll set up your account, then your first takeover at a partner venue.",
        steps: [
          "Pick your role",
          "Confirm brand identity",
          "Schedule a takeover",
          "Invite your team",
          "Run the door",
        ],
      };
    case "individual":
      return {
        headline: "Welcome.",
        blurb:
          "You're solo. We'll keep this simple — just the tools you need to throw a night and grade your own show rate.",
        steps: [
          "Pick your role",
          "Set your handle",
          "Book your first night",
          "Send the link",
          "Run the door",
        ],
      };
  }
}
