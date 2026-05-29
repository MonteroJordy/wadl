import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === Legacy color names — REMAPPED to the new design system
        // values so 168+ existing files repaint without code changes.
        // The names stay so `bg-coral`, `text-cream`, `border-line` etc.
        // continue to compile. New work should use the explicit tokens
        // below (accent, fg, ink, hair, etc.). ===
        bg: "#0a0a0b",                       // was #0a0a0a — now ink
        s1: "#0f0f10",                       // was #111    — now canvas
        s2: "#1c1c1e",                       // was #181818 — now card
        s3: "#232326",                       // was #222    — now raise (hover)
        coral: "oklch(0.94 0.22 110)",       // was #FF4A2B — now highlighter accent
        gold: "oklch(0.86 0.16 85)",         // was #F5C842 — now warn
        mint: "oklch(0.86 0.18 145)",        // was #00D97E — now ok
        lav: "oklch(0.94 0.22 110)",         // was #A78BFA — collapsed into accent
        cream: "#f3f1ec",                    // was #F2EDE4 — now fg
        muted: "#a8a6a0",                    // was 50% cream — now solid fg-muted
        line: "#2a2a2e",                     // was 7% white — now hair (still hairline)

        // === New design system — Claude Design handoff (tokens.css).
        // Visual names mirror the source so cross-referencing stays cheap. ===
        ink: "#0a0a0b",         // deepest surface
        canvas: "#0f0f10",      // base canvas
        card: "#1c1c1e",        // raised card
        raise: "#232326",       // hover state
        hair: "#2a2a2e",        // hairline divider
        hair2: "#38383d",       // stronger divider
        fg: "#f3f1ec",          // off-white text
        "fg-muted": "#a8a6a0",
        "fg-dim": "#6b6a66",
        "fg-faint": "#4a4945",
        accent: "oklch(0.94 0.22 110)",
        "accent-ink": "#0a0a0b",
        "accent-soft": "oklch(0.94 0.22 110 / 0.16)",
        ok: "oklch(0.86 0.18 145)",
        warn: "oklch(0.86 0.16 85)",
        err: "oklch(0.7 0.2 25)",
        ga: "#f3f1ec",
        vip: "oklch(0.7 0.24 260)",
      },
      fontFamily: {
        // Legacy aliases (still in use across 168 files)
        display: ["var(--font-bebas)", "sans-serif"],
        sans: ["var(--font-epilogue)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "ui-monospace", "monospace"],
        // New design system — Inter Tight does display + body, JBM does code/meta
        tight: [
          "var(--font-inter-tight)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "sans-serif",
        ],
        jbm: [
          "var(--font-jb-mono)",
          "SF Mono",
          "IBM Plex Mono",
          "ui-monospace",
          "monospace",
        ],
      },
      borderRadius: {
        // v2: sharp by default. Tokens removed but kept named in case any
        // page references `rounded-w-md` etc — they all collapse to 0.
        "w-xs": "0",
        "w-sm": "0",
        "w-md": "0",
        "w-lg": "0",
      },
      maxWidth: {
        frame: "375px",
      },
      minHeight: {
        frame: "740px",
      },
      keyframes: {
        skeleton: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "press": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.97)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        skeleton: "skeleton 1.6s ease-in-out infinite",
        "toast-in": "toast-in 180ms ease-out",
        "fade-in": "fade-in 180ms ease-out",
        "scale-in": "scale-in 180ms ease-out",
        press: "press 160ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
