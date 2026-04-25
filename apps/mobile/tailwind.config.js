/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  presets: [require("nativewind/preset")],
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
    },
  },
  plugins: [],
};
