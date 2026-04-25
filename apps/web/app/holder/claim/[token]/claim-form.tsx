"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      <div className="card">
        <p className="label-mono mb-2">Sign in first</p>
        <p className="text-cream/80 text-sm mb-4">
          Verify the phone the host invited so we know it&apos;s really you.
        </p>
        <Link
          href={`/login?return=${encodeURIComponent(`/holder/claim/${token}`)}`}
          className="btn-primary text-center block"
        >
          Sign in by phone
        </Link>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={claim}
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Claiming…" : "Claim this allocation"}
    </button>
  );
}
