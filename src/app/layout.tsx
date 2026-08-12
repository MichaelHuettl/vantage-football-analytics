import type { Metadata } from "next";
import { Anton, Barlow, Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import { Goalpost } from "@/components/Goalpost";
import { SITE_NAV } from "@/lib/nav";
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
    template: "%s — Vantage",
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
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: "var(--surface-inverse)",
        borderColor: "var(--border-inverse)",
      }}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="flex h-16 items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0"
            style={{ color: "var(--text-on-inverse)" }}
          >
            <Goalpost className="h-7 w-7" title="Vantage" />
            <span
              className="text-2xl leading-none tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              VANTAGE
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="ml-auto overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            <ul className="flex items-center gap-1">
              {SITE_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block whitespace-nowrap rounded px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-colors hover:text-white"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      color: "var(--text-on-inverse-muted)",
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer
      className="mt-20 border-t"
      style={{
        background: "var(--surface-inverse)",
        borderColor: "var(--border-inverse)",
      }}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10">
        <div className="flex flex-wrap gap-8 justify-between">
          <div className="max-w-sm">
            <div
              className="flex items-center gap-2.5"
              style={{ color: "var(--text-on-inverse)" }}
            >
              <Goalpost className="h-6 w-6" />
              <span
                className="text-xl leading-none tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                VANTAGE
              </span>
            </div>
            <p
              className="mt-3 text-sm"
              style={{ color: "var(--text-on-inverse-muted)" }}
            >
              Rankings are a conclusion. This site publishes the argument
              underneath them.
            </p>
          </div>

          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-1.5">
              {[...SITE_NAV, { href: "/glossary", label: "Glossary" }].map(
                (item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm hover:underline"
                      style={{ color: "var(--text-on-inverse-muted)" }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
        </div>

        <p
          className="mt-10 text-xs leading-relaxed"
          style={{ color: "var(--color-ink-500)" }}
        >
          Not affiliated with or endorsed by the National Football League. Team
          names and colours are used for identification only. Built on open
          data.
        </p>
      </div>
    </footer>
  );
}
