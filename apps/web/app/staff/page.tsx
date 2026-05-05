import { redirect } from "next/navigation";

// IA alias — the new design's "STAFF" profile is our /door tree. /staff
// is the new-IA shortcut so anyone arriving from the design vocabulary
// lands at the scanner home.
export default function StaffRedirect() {
  redirect("/door");
}
