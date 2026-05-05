import { redirect } from "next/navigation";

// IA alias — the new design's "PERSONAL" profile lives at /mytickets in
// our route tree. /me is the new-IA shortcut.
export default function MeRedirect() {
  redirect("/mytickets");
}
