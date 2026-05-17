"use client";

import { useState, useTransition } from "react";
import { saveNotifPrefsAction, type NotifPrefs } from "./actions";
import { useToast } from "@/components/toast";
import { KIND_LABEL, type NotificationKind } from "@/lib/notification-kinds";

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

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
}

function Toggle({ label, checked, onChange, hint }: ToggleProps) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        cursor: "pointer",
        padding: "8px 0",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ color: "var(--w-fg)", fontSize: 14 }}>{label}</p>
        {hint && (
          <div className="w-type-meta" style={{ marginTop: 2 }}>
            {hint.toUpperCase()}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          flexShrink: 0,
          position: "relative",
          width: 44,
          height: 24,
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background: checked ? "var(--w-acc)" : "var(--w-surface-3)",
          transition: "background 120ms",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: checked ? "var(--w-acc-ink)" : "var(--w-fg)",
            transform: checked ? "translateX(20px)" : "translateX(0)",
            transition: "transform 120ms",
          }}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section className="w-card" style={{ padding: 16 }}>
        <div className="w-type-meta" style={{ marginBottom: 8 }}>
          CHANNELS
        </div>
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

      <section className="w-card" style={{ padding: 16 }}>
        <div className="w-type-meta" style={{ marginBottom: 8 }}>
          WHICH EVENTS
        </div>
        {KINDS.map((k) => (
          <Toggle
            key={k}
            label={KIND_LABEL[k]}
            checked={!!prefs.kinds[k]}
            onChange={(v) => setKind(k, v)}
          />
        ))}
      </section>

      <section className="w-card" style={{ padding: 16 }}>
        <div className="w-type-meta" style={{ marginBottom: 8 }}>
          QUIET HOURS
        </div>
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 12,
            }}
          >
            <div>
              <label
                htmlFor="qh-start"
                className="w-type-meta"
                style={{ display: "block", marginBottom: 4 }}
              >
                FROM
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
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="qh-end"
                className="w-type-meta"
                style={{ display: "block", marginBottom: 4 }}
              >
                TO
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
                style={INPUT_STYLE}
              />
            </div>
          </div>
        )}
      </section>

      <button
        type="button"
        className="btn"
        onClick={save}
        disabled={pending}
      >
        {pending ? "Saving…" : "Save preferences"}
      </button>
    </div>
  );
}
