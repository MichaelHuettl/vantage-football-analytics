import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";

/**
 * One family for the whole site.
 *
 * Anton, Barlow Condensed and Barlow were three faces doing three jobs. The
 * operator's call on 2026-08-27 was to collapse to a single typeface, so the
 * three roles are now one family separated by weight and width rather than by
 * name. Bricolage Grotesque is the choice for three reasons: it has a real
 * `wdth` axis (75-100) so the condensed table furniture survives, it reaches
 * weight 800 so heroes keep the heft Anton gave them, and it carries an `opsz`
 * axis (12-96) that browsers apply automatically from font-size. That last one
 * matters more than it sounds — the face is deliberately irregular, and optical
 * sizing concentrates that character at display sizes while opening the
 * letterforms up at 16px, which is where the site's long arguments live.
 *
 * A family without a width axis would have lost the condensed character the
 * whole broadcast look rests on. Archivo was tried first and rejected as too
 * blocky; its evenness is what a signage grotesque is for.
 *
 * The variable font ships one file for every weight and width, so this is also
 * one request instead of the nine that three families at four weights cost.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-bricolage",
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
    "Opportunity metrics underneath the rankings. Every ranked player links to the chart that justifies his position.",
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
      className={bricolage.variable}
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
      </body>
    </html>
  );
}
