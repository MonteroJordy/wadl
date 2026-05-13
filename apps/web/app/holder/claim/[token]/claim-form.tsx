"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/wadl";
import { claimAllocationAction } from "./actions";
import { useToast } from "@/components/toast";

export default function ClaimForm({
  token,
  signedIn,
}: {
  token: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function claim() {
    startTransition(async () => {
      const res = await claimAllocationAction(token);
      if (res.ok) {
        toast.success("Allocation claimed.");
        router.replace("/holder");
      } else toast.error(res.error);
    });
  }

  if (!signedIn) {
    return (
      <div className="w-card" style={{ padding: 18 }}>
        <div className="w-type-meta" style={{ marginBottom: 8 }}>
          SIGN IN FIRST
        </div>
        <p
          style={{
            color: "var(--w-fg)",
            opacity: 0.85,
            fontSize: 14,
            lineHeight: 1.5,
            marginBottom: 16,
          }}
        >
          Verify the phone the host invited so we know it&apos;s really you.
        </p>
        <Link
          href={`/login?return=${encodeURIComponent(`/holder/claim/${token}`)}`}
          style={{ textDecoration: "none", display: "block" }}
        >
          <Button variant="primary" style={{ width: "100%" }}>
            Sign in by phone
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Button
      variant="primary"
      type="button"
      onClick={claim}
      disabled={pending}
    >
      {pending ? "Claiming…" : "Claim this allocation"}
    </Button>
  );
}
