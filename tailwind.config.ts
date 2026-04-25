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
      },
      animation: {
        skeleton: "skeleton 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
