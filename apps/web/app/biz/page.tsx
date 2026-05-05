import { redirect } from "next/navigation";

// IA alias — the new design system frames the venue/brand experience
// as the "BUSINESS" profile. The canonical route stays /owner (47 days
// of links and SMS templates point at it); /biz exists so anyone using
// the new vocabulary lands in the right place.
export default function BizRedirect() {
  redirect("/owner");
}
