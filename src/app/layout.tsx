import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";
import { AUTHOR } from "@/lib/site";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * One family for the whole site.
 *
 * Anton, Barlow Condensed and Barlow were three faces doing three jobs. The
 * operator's call on 2026-08-27 was to collapse to a single typeface, so the
 * three roles are now one family separated by weight and width rather than by
 * name. Roboto is the choice, on a brief of clean, appealing and legible with
 * data rather than distinctive: it has a real `wdth` axis (75-100) so the
 * condensed table furniture survives, it reaches weight 900 for the heroes, and
 * its figures are unusually easy to tell apart at the 14px the tables use,
 * which is what the site is mostly made of.
 *
 * **This is `Roboto`, the sans, not `Roboto_Serif`.** next/font exposes six
 * families beginning with that word — Roboto, Roboto Condensed, Roboto Flex,
 * Roboto Mono, Roboto Serif and Roboto Slab — and only this one has the
 * wdth 75-100 / wght 100-900 pair the tokens below rely on.
 *
 * Two faces were tried and rejected first. Archivo was too blocky, which is
 * what an even signage grotesque is for. Bricolage Grotesque was picked for
 * character and dropped once the brief turned out to be clarity: its
 * deliberate irregularity is an asset in a hero and noise in a 182-row table.
 *
 * The variable font ships one file for every weight and width, so this is also
 * one request instead of the nine that three families at four weights cost.
 */
const roboto = Roboto({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-roboto",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  // Required for the share cards: og:image has to be an absolute URL, and
  // without a base Next emits a relative one that no crawler can fetch. Set
  // NEXT_PUBLIC_SITE_URL at deploy time; localhost is only a dev default.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Vantage Football Analytics",
    template: "%s | Vantage",
  },
  description:
    "What actually wins: the opportunity, efficiency and situation underneath the result, measured across every season there is data for.",
  // Read by search engines and link previews, so the site is attributed to its
  // author wherever it is shared, not only on its own pages.
  authors: [{ name: AUTHOR }],
  creator: AUTHOR,
  publisher: AUTHOR,
  openGraph: {
    type: "website",
    siteName: "Vantage Football Analytics",
    locale: "en_US",
  },
  // The card image itself comes from the opengraph-image files per route; X
  // falls back to og:image when twitter:image is absent, so the card *type* is
  // the part that has to be declared here.
  twitter: { card: "summary_large_image" },
  // SVG first so the tab gets the vector; the PNGs are the fallback for
  // anything that will not take one, and the 180 is what iOS puts on a home
  // screen. All three are the same artwork — the PNGs are rendered from
  // vantage-icon.svg, so changing the icon means changing that one file and
  // re-rendering.
  icons: {
    icon: [
      { url: "/brand/vantage-icon.svg", type: "image/svg+xml" },
      { url: "/brand/vantage-app-icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/brand/vantage-app-icon-180.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={roboto.variable}
    >
      <body className="min-h-screen flex flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {/* The header overlays the hero rather than sitting above it, so every
            page opens on the photograph edge to edge. */}
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <SpeedInsights />
      </body>
    </html>
  );
}
