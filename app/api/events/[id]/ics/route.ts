/**
 * Alias for /api/events/[id]/calendar.ics — matches the spec naming.
 * Both paths return the same .ics body.
 */
export { GET } from "../calendar.ics/route";
export const dynamic = "force-dynamic";
