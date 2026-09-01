import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Special_Elite, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted at build time, so the typography is identical on every device.
// (Previously the app asked for Courier New, which Android does not ship.)
const specialElite = Special_Elite({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-special-elite",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Case File",
  description: "An AI-powered murder mystery investigation game",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "The Case File",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0c",
  // Shrink the viewport when the on-screen keyboard opens, so bottom sheets
  // resize instead of hiding their submit buttons behind it.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${specialElite.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      {/* No safe-area padding here: combined with a full-height rule it adds
          the insets on top of 100dvh and every page gains phantom scroll.
          Screens apply the .*-pad-* helpers where they actually need it. */}
      <body className="bg-ink-900 antialiased">{children}</body>
    </html>
  );
}
