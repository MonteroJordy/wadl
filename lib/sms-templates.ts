/**
 * Default SMS templates seeded for new accounts. Variables: {{guest.name}},
 * {{event.name}}, {{event.date}}, {{venue.name}}.
 */
export interface SmsTemplate {
  key: string;
  label: string;
  body: string;
}

export const DEFAULT_TEMPLATES: SmsTemplate[] = [
  {
    key: "rsvp_confirmed",
    label: "RSVP confirmed",
    body: "WADL: {{guest.name}} — you're confirmed for {{event.name}} on {{event.date}}. We'll text your QR closer to doors.",
  },
  {
    key: "doors_open",
    label: "Doors are open",
    body: "WADL: doors are open at {{venue.name}} for {{event.name}}. Show your QR at the door.",
  },
  {
    key: "last_call",
    label: "Last call (cutoff)",
    body: "WADL: last call to claim your spot for {{event.name}}. Cutoff in 30 min.",
  },
  {
    key: "post_event_thanks",
    label: "Post-event thanks",
    body: "WADL: thanks for coming out to {{event.name}}, {{guest.name}}. See you next time.",
  },
];

/** Render a template body with simple `{{var}}` substitution. */
export function renderTemplate(
  body: string,
  vars: Record<string, string>
): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => vars[key] ?? "");
}
