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
        bg: "#0a0a0a",
        s1: "#111111",
        s2: "#181818",
        s3: "#222222",
        coral: "#FF4A2B",
        gold: "#F5C842",
        mint: "#00D97E",
        lav: "#A78BFA",
        cream: "#F2EDE4",
        muted: "rgba(242,237,228,0.50)",
        line: "rgba(255,255,255,0.07)",
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        sans: ["var(--font-epilogue)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "ui-monospace", "monospace"],
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
