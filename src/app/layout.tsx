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

export const metadata: Metadata = {
  title: {
    default: "Vantage Football Analytics",
    template: "%s | Vantage",
  },
  description:
    "Opportunity metrics underneath the rankings. Every ranked player links to the chart that justifies his position.",
  icons: { icon: "/brand/vantage-app-icon-512.png" },
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
