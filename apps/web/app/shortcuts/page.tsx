import Link from "next/link";
import MarketingFooter from "@/components/marketing-footer";
import { Logo } from "@/components/v5";

export const metadata = {
  title: "Keyboard shortcuts — WADL",
  description: "Power-user paths across every page in WADL.",
};

type ShortcutGroup = {
  group: string;
  items: Array<[string, string]>;
};

const GROUPS: ShortcutGroup[] = [
  {
    group: "Global",
    items: [
      ["⌘ K", "Open command palette"],
      ["⌘ ↑", "Switch workspace"],
      ["G then H", "Go to home"],
      ["G then E", "Go to events"],
      ["G then L", "Go to lists"],
      ["G then A", "Go to analytics"],
      ["G then D", "Go to door"],
    ],
  },
  {
    group: "Events",
    items: [
      ["N", "New event"],
      ["E", "Edit selected"],
      ["⌘ S", "Save changes"],
      ["Esc", "Close modal / cancel"],
      ["⌘ Enter", "Publish event"],
    ],
  },
  {
    group: "Tables",
    items: [
      ["↑ ↓", "Navigate rows"],
      ["Space", "Select row"],
      ["Shift Space", "Range select"],
      ["/", "Focus search"],
      ["F", "Open filters"],
    ],
  },
  {
    group: "Door (scanner)",
    items: [
      ["Space", "Manual lookup"],
      ["Enter", "Confirm check-in"],
      ["Esc", "Reset scanner"],
      ["M", "Mute / unmute feedback"],
      ["?", "Show shortcuts"],
    ],
  },
];

export default function ShortcutsPage() {
  return (
    <>
      <header
        style={{
          padding: "var(--s-4) var(--s-6)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Link href="/" aria-label="WADL home" style={{ textDecoration: "none" }}>
          <Logo size={20} />
        </Link>
      </header>

      <main
        id="main-content"
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          padding: "var(--s-12)",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div className="t-meta">Keyboard shortcuts</div>
        <h1
          className="t-display-lg"
          style={{ marginTop: "var(--s-2)" }}
        >
          Work faster
        </h1>
        <p
          className="t-body-2"
          style={{
            marginTop: "var(--s-2)",
            maxWidth: 720,
            color: "var(--fg-2)",
          }}
        >
          Power-user paths across every page. Press <kbd className="kbd">?</kbd>{" "}
          on any screen to bring this up in-context.
        </p>

        <div
          style={{
            marginTop: "var(--s-8)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--s-4)",
          }}
        >
          {GROUPS.map((g) => (
            <div key={g.group} className="card" style={{ padding: "var(--s-5)" }}>
              <div className="t-meta">{g.group}</div>
              <div
                style={{
                  marginTop: "var(--s-3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-2)",
                }}
              >
                {g.items.map(([k, l]) => (
                  <div
                    key={`${g.group}-${k}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "var(--s-3)",
                    }}
                  >
                    <span className="t-body-2">{l}</span>
                    <span className="kbd" style={{ flexShrink: 0 }}>
                      {k}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p
          className="t-meta"
          style={{ marginTop: "var(--s-10)", color: "var(--fg-3)" }}
        >
          Most shortcuts are live today; a few (workspace switcher,{" "}
          <kbd className="kbd">G</kbd>-prefix navigation) ship with the command
          palette.
        </p>
      </main>
      <MarketingFooter />
    </>
  );
}
