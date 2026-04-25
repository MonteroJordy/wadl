"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeTourAction,
  dismissTourAction,
  seedDemoFromTourAction,
} from "@/app/owner/tour/actions";

const STEPS = [
  {
    label: "Create your first event",
    body:
      "Click + New event. Add a name, a venue, and at least one night with a doors time and capacity.",
    cta: "Create event",
    href: "/owner/events/new",
  },
  {
    label: "Add an allocation",
    body:
      "On the event, open Allocations. Each holder (promoter, brand, etc) gets a magic-link list with a cap.",
    cta: "Open the dashboard",
    href: "/owner",
  },
  {
    label: "Share the magic link",
    body:
      "Copy the holder's link from the allocation list. Send it directly. They'll add names without ever logging in.",
    cta: "Got it",
    href: null,
  },
  {
    label: "Watch RSVPs come in",
    body:
      "Notifications light up your sidebar. Open the queue to approve names. At the door, the scanner does the rest.",
    cta: "Done",
    href: "/owner/notifications",
  },
];

export default function OnboardingTour({
  alreadySeeded,
}: {
  alreadySeeded: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [seeded, setSeeded] = useState(alreadySeeded);
  const [err, setErr] = useState<string | null>(null);

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function dismiss() {
    startTransition(async () => {
      await dismissTourAction();
      router.refresh();
    });
  }

  function next() {
    if (isLast) {
      startTransition(async () => {
        await completeTourAction();
        router.refresh();
      });
    } else {
      setStep((s) => s + 1);
    }
  }

  function seed() {
    setErr(null);
    startTransition(async () => {
      const res = await seedDemoFromTourAction();
      if (res.ok) {
        setSeeded(true);
        router.refresh();
      } else setErr(res.error);
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 md:px-6 md:pb-6 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md rounded-lg border border-coral/40 bg-s1 shadow-xl shadow-coral/10 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="label-mono text-coral">
            Tour {step + 1} / {STEPS.length}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="label-mono hover:text-cream"
          >
            Skip
          </button>
        </div>
        <h3 className="font-display text-2xl text-cream mb-2">{cur.label}</h3>
        <p className="text-muted text-sm mb-4">{cur.body}</p>

        {step === 0 && !seeded && (
          <div className="card mb-3">
            <p className="label-mono mb-2">Or skip the empty-screen problem</p>
            <p className="text-muted text-sm mb-3">
              Load demo data: 1 venue, 1 event with 2 nights, 3 allocations, 25 guests.
            </p>
            <button
              type="button"
              onClick={seed}
              disabled={pending}
              className="btn-ghost"
            >
              {pending ? "Seeding…" : "Load demo data"}
            </button>
            {err && <p className="text-coral text-xs mt-2">{err}</p>}
          </div>
        )}
        {seeded && step === 0 && (
          <p className="text-mint text-sm mb-3">Demo data loaded ↑</p>
        )}

        <div className="flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="btn-ghost flex-1"
            >
              Back
            </button>
          )}
          {cur.href ? (
            <Link
              href={cur.href}
              onClick={() => {
                if (isLast)
                  startTransition(async () => {
                    await completeTourAction();
                  });
              }}
              className="btn-primary flex-1 text-center"
            >
              {cur.cta}
            </Link>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={pending}
              className="btn-primary flex-1"
            >
              {cur.cta}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
