import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import CookieConsent from "@/components/cookie-consent";
import DemoModeBanner from "@/components/demo-mode-banner";
import NavProgress from "@/components/nav-progress";
import { ToastProvider } from "@/components/toast";
import { Suspense } from "react";

// New design system fonts — Inter Tight does display + body, JetBrains
// Mono does codes/timestamps/metadata. The legacy --font-bebas /
// --font-epilogue / --font-dm-mono CSS vars are aliased to these in
// globals.css so existing utility classes (font-display, font-sans,
// font-mono) keep working without touching 168 component files.
const interTight = Inter_Tight({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-jb-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://wadl-pearl.vercel.app"
  ),
  title: { default: "WADL", template: "%s — WADL" },
  description: "Guest-list management for nightlife.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "WADL",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${jbMono.variable}`}
    >
      <body
        style={{
          background: "var(--w-bg)",
          color: "var(--w-fg)",
          minHeight: "100vh",
        }}
      >
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ToastProvider>
          <Suspense fallback={null}>
            <NavProgress />
          </Suspense>
          <DemoModeBanner />
          {children}
          <CookieConsent />
        </ToastProvider>
      </body>
    </html>
  );
}
