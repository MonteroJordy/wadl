"use client";

import { useState, useTransition } from "react";
import { saveNotifPrefsAction, type NotifPrefs } from "./actions";
import { useToast } from "@/components/toast";
import { KIND_LABEL, type NotificationKind } from "@/lib/notifications";

const KINDS: NotificationKind[] = [
  "rsvp_pending",
  "capacity_alert",
  "staff_assigned",
  "billing_event",
  "co_owner_accepted",
  "scan_failure_high",
  "waitlist_promoted",
  "referral_arrived",
  "guest_flagged",
  "tier_upgraded",
  "broadcast_sent",
];

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
}

function Toggle({ label, checked, onChange, hint }: ToggleProps) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer py-2">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-cream text-sm">{label}</p>
        {hint && <p className="label-mono mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`shrink-0 relative w-11 h-6 rounded-full transition ${
          checked ? "bg-coral" : "bg-s3"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-cream transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}

export default function NotifPrefsForm({ initial }: { initial: NotifPrefs }) {
  const toast = useToast();
  const [prefs, setPrefs] = useState<NotifPrefs>(initial);
  const [pending, startTransition] = useTransition();

  function setChannel(c: keyof NotifPrefs["channels"], v: boolean) {
    setPrefs((p) => ({ ...p, channels: { ...p.channels, [c]: v } }));
  }
  function setKind(k: NotificationKind, v: boolean) {
    setPrefs((p) => ({ ...p, kinds: { ...p.kinds, [k]: v } }));
  }
  function save() {
    startTransition(async () => {
      const res = await saveNotifPrefsAction(prefs);
      if (res.ok) toast.success("Saved.");
      else toast.error(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="card">
        <p className="label-mono mb-2">Channels</p>
        <Toggle
          label="Push notifications"
          hint="Browser + iOS app, when enabled per-device."
          checked={prefs.channels.push}
          onChange={(v) => setChannel("push", v)}
        />
        <Toggle
          label="Email"
          hint="Critical updates only."
          checked={prefs.channels.email}
          onChange={(v) => setChannel("email", v)}
        />
        <Toggle
          label="SMS"
          hint="One per ~24h max. Opt-in only."
          checked={prefs.channels.sms}
          onChange={(v) => setChannel("sms", v)}
        />
      </section>

      <section className="card">
        <p className="label-mono mb-2">Which events</p>
        {KINDS.map((k) => (
          <Toggle
            key={k}
            label={KIND_LABEL[k]}
            checked={!!prefs.kinds[k]}
            onChange={(v) => setKind(k, v)}
          />
        ))}
      </section>

      <section className="card">
        <p className="label-mono mb-2">Quiet hours</p>
        <Toggle
          label="Mute notifications during set hours"
          hint="Inbox still updates; push + SMS pause."
          checked={prefs.quiet_hours.enabled}
          onChange={(v) =>
            setPrefs((p) => ({
              ...p,
              quiet_hours: { ...p.quiet_hours, enabled: v },
            }))
          }
        />
        {prefs.quiet_hours.enabled && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <label className="label-mono block mb-1" htmlFor="qh-start">
                From
              </label>
              <input
                id="qh-start"
                type="time"
                value={prefs.quiet_hours.start}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    quiet_hours: { ...p.quiet_hours, start: e.target.value },
                  }))
                }
                className="input-dark"
              />
            </div>
            <div>
              <label className="label-mono block mb-1" htmlFor="qh-end">
                To
              </label>
              <input
                id="qh-end"
                type="time"
                value={prefs.quiet_hours.end}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    quiet_hours: { ...p.quiet_hours, end: e.target.value },
                  }))
                }
                className="input-dark"
              />
            </div>
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="btn-primary"
      >
        {pending ? "Saving…" : "Save preferences"}
      </button>
    </div>
  );
}
