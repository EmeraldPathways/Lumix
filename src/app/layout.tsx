import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://g9-film-lab.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "G9 Film Lab — JPEG recipes for the original Lumix G9", template: "%s · G9 Film Lab" },
  description: "Discover, customise and use film-inspired JPEG recipes made from genuine original Panasonic Lumix DC-G9 settings.",
  applicationName: "G9 Film Lab",
  openGraph: { type: "website", siteName: "G9 Film Lab", title: "G9 Film Lab", description: "Classic film character. Straight from your Lumix G9." },
  twitter: { card: "summary_large_image", title: "G9 Film Lab", description: "Film-inspired JPEG recipes for the original Panasonic Lumix G9." },
};

export const viewport: Viewport = { themeColor: "#f4f0e7", colorScheme: "light dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        <div className="app-main" id="main-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
