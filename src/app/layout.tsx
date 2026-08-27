import type { Metadata } from "next";
import { Anton, Barlow, Barlow_Condensed } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const barlow = Barlow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
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
      className={`${anton.variable} ${barlowCondensed.variable} ${barlow.variable}`}
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
