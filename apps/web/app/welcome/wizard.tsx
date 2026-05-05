"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeWelcomeAction,
  createFirstEventAction,
  skipWelcomeAction,
} from "./actions";
import { useToast } from "@/components/toast";
import {
  accountEntityLabel,
  welcomeStep1Pitch,
} from "@wadl/shared/account-type";
import type { AccountType } from "@wadl/shared/types";

interface InitialState {
  fullName: string;
  accountType: AccountType;
  accountName: string;
  hasVenue: boolean;
}

const STEPS = [1, 2, 3, 4, 5] as const;

export default function WelcomeWizard({ initial }: { initial: InitialState }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<(typeof STEPS)[number]>(1);
  const [pending, startTransition] = useTransition();

  // Step 4 inline event form state.
  const [evName, setEvName] = useState("");
  const today = new Date();
  const defaultDate = new Date(today);
  defaultDate.setDate(defaultDate.getDate() + 7);
  const [evDate, setEvDate] = useState(defaultDate.toISOString().slice(0, 10));
  const [evTime, setEvTime] = useState("23:00");
  const [evCap, setEvCap] = useState("100");
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  function next() {
    setStep((s) => (s < 5 ? ((s + 1) as (typeof STEPS)[number]) : s));
  }
  function back() {
    setStep((s) => (s > 1 ? ((s - 1) as (typeof STEPS)[number]) : s));
  }
  function finish(href: string) {
    startTransition(async () => {
      await completeWelcomeAction();
      router.replace(href);
    });
  }
  function skip() {
    startTransition(async () => {
      await skipWelcomeAction();
    });
  }

  function submitFirstEvent(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createFirstEventAction({
        name: evName,
        night_date: evDate,
        doors_at: evTime,
        capacity_cap: parseInt(evCap, 10) || null,
      });
      if (res.ok) {
        toast.success("Event created.");
        setCreatedEventId(res.eventId);
        next();
      } else toast.error(res.error);
    });
  }

  return (
    <main
      id="main-content"
      className="min-h-screen w-full grid md:grid-cols-2 relative overflow-hidden"
    >
      {/* Left brand panel — aspirational, sets identity. Hidden on small screens. */}
      <div
        className="hidden md:flex relative flex-col justify-between p-12 overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #14060a 0%, #0a0a0a 55%, #1c0703 100%)",
        }}
      >
        <div
          className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, oklch(0.7 0.24 260 / 0.45), transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 -right-32 w-[460px] h-[460px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, oklch(0.86 0.16 85 / 0.18), transparent 70%)",
          }}
        />
        <div className="relative">
          <p className="font-display text-3xl text-coral tracking-wide">
            WADL
          </p>
          <p className="label-mono mt-2">One door · one list · one truth</p>
        </div>
        <div className="relative max-w-md">
          <p className="font-display text-5xl text-cream uppercase leading-[0.95] tracking-wide mb-4">
            Stop losing the door to chaos.
          </p>
          <p className="text-cream/70 text-sm leading-relaxed">
            Replaces the WhatsApp-and-spreadsheet shuffle every busy night
            turns into. Promoters, artists, brands, owner — everyone&apos;s on
            one attributed list. The door scans QRs, the show rate gets graded,
            the next week books itself.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-3 max-w-md text-cream/80">
          <div>
            <p className="font-display text-3xl text-coral leading-none">5m</p>
            <p className="label-mono mt-1 text-cream/60">to first list</p>
          </div>
          <div>
            <p className="font-display text-3xl text-coral leading-none">0</p>
            <p className="label-mono mt-1 text-cream/60">accounts on holders</p>
          </div>
          <div>
            <p className="font-display text-3xl text-coral leading-none">∞</p>
            <p className="label-mono mt-1 text-cream/60">tiers per night</p>
          </div>
        </div>
      </div>

      {/* Right wizard panel */}
      <div className="relative flex flex-col px-6 md:px-10 py-8 md:py-12 max-w-xl w-full md:max-w-none mx-auto">
        <header className="flex items-center justify-between mb-6">
          <p className="label-mono text-coral">
            Welcome · step {step}/5
          </p>
          <button
            type="button"
            onClick={skip}
            disabled={pending}
            className="label-mono hover:text-cream"
          >
            Skip tour →
          </button>
        </header>

        <div className="flex gap-1 mb-8">
          {STEPS.map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? "bg-coral" : "bg-s2"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

      {step === 1 && (() => {
        const pitch = welcomeStep1Pitch(initial.accountType);
        return (
          <section className="flex-1 animate-fade-in">
            <h1 className="display-lg mb-3">
              {pitch.headline.replace(
                /Welcome\.?/i,
                `Welcome, ${initial.fullName.split(" ")[0]}.`
              )}
            </h1>
            <p className="text-cream/80 leading-relaxed mb-6">{pitch.blurb}</p>
            <ul className="text-muted text-sm leading-relaxed space-y-2 mb-8">
              {pitch.steps.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
            <button type="button" onClick={next} className="btn-primary">
              Let&apos;s go →
            </button>
          </section>
        );
      })()}

      {step === 2 && (
        <section className="flex-1 animate-fade-in">
          <h1 className="display-lg mb-3">Your role</h1>
          <p className="text-cream/80 leading-relaxed mb-6">
            You signed up as <span className="text-coral font-semibold">{initial.accountType}</span> ({initial.accountName}).
            You can change this later from <Link href="/owner/profile" className="text-coral underline">Profile</Link>.
          </p>
          <div className="card mb-6">
            <p className="label-mono mb-1">Your account</p>
            <p className="font-sans text-cream font-semibold">
              {initial.accountName}
            </p>
            <p className="label-mono mt-1">{initial.accountType}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={back} className="btn-ghost">
              ← Back
            </button>
            <button type="button" onClick={next} className="btn-primary">
              Next →
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="flex-1 animate-fade-in">
          {initial.accountType === "venue" ? (
            <>
              <h1 className="display-lg mb-3">Your venue</h1>
              {initial.hasVenue ? (
                <>
                  <p className="text-cream/80 leading-relaxed mb-6">
                    Venue already set up — you&apos;re ahead of schedule.
                  </p>
                  <Link
                    href="/owner/profile"
                    className="btn-ghost text-center block mb-3"
                  >
                    Edit venues
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-cream/80 leading-relaxed mb-6">
                    Add your first venue (name, address, capacity, door time).
                    You&apos;ll be back here when it&apos;s saved.
                  </p>
                  <Link
                    href="/venuesetup?return=/welcome"
                    className="btn-primary text-center block mb-3"
                  >
                    Set up venue →
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <h1 className="display-lg mb-3">
                {initial.accountType === "brand"
                  ? "Where you take over"
                  : "Where you play"}
              </h1>
              <p className="text-cream/80 leading-relaxed mb-6">
                {initial.accountType === "brand"
                  ? "Brands run nights inside someone else's room. You don't set up a venue here — you'll pick the partner venue when you create your first event."
                  : "Solo promoters and artists collab with venues. You don't run a room yourself — you'll associate each event with its host venue when you create it."}
              </p>
              <div className="card border-line mb-3">
                <p className="label-mono mb-1">Heads up</p>
                <p className="text-muted text-sm leading-relaxed">
                  Most flows still work even if you skip this. You can always
                  add a partner venue from{" "}
                  <Link href="/owner/profile" className="text-coral underline">
                    profile
                  </Link>{" "}
                  later.
                </p>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={back} className="btn-ghost">
              ← Back
            </button>
            <button type="button" onClick={next} className="btn-primary">
              {initial.accountType === "venue" && initial.hasVenue
                ? "Next →"
                : initial.accountType === "venue"
                ? "Skip for now"
                : "Continue →"}
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="flex-1 animate-fade-in">
          <h1 className="display-lg mb-3">First event</h1>
          <p className="text-cream/80 leading-relaxed mb-6">
            Name it, pick a date, set capacity. We&apos;ll auto-set cutoff to
            2h before doors. You can edit any of this later.
          </p>
          <form onSubmit={submitFirstEvent} className="flex flex-col gap-4">
            <div>
              <label className="label-mono block mb-2" htmlFor="ev-name">
                Event name
              </label>
              <input
                id="ev-name"
                value={evName}
                onChange={(e) => setEvName(e.target.value)}
                placeholder={accountEntityLabel(initial.accountType).eventPlaceholder}
                className="input-dark"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label-mono block mb-2" htmlFor="ev-date">
                  Date
                </label>
                <input
                  id="ev-date"
                  type="date"
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  className="input-dark"
                  required
                />
              </div>
              <div>
                <label className="label-mono block mb-2" htmlFor="ev-time">
                  Doors
                </label>
                <input
                  id="ev-time"
                  type="time"
                  value={evTime}
                  onChange={(e) => setEvTime(e.target.value)}
                  className="input-dark"
                />
              </div>
            </div>
            <div>
              <label className="label-mono block mb-2" htmlFor="ev-cap">
                Capacity
              </label>
              <input
                id="ev-cap"
                type="number"
                min={1}
                value={evCap}
                onChange={(e) =>
                  setEvCap(e.target.value.replace(/[^\d]/g, ""))
                }
                className="input-dark"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={back} className="btn-ghost">
                ← Back
              </button>
              <button
                type="submit"
                disabled={pending}
                className="btn-primary"
              >
                {pending ? "Creating…" : "Create →"}
              </button>
            </div>
          </form>
        </section>
      )}

      {step === 5 && (
        <section className="flex-1 animate-fade-in">
          <h1 className="display-lg mb-3">You&apos;re live.</h1>
          <p className="text-cream/80 leading-relaxed mb-6">
            Now invite a holder OR send the magic link straight to a promoter.
            Their list lives under your event.
          </p>
          <div className="flex flex-col gap-2">
            {createdEventId ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    finish(`/owner/events/${createdEventId}/allocations/new`)
                  }
                  className="btn-primary"
                  disabled={pending}
                >
                  + Invite a holder
                </button>
                <button
                  type="button"
                  onClick={() => finish(`/owner/events/${createdEventId}`)}
                  className="btn-ghost"
                  disabled={pending}
                >
                  View the event
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => finish("/owner")}
                className="btn-primary"
                disabled={pending}
              >
                Go to dashboard →
              </button>
            )}
            <button
              type="button"
              onClick={() => finish("/owner")}
              className="label-mono text-center py-2 hover:text-cream"
              disabled={pending}
            >
              Skip for now
            </button>
          </div>
        </section>
      )}
      </div>
    </main>
  );
}
