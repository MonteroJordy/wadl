import { redirect } from "next/navigation";

/**
 * "Tonight" is the marketing name for the public discover feed —
 * humans guess this URL, so 301 it to the real route instead of
 * dumping them on the branded 404.
 */
export default function TonightRedirect() {
  redirect("/discover");
}
