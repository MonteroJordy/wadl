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
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        padding: "12px 12px 12px",
        pointerEvents: "none",
      }}
    >
      <div
        className="w-app"
        style={{
          pointerEvents: "auto",
          margin: "0 auto",
          maxWidth: 460,
          background: "var(--w-surface-2)",
          border: "1px solid var(--w-acc)",
          padding: 20,
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span className="chip">
            TOUR · {step + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={dismiss}
            disabled={pending}
            className="w-type-meta"
            style={{
              background: "transparent",
              border: 0,
              color: "var(--w-fg-muted)",
              cursor: pending ? "not-allowed" : "pointer",
              padding: 0,
            }}
          >
            SKIP
          </button>
        </div>

        <h3 className="w-type-h2" style={{ marginBottom: 8 }}>
          {cur.label}
        </h3>
        <p
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          {cur.body}
        </p>

        {step === 0 && !seeded && (
          <div
            className="w-card"
            style={{
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div className="w-type-meta">OR SKIP THE EMPTY-SCREEN PROBLEM</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 8,
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              Load demo data: 1 venue, 1 event with 2 nights, 3 allocations,
              25 guests.
            </p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={seed}
              disabled={pending}
            >
              {pending ? "Seeding…" : "Load demo data"}
            </button>
            {err && (
              <p
                className="w-type-body-sm"
                style={{ color: "var(--w-err)", marginTop: 8 }}
              >
                {err}
              </p>
            )}
          </div>
        )}
        {seeded && step === 0 && (
          <div
            className="w-type-body-sm"
            style={{ color: "var(--w-ok)", marginBottom: 14 }}
          >
            ✓ Demo data loaded
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {step > 0 && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setStep((s) => s - 1)}
              style={{ flex: 1 }}
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
              style={{
                flex: 1,
                textDecoration: "none",
              }}
            >
              <button type="button" className="btn btn--block">
                {cur.cta} →
              </button>
            </Link>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={next}
              disabled={pending}
              style={{ flex: 1 }}
            >
              {cur.cta}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
