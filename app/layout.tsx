import type { Metadata } from "next";
import { Bebas_Neue, Epilogue, DM_Mono } from "next/font/google";
import "./globals.css";
import CookieConsent from "@/components/cookie-consent";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const epilogue = Epilogue({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-epilogue",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://wadl-pearl.vercel.app"
  ),
  title: { default: "WADL", template: "%s — WADL" },
  description: "Guest-list management for nightlife.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${epilogue.variable} ${dmMono.variable}`}
    >
      <body className="bg-bg text-cream min-h-screen">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
